import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  GizmoHelper,
  GizmoViewport,
  ContactShadows,
} from '@react-three/drei';
import * as THREE from 'three';
import { useRakeezStore } from '../store/useRakeezStore';

// ═══════════════════════════════════════════════════════
//  CNC TOOL ASSEMBLY
// ═══════════════════════════════════════════════════════
const CNC_Tool = ({ toolRef }) => {
  const spinRef = useRef();

  useFrame((_, dt) => {
    if (spinRef.current) spinRef.current.rotation.y += dt * 30;
  });

  return (
    <group ref={toolRef}>
      <mesh position={[0, 65, 0]} castShadow>
        <cylinderGeometry args={[18, 18, 80, 32]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.85} roughness={0.15} />
      </mesh>
      <mesh position={[0, 22, 0]} castShadow>
        <cylinderGeometry args={[14, 10, 6, 32]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.1} />
      </mesh>
      <group ref={spinRef} position={[0, 0, 0]}>
        <mesh position={[0, 12, 0]} castShadow>
          <cylinderGeometry args={[3.175, 3.175, 18, 16]} />
          <meshStandardMaterial color="#c8c8c8" metalness={1} roughness={0.05} />
        </mesh>
        <mesh position={[0, 2, 0]} castShadow>
          <cylinderGeometry args={[3.175, 3.175, 4, 6]} />
          <meshStandardMaterial color="#b0b0b0" metalness={1} roughness={0.1} />
        </mesh>
        <mesh position={[0, -0.25, 0]} castShadow>
          <cylinderGeometry args={[3.175, 0.3, 0.5, 16]} />
          <meshStandardMaterial color="#999" metalness={1} roughness={0.05} />
        </mesh>
      </group>
      <pointLight position={[0, 0, 0]} intensity={60} color="#3b82f6" distance={25} />
    </group>
  );
};

// ═══════════════════════════════════════════════════════
//  PHYSICAL STOCK — Semi-transparent so carving is visible
// ═══════════════════════════════════════════════════════
const PhysicalStock = ({ width, height, depth, wcsOrigin }) => {
  const posX = wcsOrigin === 'CENTER' ? 0 : width / 2;
  const posZ = wcsOrigin === 'CENTER' ? 0 : height / 2;

  return (
    <group position={[posX, depth / 2, posZ]}>
      {/* Main body — slightly transparent so cuts show through */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, depth, height]} />
        <meshStandardMaterial
          color="#cbd5e1"
          metalness={0.5}
          roughness={0.4}
          transparent
          opacity={0.75}
          depthWrite={true}
        />
      </mesh>
      {/* Wireframe shell */}
      <mesh>
        <boxGeometry args={[width + 0.2, depth + 0.2, height + 0.2]} />
        <meshBasicMaterial color="#94a3b8" wireframe transparent opacity={0.2} />
      </mesh>
    </group>
  );
};

// ═══════════════════════════════════════════════════════
//  TOOL POSITION SYNC (Idle + Jog)
// ═══════════════════════════════════════════════════════
const ToolPositionSync = ({ toolRef, stockDepth }) => {
  useFrame(() => {
    const { isSimulating, actualPos } = useRakeezStore.getState();
    if (isSimulating) return;

    if (toolRef.current) {
      toolRef.current.position.set(
        actualPos.x,
        (actualPos.z ?? 30) + stockDepth,
        actualPos.y
      );
    }
  });

  return null;
};

// ═══════════════════════════════════════════════════════
//  HELPER: Transform CNC Float32Array → WebGL Float32Array
//  CNC [x, y, z] → WebGL [x, z + stockDepth, y]
// ═══════════════════════════════════════════════════════
function buildVizBuffer(pathBuffer, pathCount, stockDepth) {
  const viz = new Float32Array(pathCount * 3);
  for (let i = 0; i < pathCount; i++) {
    const off = i * 3;
    viz[off + 0] = pathBuffer[off + 0];               // WebGL X = CNC X
    viz[off + 1] = pathBuffer[off + 2] + stockDepth;   // WebGL Y = CNC Z + stockDepth
    viz[off + 2] = pathBuffer[off + 1];                // WebGL Z = CNC Y
  }
  return viz;
}

// ═══════════════════════════════════════════════════════
//  SIMULATION ENGINE — 60 FPS, No React State in loop
//  The carving trail is rendered as a 3D line in proper
//  WebGL space (above/through the stock, not hidden inside)
// ═══════════════════════════════════════════════════════
const SimulationEngine = ({ toolRef, stockDepth }) => {
  const lineGeoRef = useRef();
  const indexRef = useRef(0);
  const doneRef = useRef(false);       // prevents repeated "done" logs
  const vizBufferRef = useRef(null);    // transformed WebGL buffer
  const { controls } = useThree();

  // Reset on simulation start
  useEffect(() => {
    return useRakeezStore.subscribe(
      (state) => state.isSimulating,
      (isSim) => {
        if (isSim) {
          indexRef.current = 0;
          doneRef.current = false;
          if (controls) {
            controls.target.set(0, stockDepth / 2, 0);
            controls.update();
          }
        }
      }
    );
  }, [controls, stockDepth]);

  // Build a WebGL-space visualization buffer when pathBuffer changes
  useEffect(() => {
    return useRakeezStore.subscribe(
      (state) => state.pathBuffer,
      (buf) => {
        indexRef.current = 0;
        doneRef.current = false;

        if (buf) {
          const count = useRakeezStore.getState().pathCount;
          const viz = buildVizBuffer(buf, count, stockDepth);
          vizBufferRef.current = viz;

          if (lineGeoRef.current) {
            lineGeoRef.current.setAttribute('position', new THREE.BufferAttribute(viz, 3));
            lineGeoRef.current.setDrawRange(0, 0);
          }
        } else {
          vizBufferRef.current = null;
          if (lineGeoRef.current) {
            lineGeoRef.current.setDrawRange(0, 0);
          }
        }
      }
    );
  }, [stockDepth]);

  useFrame(() => {
    const store = useRakeezStore.getState();
    const { isSimulating, pathBuffer, pathCount } = store;

    if (!isSimulating || !pathBuffer || pathCount === 0) return;
    if (doneRef.current) return; // already finished this cycle

    let idx = indexRef.current;

    // Advance N points per frame
    const CHUNK_SIZE = Math.max(1, Math.floor(pathCount / 800));
    idx += CHUNK_SIZE;

    // ── TERMINATION: hard stop when done ──
    if (idx >= pathCount) {
      idx = pathCount;
      indexRef.current = idx;
      doneRef.current = true; // prevent further processing

      // Final draw range
      if (lineGeoRef.current) {
        lineGeoRef.current.setDrawRange(0, idx);
      }

      // Final DRO update
      if (pathBuffer && idx > 0) {
        const vi = (idx - 1) * 3;
        useRakeezStore.setState((s) => ({
          isSimulating: false,
          processStatus: 'ready',
          actualPos: { x: pathBuffer[vi], y: pathBuffer[vi + 1], z: pathBuffer[vi + 2], a: 0 },
          currentPathIndex: idx,
          telemetry: {
            ...s.telemetry,
            status: 'COMPLETE',
            coords: { ...s.telemetry.coords, actual: { x: pathBuffer[vi], y: pathBuffer[vi + 1], z: pathBuffer[vi + 2], a: 0 } },
            spindle: { rpm: 0, load: 0, temp: 30 },
          },
        }));
      }
      store.addLog({ type: 'success', msg: `[SIM] Cycle complete. ${pathCount} vertices rendered.` });
      return; // HARD RETURN — no more processing
    }

    indexRef.current = idx;

    // 1. GPU Draw Range update
    if (lineGeoRef.current) {
      lineGeoRef.current.setDrawRange(0, idx);
    }

    // 2. Move Tool via ref
    if (toolRef.current && idx > 0) {
      const vi = (idx - 1) * 3;
      const rawX = pathBuffer[vi + 0];
      const rawY = pathBuffer[vi + 1];
      const rawZ = pathBuffer[vi + 2];

      toolRef.current.position.set(rawX, rawZ + stockDepth, rawY);

      // 3. Throttled DRO updates (~10 FPS)
      if (idx % (CHUNK_SIZE * 6) === 0) {
        useRakeezStore.setState((s) => ({
          actualPos: { x: rawX, y: rawY, z: rawZ, a: 0 },
          currentPathIndex: idx,
          telemetry: {
            ...s.telemetry,
            status: 'EXECUTING',
            coords: { ...s.telemetry.coords, actual: { x: rawX, y: rawY, z: rawZ, a: 0 } },
            spindle: { rpm: 18000 + Math.random() * 400, load: rawZ < 0 ? 42 : 8, temp: 37 },
          },
        }));
      }
    }
  });

  return (
    <line>
      <bufferGeometry ref={lineGeoRef} />
      <lineBasicMaterial color="#1e293b" linewidth={2} />
    </line>
  );
};

// ═══════════════════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════════════════
export const DigitalTwinView = () => {
  const stock = useRakeezStore((s) => s.stockDimensions);
  const wcsOrigin = useRakeezStore((s) => s.wcsOrigin);
  const isSimulating = useRakeezStore((s) => s.isSimulating);
  const actualPos = useRakeezStore((s) => s.actualPos);
  const machineMode = useRakeezStore((s) => s.machineMode);

  const toolRef = useRef();

  return (
    <div className="w-full h-full bg-white relative overflow-hidden">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [250, 200, 250], fov: 40 }}>
        <color attach="background" args={['#ffffff']} />

        <ambientLight intensity={0.8} />
        <directionalLight
          position={[150, 250, 100]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-300}
          shadow-camera-right={300}
          shadow-camera-top={300}
          shadow-camera-bottom={-300}
        />
        <directionalLight position={[-100, 80, -100]} intensity={0.4} />

        <gridHelper args={[600, 60, '#d1d5db', '#e5e7eb']} position={[0, -0.01, 0]} />

        <PhysicalStock width={stock.width} height={stock.height} depth={stock.depth} wcsOrigin={wcsOrigin} />

        <CNC_Tool toolRef={toolRef} />
        <ToolPositionSync toolRef={toolRef} stockDepth={stock.depth} />
        <SimulationEngine toolRef={toolRef} stockDepth={stock.depth} />

        <OrbitControls makeDefault enableDamping minDistance={30} maxDistance={800} />
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport axisColors={['#ef4444', '#22c55e', '#3b82f6']} labelColor="black" />
        </GizmoHelper>
        <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={600} blur={1.5} far={60} />
      </Canvas>

      {/* HUD OVERLAY */}
      <div className="absolute top-5 left-5 pointer-events-none">
        <div className="bg-white/90 backdrop-blur border border-slate-200 shadow-xl rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-emerald-500 animate-pulse' : 'bg-orange-400'}`} />
            <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">
              CNC_TWIN_V3 — {isSimulating ? 'RUNNING' : 'IDLE'}
            </span>
          </div>
          <div className="flex gap-4 mt-1">
            {[
              { axis: 'X', color: 'text-red-500', val: actualPos.x },
              { axis: 'Y', color: 'text-emerald-500', val: actualPos.y },
              { axis: 'Z', color: 'text-blue-500', val: actualPos.z },
            ].map(({ axis, color, val }) => (
              <div key={axis} className="flex flex-col">
                <span className={`text-[7px] font-black ${color} uppercase`}>{axis}</span>
                <span className="text-[11px] font-mono font-black text-slate-900">{val?.toFixed(3)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-[8px] font-bold text-slate-400 font-mono">
              Stock: {stock.width}×{stock.height}×{stock.depth}
            </span>
            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${
              machineMode === '4-AXIS'
                ? 'text-purple-600 bg-purple-50 border-purple-200'
                : 'text-blue-600 bg-blue-50 border-blue-200'
            }`}>
              {machineMode}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
