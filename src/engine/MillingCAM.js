/**
 * RAKEEZ OS V3 — Production-Grade MillingCAM Engine
 * Full Parametric Canned-Cycle Library + Involute Gear Profile.
 *
 * Supported Operations:
 *   POCKET + CIRCLE    → Archimedean Spiral Pocket
 *   POCKET + RECTANGLE → Concentric Rectangular Pocket (corner-radiused)
 *   FACE / SURFACE     → Zig-Zag Meander Facing
 *   BORE + CIRCLE      → Helical Interpolation Boring
 *   PROFILE + SPUR_GEAR→ High-Resolution Involute Gear Profile
 *   default            → Circle / Polygon profile cut
 */
export const MillingCAM = {
  generate(intent) {
    const {
      operation    = 'PROFILE',
      shape        = 'CIRCLE',
      dimensions   = {},
      depth        = 5,
      tool_diameter = 6,
      parameters   = {},
    } = intent;

    const toolRadius = tool_diameter / 2;
    const paths = [];
    const headerLines = [
      '; RAKEEZ OS V3 - PRODUCTION_CAM_KERNEL v5.0',
      `; OP: ${operation}  SHAPE: ${shape}`,
      'G21 ; UNITS: MM',
      'G90 ; COORD: ABSOLUTE',
      'M3 S18000 ; SPINDLE START',
      'G0 Z50 ; INITIAL SAFE HEIGHT',
    ];

    const push = (x, y, z, feed = 'CUT') =>
      paths.push({ x, y, z, _feed: feed });

    // ──────────────────────────────────────────────────
    //  ROUTING
    // ──────────────────────────────────────────────────
    const op = operation.toUpperCase();
    const sh = shape.toUpperCase();

    if (op === 'POCKET' && sh === 'CIRCLE') {
      this._spiralPocket(push, dimensions, depth, toolRadius);
    } else if (op === 'POCKET' && sh === 'RECTANGLE') {
      this._rectPocket(push, dimensions, depth, toolRadius, tool_diameter);
    } else if (op === 'FACE' || op === 'SURFACE') {
      this._zigZagFace(push, dimensions, depth, toolRadius);
    } else if (op === 'BORE' && sh === 'CIRCLE') {
      this._helicalBore(push, dimensions, depth, toolRadius);
    } else if (sh === 'SPUR_GEAR') {
      this._spurGear(push, dimensions, depth, toolRadius, parameters);
    } else {
      this._genericProfile(push, dimensions, depth, toolRadius, sh, parameters);
    }

    return { header: headerLines.join('\n'), path: paths };
  },

  // ══════════════════════════════════════════════════════
  //  1. ARCHIMEDEAN SPIRAL POCKET  (POCKET + CIRCLE)
  // ══════════════════════════════════════════════════════
  _spiralPocket(push, dims, depth, toolRadius) {
    const radius   = dims.radius || dims.diameter / 2 || 50;
    const stepover = toolRadius * 0.8; // 40% of tool diameter
    const passDepth = 2;

    for (let z = -passDepth; z >= -depth; z -= passDepth) {
      const currentZ = Math.max(z, -depth);

      // Rapid to center, plunge
      push(0, 0, 50, 'RAPID');
      push(0, 0, currentZ, 'CUT');

      // Spiral outward: r = stepover * (theta / 2π)
      const maxTheta = (radius / stepover) * 2 * Math.PI;
      const dTheta   = 0.1; // ~6 degrees per step for smooth spiral

      for (let theta = 0; theta <= maxTheta; theta += dTheta) {
        const r = stepover * (theta / (2 * Math.PI));
        if (r > radius) break;
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
        push(x, y, currentZ);
      }

      // Final cleanup circle at full radius
      for (let a = 0; a <= 2 * Math.PI + 0.01; a += 0.1) {
        push(radius * Math.cos(a), radius * Math.sin(a), currentZ);
      }

      push(0, 0, 50, 'RAPID');
    }
  },

  // ══════════════════════════════════════════════════════
  //  2. ZIG-ZAG FACING  (FACE / SURFACE)
  // ══════════════════════════════════════════════════════
  _zigZagFace(push, dims, depth, toolRadius) {
    const w = dims.w || dims.width  || 100;
    const h = dims.h || dims.height || 100;
    const stepover = toolRadius * 0.8;
    const passDepth = 2;

    const halfW = w / 2;
    const halfH = h / 2;

    for (let z = -passDepth; z >= -depth; z -= passDepth) {
      const currentZ = Math.max(z, -depth);
      push(-halfW, -halfH, 50, 'RAPID');

      let y = -halfH + toolRadius;
      let direction = 1;

      while (y <= halfH - toolRadius) {
        if (direction === 1) {
          push(-halfW + toolRadius, y, currentZ);
          push( halfW - toolRadius, y, currentZ);
        } else {
          push( halfW - toolRadius, y, currentZ);
          push(-halfW + toolRadius, y, currentZ);
        }

        // Smooth arc transition to next row
        const nextY = y + stepover;
        if (nextY <= halfH - toolRadius) {
          const arcCenterX = direction === 1
            ? halfW - toolRadius
            : -halfW + toolRadius;
          // Simple smooth step-down via 2 lerp points
          push(arcCenterX, y + stepover * 0.5, currentZ);
          push(arcCenterX, nextY, currentZ);
        }

        y += stepover;
        direction *= -1;
      }

      push(0, 0, 50, 'RAPID');
    }
  },

  // ══════════════════════════════════════════════════════
  //  3. HELICAL INTERPOLATION BORING  (BORE + CIRCLE)
  // ══════════════════════════════════════════════════════
  _helicalBore(push, dims, depth, toolRadius) {
    const holeRadius = dims.radius || dims.diameter / 2 || 20;
    const cutRadius  = holeRadius - toolRadius; // tool center follows this
    const helixPitch = 1.0; // mm per revolution
    const dTheta     = 0.1;

    if (cutRadius <= 0) {
      // Hole smaller than tool — straight plunge
      push(0, 0, 50, 'RAPID');
      push(0, 0, -depth);
      push(0, 0, 50, 'RAPID');
      return;
    }

    // Rapid to entry point
    push(cutRadius, 0, 50, 'RAPID');
    push(cutRadius, 0, 0, 'CUT');

    // Helical descent
    let theta = 0;
    let z = 0;
    while (z > -depth) {
      theta += dTheta;
      z -= (helixPitch * dTheta) / (2 * Math.PI);
      if (z < -depth) z = -depth;

      const x = cutRadius * Math.cos(theta);
      const y = cutRadius * Math.sin(theta);
      push(x, y, z);
    }

    // Final flat cleanup circle at bottom
    for (let a = 0; a <= 2 * Math.PI + 0.01; a += 0.1) {
      push(cutRadius * Math.cos(a), cutRadius * Math.sin(a), -depth);
    }

    push(0, 0, 50, 'RAPID');
  },

  // ══════════════════════════════════════════════════════
  //  4. RECTANGULAR POCKETING  (POCKET + RECTANGLE)
  //  Concentric offsets from center outward, auto-radiused
  // ══════════════════════════════════════════════════════
  _rectPocket(push, dims, depth, toolRadius, toolDiameter) {
    const W = dims.w || dims.width  || 100;
    const H = dims.h || dims.height || 100;
    const stepover = toolRadius * 0.8;
    const passDepth = 2;
    const cornerR  = toolRadius; // round corners exactly to tool radius

    for (let z = -passDepth; z >= -depth; z -= passDepth) {
      const currentZ = Math.max(z, -depth);
      push(0, 0, 50, 'RAPID');
      push(0, 0, currentZ, 'CUT');

      // Expand from center
      for (let offset = stepover; ; offset += stepover) {
        const halfW = Math.min(offset, W / 2 - toolRadius);
        const halfH = Math.min(offset, H / 2 - toolRadius);
        if (halfW <= 0 || halfH <= 0) break;

        const cr = Math.min(cornerR, halfW, halfH);

        // Trace rectangle with radiused corners
        // Start: bottom-left + cornerR
        push(-halfW + cr, -halfH,      currentZ);
        push( halfW - cr, -halfH,      currentZ); // Bottom edge
        this._cornerArc(push,  halfW - cr, -halfH + cr, cr, -Math.PI/2, 0, currentZ); // BR
        push( halfW,       halfH - cr,  currentZ); // Right edge
        this._cornerArc(push,  halfW - cr,  halfH - cr, cr, 0, Math.PI/2, currentZ); // TR
        push(-halfW + cr,  halfH,       currentZ); // Top edge
        this._cornerArc(push, -halfW + cr,  halfH - cr, cr, Math.PI/2, Math.PI, currentZ); // TL
        push(-halfW,      -halfH + cr,  currentZ); // Left edge
        this._cornerArc(push, -halfW + cr, -halfH + cr, cr, Math.PI, 3*Math.PI/2, currentZ); // BL

        if (halfW >= W / 2 - toolRadius && halfH >= H / 2 - toolRadius) break;
      }

      push(0, 0, 50, 'RAPID');
    }
  },

  /** Utility: Emit arc points for a rounded corner */
  _cornerArc(push, cx, cy, r, startAngle, endAngle, z) {
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      const a = startAngle + (endAngle - startAngle) * (i / steps);
      push(cx + r * Math.cos(a), cy + r * Math.sin(a), z);
    }
  },

  // ══════════════════════════════════════════════════════
  //  5. INVOLUTE SPUR GEAR PROFILE
  // ══════════════════════════════════════════════════════
  _spurGear(push, dims, depth, toolRadius, params) {
    const teeth     = params?.teeth || 12;
    const diameter  = dims.diameter || 150;
    const pressureAngleRad = (20 * Math.PI) / 180;

    const module      = diameter / (teeth + 2);
    const pitchRadius = (module * teeth) / 2;
    const baseRadius  = pitchRadius * Math.cos(pressureAngleRad);
    const outerRadius = pitchRadius + module;
    const rootRadius  = pitchRadius - 1.25 * module;
    const toothAngle  = (2 * Math.PI) / teeth;

    const project = (r, a) => ({
      x: (r + toolRadius) * Math.cos(a),
      y: (r + toolRadius) * Math.sin(a),
    });

    const passDepth = 2;
    for (let z = 0; z >= -depth; z -= passDepth) {
      push(0, 0, 50, 'RAPID');

      for (let t = 0; t < teeth; t++) {
        const base = t * toothAngle;
        const phiMax = Math.sqrt(Math.max(0, (outerRadius / baseRadius) ** 2 - 1));
        const microSteps = 80;

        // Rising flank
        for (let i = 0; i <= microSteps; i++) {
          const phi   = phiMax * (i / microSteps);
          const r     = Math.sqrt(baseRadius ** 2 * (1 + phi ** 2));
          const theta = phi - Math.atan(phi);
          const p     = project(r, base + theta);
          push(p.x, p.y, z);
        }

        // Top land
        const thetaMax = phiMax - Math.atan(phiMax);
        const topThickness = Math.PI / (2 * teeth) - 2 * thetaMax;
        for (let i = 1; i <= 15; i++) {
          const a = base + thetaMax + (topThickness * i) / 15;
          const p = project(outerRadius, a);
          push(p.x, p.y, z);
        }

        // Falling flank
        const mirror = Math.PI / teeth;
        for (let i = 0; i <= microSteps; i++) {
          const phi   = phiMax * ((microSteps - i) / microSteps);
          const r     = Math.sqrt(baseRadius ** 2 * (1 + phi ** 2));
          const theta = phi - Math.atan(phi);
          const p     = project(r, base + mirror - theta);
          push(p.x, p.y, z);
        }

        // Root
        const rootArc = Math.PI / teeth;
        const pR = project(rootRadius, base + mirror + rootArc / 2);
        push(pR.x, pR.y, z);
      }
    }
  },

  // ══════════════════════════════════════════════════════
  //  6. GENERIC PROFILE  (Circle / Polygon fallback)
  // ══════════════════════════════════════════════════════
  _genericProfile(push, dims, depth, toolRadius, shape, params) {
    const r = dims.radius || 50;
    const sides = shape === 'POLYGON' ? (params?.sides || 6) : 72;

    for (let z = 0; z >= -depth; z -= 2) {
      push(0, 0, 50, 'RAPID');
      for (let i = 0; i <= sides; i++) {
        const a = (2 * Math.PI * i) / sides;
        push(
          (r + toolRadius) * Math.cos(a),
          (r + toolRadius) * Math.sin(a),
          z,
        );
      }
    }
  },
};
