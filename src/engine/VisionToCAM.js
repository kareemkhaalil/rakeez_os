/**
 * RAKEEZ OS V3 — VisionToCAM Kernel
 * Pure-JS Computer-Vision → G-code Pipeline.
 *
 * Pipeline:
 *   1. Image → Grayscale → Sobel Edge Detection → Binary Threshold
 *   2. Marching Squares contour tracing
 *   3. Douglas-Peucker polyline simplification
 *   4. Physical scaling (px → mm)
 *   5. Polygon offset (Tool Radius Compensation)
 *   6. Multi-pass G-code serialisation
 */

export const VisionToCAM = {
  // ────────────────────────────────────────────────────
  //  PUBLIC ENTRY-POINT
  // ────────────────────────────────────────────────────
  /**
   * @param {HTMLImageElement|ImageBitmap} image
   * @param {Object} opts
   *   targetWidth   (mm)
   *   targetHeight  (mm)
   *   depth         (mm, positive value — will be negated for Z)
   *   toolDiameter  (mm)
   *   threshold     0-255
   *   simplify      Douglas-Peucker epsilon (px-space, 1-10 useful range)
   *   operation     'PROFILE' | 'POCKET'
   * @returns {{ gcode: string, path: Array, contours: Array }}
   */
  process(image, opts) {
    const {
      targetWidth  = 100,
      targetHeight = 100,
      depth        = 5,
      toolDiameter = 6,
      threshold    = 120,
      simplify     = 2.0,
      operation    = 'PROFILE',
    } = opts;

    // Step 1 — Rasterize image
    const { width, height, grayData } = this._rasterize(image);

    // Step 2 — Sobel edge detection
    const edgeData = this._sobelEdge(grayData, width, height, threshold);

    // Step 3 — Marching Squares contour trace
    const rawContours = this._marchingSquares(edgeData, width, height);

    // Step 4 — Simplify with Douglas-Peucker
    const smoothContours = rawContours
      .map(c => this._douglasPeucker(c, simplify))
      .filter(c => c.length >= 4);

    // Step 5 — Scale from pixel to mm
    const scaleX = targetWidth  / width;
    const scaleY = targetHeight / height;
    const scaledContours = smoothContours.map(contour =>
      contour.map(p => ({ x: p.x * scaleX, y: p.y * scaleY }))
    );

    // Step 6 — Tool Radius Compensation (polygon offset)
    const toolRadius = toolDiameter / 2;
    const direction = operation === 'POCKET' ? -1 : 1; // inward vs outward
    const offsetContours = scaledContours.map(contour =>
      this._offsetPolygon(contour, toolRadius * direction)
    ).filter(c => c.length >= 3);

    // Step 7 — Generate G-code
    const { gcode, path } = this._generateGCode(offsetContours, depth, toolDiameter);

    return { gcode, path, contours: scaledContours };
  },

  // ────────────────────────────────────────────────────
  //  STEP 1 — Rasterize to grayscale
  // ────────────────────────────────────────────────────
  _rasterize(image) {
    const canvas = document.createElement('canvas');
    const maxDim = 512; // cap for performance
    let w = image.width  || image.naturalWidth;
    let h = image.height || image.naturalHeight;
    if (w > maxDim || h > maxDim) {
      const s = maxDim / Math.max(w, h);
      w = Math.round(w * s);
      h = Math.round(h * s);
    }
    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const gray = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const off = i * 4;
      gray[i] = Math.round(
        imgData.data[off] * 0.299 +
        imgData.data[off + 1] * 0.587 +
        imgData.data[off + 2] * 0.114
      );
    }
    return { width: w, height: h, grayData: gray };
  },

  // ────────────────────────────────────────────────────
  //  STEP 2 — Sobel Edge Detection
  // ────────────────────────────────────────────────────
  _sobelEdge(gray, w, h, threshold) {
    const out = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (i, j) => gray[j * w + i];
        const gx =
          -idx(x-1,y-1) + idx(x+1,y-1) +
          -2*idx(x-1,y) + 2*idx(x+1,y) +
          -idx(x-1,y+1) + idx(x+1,y+1);
        const gy =
          -idx(x-1,y-1) - 2*idx(x,y-1) - idx(x+1,y-1) +
           idx(x-1,y+1) + 2*idx(x,y+1) + idx(x+1,y+1);
        const mag = Math.sqrt(gx * gx + gy * gy);
        out[y * w + x] = mag > threshold ? 1 : 0;
      }
    }
    return out;
  },

  // ────────────────────────────────────────────────────
  //  STEP 3 — Marching Squares contour tracing
  // ────────────────────────────────────────────────────
  _marchingSquares(edge, w, h) {
    const visited = new Uint8Array(w * h);
    const contours = [];
    const dirs = [
      { dx: 1, dy: 0 }, { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }, { dx: 0, dy: -1 },
      { dx: 1, dy: 1 }, { dx: -1, dy: 1 },
      { dx: 1, dy: -1 }, { dx: -1, dy: -1 },
    ];

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (edge[idx] !== 1 || visited[idx]) continue;

        const contour = [];
        let cx = x, cy = y;
        let steps = 0;
        const maxSteps = w * h;

        while (steps < maxSteps) {
          const ci = cy * w + cx;
          if (visited[ci]) break;
          visited[ci] = 1;
          contour.push({ x: cx, y: cy });
          steps++;

          let found = false;
          for (const d of dirs) {
            const nx = cx + d.dx;
            const ny = cy + d.dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const ni = ny * w + nx;
            if (edge[ni] === 1 && !visited[ni]) {
              cx = nx;
              cy = ny;
              found = true;
              break;
            }
          }
          if (!found) break;
        }

        if (contour.length >= 10) {
          contours.push(contour);
        }
      }
    }
    return contours;
  },

  // ────────────────────────────────────────────────────
  //  STEP 4 — Douglas-Peucker Simplification
  // ────────────────────────────────────────────────────
  _douglasPeucker(points, epsilon) {
    if (points.length <= 2) return points;

    let maxDist = 0;
    let maxIdx  = 0;
    const first = points[0];
    const last  = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const d = this._perpDist(points[i], first, last);
      if (d > maxDist) { maxDist = d; maxIdx = i; }
    }

    if (maxDist > epsilon) {
      const left  = this._douglasPeucker(points.slice(0, maxIdx + 1), epsilon);
      const right = this._douglasPeucker(points.slice(maxIdx), epsilon);
      return left.slice(0, -1).concat(right);
    }
    return [first, last];
  },

  _perpDist(p, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
    return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
  },

  // ────────────────────────────────────────────────────
  //  STEP 5 — Pure-JS Polygon Offset (TRC)
  //  Positive offset = outward, Negative = inward
  // ────────────────────────────────────────────────────
  _offsetPolygon(poly, distance) {
    if (poly.length < 3) return poly;
    const result = [];
    const n = poly.length;

    for (let i = 0; i < n; i++) {
      const prev = poly[(i - 1 + n) % n];
      const curr = poly[i];
      const next = poly[(i + 1) % n];

      // Edge normals
      const n1 = this._edgeNormal(prev, curr);
      const n2 = this._edgeNormal(curr, next);

      // Average normal (bisector)
      let nx = n1.nx + n2.nx;
      let ny = n1.ny + n2.ny;
      const len = Math.sqrt(nx * nx + ny * ny) || 1;
      nx /= len;
      ny /= len;

      // Scale by 1/cos(half-angle) to keep correct offset at corners
      const dot = n1.nx * n2.nx + n1.ny * n2.ny;
      const cosHalf = Math.sqrt((1 + dot) / 2) || 0.5;
      const scale = distance / cosHalf;

      result.push({
        x: curr.x + nx * scale,
        y: curr.y + ny * scale,
      });
    }
    return result;
  },

  _edgeNormal(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return { nx: -dy / len, ny: dx / len };
  },

  // ────────────────────────────────────────────────────
  //  STEP 6 — G-Code Generation (Multi-pass)
  // ────────────────────────────────────────────────────
  _generateGCode(contours, totalDepth, toolDiameter) {
    const lines = [
      '; RAKEEZ OS V3 - VISION_TO_CAM v1.0',
      '; Generated from Image Contour Extraction',
      'G21 ; UNITS: MM',
      'G90 ; COORD: ABSOLUTE',
      'M3 S18000 ; SPINDLE START',
      'G0 Z50 ; SAFE HEIGHT',
    ];

    const path = [];
    const passDepth = 2.0;

    for (const contour of contours) {
      if (contour.length < 2) continue;

      for (let z = 0; z >= -totalDepth; z -= passDepth) {
        const currentZ = Math.max(z, -totalDepth);

        // Rapid to start of contour
        const start = contour[0];
        lines.push(`G0 X${start.x.toFixed(3)} Y${start.y.toFixed(3)} Z50`);
        path.push({ x: start.x, y: start.y, z: 50, _feed: 'RAPID' });

        // Plunge
        lines.push(`G1 Z${currentZ.toFixed(3)} F400`);
        path.push({ x: start.x, y: start.y, z: currentZ, _feed: 'CUT' });

        // Cut contour
        for (let i = 1; i < contour.length; i++) {
          const p = contour[i];
          lines.push(`G1 X${p.x.toFixed(3)} Y${p.y.toFixed(3)} F1500`);
          path.push({ x: p.x, y: p.y, z: currentZ, _feed: 'CUT' });
        }

        // Close loop
        lines.push(`G1 X${start.x.toFixed(3)} Y${start.y.toFixed(3)} F1500`);
        path.push({ x: start.x, y: start.y, z: currentZ, _feed: 'CUT' });

        // Retract
        lines.push('G0 Z50');
        path.push({ x: start.x, y: start.y, z: 50, _feed: 'RAPID' });
      }
    }

    lines.push('G0 Z50 ; FINAL RETRACT', 'M5', 'M30');

    return { gcode: lines.join('\n'), path };
  },

  // ────────────────────────────────────────────────────
  //  UTILITY — Render contours on an overlay canvas
  // ────────────────────────────────────────────────────
  renderOverlay(canvas, image, contours, targetWidth, targetHeight) {
    const ctx = canvas.getContext('2d');
    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    // Re-draw image scaled to canvas
    ctx.drawImage(image, 0, 0, cw, ch);

    // Draw contours
    const scaleX = cw / targetWidth;
    const scaleY = ch / targetHeight;

    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#2563EB';
    ctx.shadowBlur = 6;

    for (const contour of contours) {
      if (contour.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(contour[0].x * scaleX, contour[0].y * scaleY);
      for (let i = 1; i < contour.length; i++) {
        ctx.lineTo(contour[i].x * scaleX, contour[i].y * scaleY);
      }
      ctx.closePath();
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
  },
};
