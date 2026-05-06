/**
 * RAKEEZ OS V3 — CAM WebWorker (ULTRA HIGH PERFORMANCE)
 * Executes both LatheCAM (4-Axis) and MillingCAM (3-Axis) operations.
 * 
 * CRITICAL PERFORMANCE ARCHITECTURE:
 * - Float32Array is the PRIMARY output (for WebGL)
 * - G-code is generated LAZILY: only a sparse summary for display (max 500 lines)
 * - Full G-code is generated on-demand via 'EXPORT_GCODE' message
 * - This prevents 300k string concatenations from killing the browser
 */

// ═══ SHARED STATE (persists between messages for on-demand export) ═══
let lastPathBuffer = null;
let lastPathCount  = 0;
let lastIsTurning  = false;
let lastIntent     = null;

self.onmessage = function (e) {
  const { type, intent, machineConfig, machineMode } = e.data;

  // ── ON-DEMAND FULL G-CODE EXPORT ──
  if (type === 'EXPORT_GCODE') {
    const fullGcode = generateFullGCode(lastPathBuffer, lastPathCount, lastIsTurning, lastIntent);
    self.postMessage({ type: 'EXPORT_RESULT', gcode: fullGcode });
    return;
  }

  if (type !== 'GENERATE') return;

  try {
    const {
      operation = 'PROFILE',
      shape = 'CIRCLE',
      dimensions = {},
      depth = 5,
      tool_diameter = 6,
      parameters = {},
    } = intent;

    const op = operation.toUpperCase();
    const sh = shape.toUpperCase();
    const isTurning = sh === 'CYLINDER' || op === 'TURN' || op === 'LATHE' || machineMode === '4-AXIS';
    const toolRadius = tool_diameter / 2;

    // Pre-allocate buffer. 
    let bufferCapacity = 500000;
    let paths = new Float32Array(bufferCapacity * 3);
    let pathCount = 0;

    // Limits tracking for inline Safety Audit
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    // ── FAST PUSH (NO G-CODE STRING GENERATION) ──
    const push = (point) => {
      if (pathCount >= bufferCapacity) {
        bufferCapacity *= 2;
        const newPaths = new Float32Array(bufferCapacity * 3);
        newPaths.set(paths);
        paths = newPaths;
      }

      const pX = point.x || 0;
      const pY = point.y || 0;
      const pZ = point.z || 0;

      if (pX < minX) minX = pX; if (pX > maxX) maxX = pX;
      if (pY < minY) minY = pY; if (pY > maxY) maxY = pY;
      if (pZ < minZ) minZ = pZ; if (pZ > maxZ) maxZ = pZ;

      if (isTurning) {
        const aRad = (point.a || 0) * (Math.PI / 180);
        paths[pathCount * 3 + 0] = pZ;
        paths[pathCount * 3 + 1] = pX * Math.cos(aRad);
        paths[pathCount * 3 + 2] = pX * Math.sin(aRad);
      } else {
        paths[pathCount * 3 + 0] = pX;
        paths[pathCount * 3 + 1] = pY;
        paths[pathCount * 3 + 2] = pZ;
      }

      pathCount++;
    };

    // ── GENERATION KERNEL ──
    if (isTurning) {
      latheTurning(push, dimensions);
    } else if (op === 'POCKET' && sh === 'CIRCLE') {
      spiralPocket(push, dimensions, depth, toolRadius);
    } else if (op === 'POCKET' && sh === 'RECTANGLE') {
      rectPocket(push, dimensions, depth, toolRadius);
    } else if (op === 'FACE' || op === 'SURFACE') {
      zigZagFace(push, dimensions, depth, toolRadius);
    } else if (op === 'BORE' && sh === 'CIRCLE') {
      helicalBore(push, dimensions, depth, toolRadius);
    } else if (sh === 'SPUR_GEAR') {
      spurGear(push, dimensions, depth, toolRadius, parameters);
    } else {
      genericProfile(push, dimensions, depth, toolRadius, sh, parameters);
    }

    // Safety envelope check
    let isSafe = true;
    if (machineConfig) {
      if (minX < machineConfig.xRange[0] || maxX > machineConfig.xRange[1] ||
          minY < machineConfig.yRange[0] || maxY > machineConfig.yRange[1] ||
          minZ < machineConfig.zRange[0] || maxZ > machineConfig.zRange[1]) {
        isSafe = false;
      }
    }

    // Shrink to exact size
    const finalBuffer = paths.slice(0, pathCount * 3);

    // ── SPARSE SUMMARY G-CODE (max 300 lines for UI display) ──
    const summaryGcode = generateSparseGCode(finalBuffer, pathCount, isTurning, op, sh);

    // Store for later on-demand export
    lastPathBuffer = finalBuffer;
    lastPathCount  = pathCount;
    lastIsTurning  = isTurning;
    lastIntent     = intent;

    self.postMessage({
      type: 'RESULT',
      header: 'RAKEEZ V3',
      gcode: summaryGcode,
      pathBuffer: finalBuffer,
      counts: pathCount,
      isSafe: isSafe,
    }, [finalBuffer.buffer]);

  } catch (err) {
    self.postMessage({ type: 'ERROR', message: err.message });
  }
};

// ═══════════════════════════════════════════════════════
// SPARSE G-CODE SUMMARY (for UI display — max 300 lines)
// ═══════════════════════════════════════════════════════
function generateSparseGCode(buffer, count, isTurning, op, shape) {
  const lines = [
    `; RAKEEZ OS V3 - WORKER_CAM v6.0`,
    `; OP: ${op}  SHAPE: ${shape}  MODE: ${isTurning ? '4-AXIS' : '3-AXIS'}`,
    `; TOTAL VERTICES: ${count}`,
    'G21 ; MM',
    'G90 ; ABSOLUTE',
    'M3 S18000',
    'G0 Z50',
    '; --- PATH START ---',
  ];

  // Sample every Nth point to keep under 300 lines
  const maxSample = 280;
  const step = Math.max(1, Math.floor(count / maxSample));

  for (let i = 0; i < count; i += step) {
    const off = i * 3;
    const x = buffer[off + 0];
    const y = buffer[off + 1];
    const z = buffer[off + 2];
    lines.push(`G1 X${x.toFixed(3)} Y${y.toFixed(3)} Z${z.toFixed(3)} F2500`);
  }

  lines.push('; --- PATH END ---', 'G0 Z50', 'M5', 'M30');
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════
// FULL G-CODE EXPORT (on-demand, not during generation)
// ═══════════════════════════════════════════════════════
function generateFullGCode(buffer, count, isTurning, intent) {
  if (!buffer || count === 0) return '; NO DATA';

  const op = (intent?.operation || 'PROFILE').toUpperCase();
  const sh = (intent?.shape || 'CIRCLE').toUpperCase();
  const lines = [
    `; RAKEEZ OS V3 - FULL EXPORT`,
    `; OP: ${op}  SHAPE: ${sh}  MODE: ${isTurning ? '4-AXIS' : '3-AXIS'}`,
    `; TOTAL MOVES: ${count}`,
    'G21', 'G90', 'M3 S18000', 'G0 Z50',
  ];

  for (let i = 0; i < count; i++) {
    const off = i * 3;
    const x = buffer[off + 0];
    const y = buffer[off + 1];
    const z = buffer[off + 2];
    
    const isRapid = z > 40;
    const cmd = isRapid ? 'G0' : 'G1';
    const f = isRapid ? '' : (z < 0 ? ' F400' : ' F2500');
    lines.push(`${cmd} X${x.toFixed(3)} Y${y.toFixed(3)} Z${z.toFixed(3)}${f}`);
  }

  lines.push('G0 Z50', 'M5', 'M30');
  return lines.join('\n');
}

// ═════════════════════════════════════════════════════════
// LATHE MODULE (4-AXIS)
// ═════════════════════════════════════════════════════════
function latheTurning(push, dims) {
  const length = dims.w || 120;
  const radius = dims.radius || 40;

  const depth = 2.0;
  for (let r = radius + 5; r >= radius; r -= depth) {
    for (let z = 0; z <= length; z += 5) {
      const a = (z * 360 / 10) % 360;
      push({ x: r, y: 0, z: z, a: a, _feed: 'CUT' });
    }
  }

  for (let z = 0; z <= length; z += 0.5) {
    const profileFactor = Math.sin((z / length) * Math.PI);
    const currentR = radius - (profileFactor * 5);
    const a = (z * 360 / 2) % 360;
    push({ x: currentR, y: 0, z: z, a: a, _feed: 'CUT' });
  }
}

// ═════════════════════════════════════════════════════════
// MILLING MODULE (3-AXIS)
// ═════════════════════════════════════════════════════════
function spiralPocket(push, dims, depth, toolRadius) {
  const radius = dims.radius || dims.diameter / 2 || 50;
  const stepover = toolRadius * 0.8;
  const passDepth = 2;
  for (let z = -passDepth; z >= -depth; z -= passDepth) {
    const cz = Math.max(z, -depth);
    push({x:0, y:0, z:50, _feed:'RAPID'});
    push({x:0, y:0, z:cz});
    const maxTheta = (radius / stepover) * 2 * Math.PI;
    for (let theta = 0; theta <= maxTheta; theta += 0.1) {
      const r = stepover * (theta / (2 * Math.PI));
      if (r > radius) break;
      push({x: r * Math.cos(theta), y: r * Math.sin(theta), z: cz});
    }
    for (let a = 0; a <= 2 * Math.PI + 0.01; a += 0.1) {
      push({x: radius * Math.cos(a), y: radius * Math.sin(a), z: cz});
    }
    push({x:0, y:0, z:50, _feed:'RAPID'});
  }
}

function rectPocket(push, dims, depth, toolRadius) {
  const W = dims.w || dims.width || 100;
  const H = dims.h || dims.height || 100;
  const stepover = toolRadius * 0.8;
  const passDepth = 2;
  const cornerR = toolRadius;
  for (let z = -passDepth; z >= -depth; z -= passDepth) {
    const cz = Math.max(z, -depth);
    push({x:0, y:0, z:50, _feed:'RAPID'});
    push({x:0, y:0, z:cz});
    for (let off = stepover; ; off += stepover) {
      const hw = Math.min(off, W / 2 - toolRadius);
      const hh = Math.min(off, H / 2 - toolRadius);
      if (hw <= 0 || hh <= 0) break;
      const cr = Math.min(cornerR, hw, hh);
      push({x: -hw + cr, y: -hh, z: cz});
      push({x: hw - cr, y: -hh, z: cz});
      cornerArc(push, hw - cr, -hh + cr, cr, -Math.PI / 2, 0, cz);
      push({x: hw, y: hh - cr, z: cz});
      cornerArc(push, hw - cr, hh - cr, cr, 0, Math.PI / 2, cz);
      push({x: -hw + cr, y: hh, z: cz});
      cornerArc(push, -hw + cr, hh - cr, cr, Math.PI / 2, Math.PI, cz);
      push({x: -hw, y: -hh + cr, z: cz});
      cornerArc(push, -hw + cr, -hh + cr, cr, Math.PI, 3 * Math.PI / 2, cz);
      if (hw >= W / 2 - toolRadius && hh >= H / 2 - toolRadius) break;
    }
    push({x:0, y:0, z:50, _feed:'RAPID'});
  }
}

function cornerArc(push, cx, cy, r, sa, ea, z) {
  for (let i = 1; i <= 8; i++) {
    const a = sa + (ea - sa) * (i / 8);
    push({x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), z: z});
  }
}

function zigZagFace(push, dims, depth, toolRadius) {
  const w = dims.w || dims.width || 100;
  const h = dims.h || dims.height || 100;
  const toolDiameter = toolRadius * 2;
  const stepover = toolDiameter * 0.4; // 40% stepover
  const passDepth = 2;
  
  for (let z = -passDepth; z >= -depth; z -= passDepth) {
    const cz = Math.max(z, -depth);
    
    // Start slightly outside the material
    const startX = 0 - toolRadius;
    const endX = w + toolRadius;
    let y = 0 - toolRadius;
    let dir = 1; // 1 for right, -1 for left
    
    // Rapid to safe start position
    push({x: startX, y: y, z: 50, _feed:'RAPID'});
    // Plunge down
    push({x: startX, y: y, z: cz});
    
    while (y <= h + toolRadius) {
      if (dir === 1) {
        push({x: endX, y: y, z: cz}); 
      } else {
        push({x: startX, y: y, z: cz});
      }
      
      y += stepover;
      
      // Only step Y if we haven't finished the board
      if (y <= h + toolRadius) {
        if (dir === 1) {
          push({x: endX, y: y, z: cz});
        } else {
          push({x: startX, y: y, z: cz});
        }
      }
      dir *= -1;
    }
    push({x: 0, y: 0, z: 50, _feed:'RAPID'});
  }
}

function helicalBore(push, dims, depth, toolRadius) {
  const holeR = dims.radius || dims.diameter / 2 || 20;
  const cutR = holeR - toolRadius;
  if (cutR <= 0) { push({x: 0, y: 0, z: 50, _feed:'RAPID'}); push({x: 0, y: 0, z: -depth}); push({x: 0, y: 0, z: 50, _feed:'RAPID'}); return; }
  push({x: cutR, y: 0, z: 50, _feed:'RAPID'});
  push({x: cutR, y: 0, z: 0});
  let theta = 0, z = 0;
  while (z > -depth) {
    theta += 0.1;
    z -= (1.0 * 0.1) / (2 * Math.PI);
    if (z < -depth) z = -depth;
    push({x: cutR * Math.cos(theta), y: cutR * Math.sin(theta), z: z});
  }
  for (let a = 0; a <= 2 * Math.PI + 0.01; a += 0.1) {
    push({x: cutR * Math.cos(a), y: cutR * Math.sin(a), z: -depth});
  }
  push({x: 0, y: 0, z: 50, _feed:'RAPID'});
}

function spurGear(push, dims, depth, toolRadius, params) {
  const teeth = params?.teeth || 12;
  const diameter = dims.diameter || 150;
  const paRad = (20 * Math.PI) / 180;
  const mod = diameter / (teeth + 2);
  const pitchR = (mod * teeth) / 2;
  const baseR = pitchR * Math.cos(paRad);
  const outerR = pitchR + mod;
  const rootR = pitchR - 1.25 * mod;
  const ta = (2 * Math.PI) / teeth;
  const project = (r, a) => ({ x: (r + toolRadius) * Math.cos(a), y: (r + toolRadius) * Math.sin(a) });
  for (let z = 0; z >= -depth; z -= 2) {
    push({x: 0, y: 0, z: 50, _feed:'RAPID'});
    for (let t = 0; t < teeth; t++) {
      const base = t * ta;
      const phiMax = Math.sqrt(Math.max(0, (outerR / baseR) ** 2 - 1));
      for (let i = 0; i <= 60; i++) {
        const phi = phiMax * (i / 60);
        const r = Math.sqrt(baseR ** 2 * (1 + phi ** 2));
        const th = phi - Math.atan(phi);
        const p = project(r, base + th);
        push({x: p.x, y: p.y, z: z});
      }
      const thMax = phiMax - Math.atan(phiMax);
      const topW = Math.PI / (2 * teeth) - 2 * thMax;
      for (let i = 1; i <= 10; i++) {
        const a = base + thMax + (topW * i) / 10;
        const p = project(outerR, a);
        push({x: p.x, y: p.y, z: z});
      }
      const mirror = Math.PI / teeth;
      for (let i = 0; i <= 60; i++) {
        const phi = phiMax * ((60 - i) / 60);
        const r = Math.sqrt(baseR ** 2 * (1 + phi ** 2));
        const th = phi - Math.atan(phi);
        const p = project(r, base + mirror - th);
        push({x: p.x, y: p.y, z: z});
      }
      const pR = project(rootR, base + mirror + Math.PI / teeth / 2);
      push({x: pR.x, y: pR.y, z: z});
    }
  }
}

function genericProfile(push, dims, depth, toolRadius, shape, params) {
  const r = dims.radius || 50;
  const sides = shape === 'POLYGON' ? (params?.sides || 6) : 72;
  for (let z = 0; z >= -depth; z -= 2) {
    push({x: 0, y: 0, z: 50, _feed:'RAPID'});
    for (let i = 0; i <= sides; i++) {
      const a = (2 * Math.PI * i) / sides;
      push({x: (r + toolRadius) * Math.cos(a), y: (r + toolRadius) * Math.sin(a), z: z});
    }
  }
}
