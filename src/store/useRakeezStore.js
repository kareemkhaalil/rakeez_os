import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { translations } from '../engine/translations';

/**
 * RAKEEZ OS V3 — Global Industrial State
 * Production-grade Zustand store with Machine Setup, WCS, and Jog state.
 */
export const useRakeezStore = create(subscribeWithSelector((set, get) => ({
  // ═══════════════════════════════════════════════════════
  //  MACHINE CONFIGURATION (Editable via Setup UI)
  // ═══════════════════════════════════════════════════════
  machineConfig: {
    name: 'MILL_X-PRO',
    model: 'Rakeez Industrial V2',
    xRange: [0, 400],
    yRange: [0, 400],
    zRange: [-80, 50],
    maxRateX: 5000, maxRateY: 5000, maxRateZ: 2000,
    accelX: 500, accelY: 500, accelZ: 200,
    spindleMaxRpm: 24000,
    spindlePower: '2.2 KW',
    spindleType: 'Water-Cooled Brushless',
    torque: '3.5 Nm',
    controller: 'FluidNC/ESP32',
    driveSystem: 'Leadshine Hybrid Stepper',
  },

  // ═══════════════════════════════════════════════════════
  //  STOCK / WORKPIECE SETUP
  // ═══════════════════════════════════════════════════════
  stockDimensions: { width: 150, height: 150, depth: 20 },
  wcsOrigin: 'CENTER', // 'CENTER' | 'BOTTOM_LEFT'

  // ═══════════════════════════════════════════════════════
  //  OPERATIONAL STATE
  // ═══════════════════════════════════════════════════════
  isSimulationMode: true,
  machineMode: '3-AXIS',

  // ═══════════════════════════════════════════════════════
  //  JOG / PENDANT STATE
  // ═══════════════════════════════════════════════════════
  jogMode: 'INCREMENTAL', // 'CONTINUOUS' | 'INCREMENTAL'
  stepSize: 1.0,          // mm per click in INCREMENTAL
  jogFeedRate: 1500,

  // ═══════════════════════════════════════════════════════
  //  TELEMETRY (DRO)
  // ═══════════════════════════════════════════════════════
  telemetry: {
    coords: {
      actual: { x: 0, y: 0, z: 30, a: 0 },
      planned: { x: 0, y: 0, z: 0 },
    },
    spindle: { rpm: 0, load: 0, temp: 25.0 },
    feedRate: 0,
    status: 'IDLE',
  },

  // ═══════════════════════════════════════════════════════
  //  TOOLPATH & GEOMETRY
  // ═══════════════════════════════════════════════════════
  pathBuffer: null,
  pathCount: 0,
  baseProfile: [],
  actualPos: { x: 0, y: 0, z: 30, a: 0 },
  currentPathIndex: 0,
  simulationSpeed: 1.0,
  simulationProgress: 0,

  // ═══════════════════════════════════════════════════════
  //  JOB DATA
  // ═══════════════════════════════════════════════════════
  gcode: '',
  reviewResult: {
    safe: true, warnings: [], errors: [],
    stats: { totalDistance: 0, sharpTurns: 0, segmentCount: 0 },
  },

  // ═══════════════════════════════════════════════════════
  //  UI & LOGS
  // ═══════════════════════════════════════════════════════
  systemLogs: [
    { id: 1, time: new Date().toLocaleTimeString(), type: 'info', msg: 'RAKEEZ OS V3 Industrial Core Initialized.' },
  ],
  isSimulating: false,
  processStatus: '',
  language: 'en',
  theme: 'light',

  systemMetrics: {
    startTime: Date.now(),
    networkLatency: 0,
    coreLoad: 0,
    bufferStatus: 'READY',
  },

  // ═══════════════════════════════════════════════════════
  //  ACTIONS: MACHINE CONFIG & STOCK
  // ═══════════════════════════════════════════════════════
  setMachineConfig: (updates) => set((s) => ({
    machineConfig: { ...s.machineConfig, ...updates },
  })),
  setStockDimensions: (dims) => set({ stockDimensions: dims }),
  setWcsOrigin: (origin) => set({ wcsOrigin: origin }),
  setMachineMode: (mode) => set({ machineMode: mode }),

  // ═══════════════════════════════════════════════════════
  //  ACTIONS: JOG / PENDANT
  // ═══════════════════════════════════════════════════════
  setJogMode: (mode) => set({ jogMode: mode }),
  setStepSize: (size) => set({ stepSize: size }),

  /**
   * Jog a single axis by `delta` mm.
   * Clamps to machineConfig limits. Syncs telemetry.
   */
  jogAxis: (axis, delta) => set((s) => {
    const cur = { ...s.actualPos };
    const key = axis.toLowerCase();
    cur[key] = (cur[key] || 0) + delta;

    // Clamp to machine limits
    const cfg = s.machineConfig;
    if (key === 'x') cur.x = Math.max(cfg.xRange[0], Math.min(cfg.xRange[1], cur.x));
    if (key === 'y') cur.y = Math.max(cfg.yRange[0], Math.min(cfg.yRange[1], cur.y));
    if (key === 'z') cur.z = Math.max(cfg.zRange[0], Math.min(cfg.zRange[1], cur.z));

    return {
      actualPos: cur,
      telemetry: {
        ...s.telemetry,
        coords: { ...s.telemetry.coords, actual: cur },
      },
    };
  }),

  zeroAxis: (axis) => set((s) => {
    const cur = { ...s.actualPos, [axis.toLowerCase()]: 0 };
    return {
      actualPos: cur,
      telemetry: {
        ...s.telemetry,
        coords: { ...s.telemetry.coords, actual: cur },
      },
    };
  }),

  gotoOrigin: () => set((s) => {
    const origin = { x: 0, y: 0, z: 30, a: 0 };
    return {
      actualPos: origin,
      telemetry: {
        ...s.telemetry,
        coords: { ...s.telemetry.coords, actual: origin },
      },
    };
  }),

  // ═══════════════════════════════════════════════════════
  //  ACTIONS: TELEMETRY
  // ═══════════════════════════════════════════════════════
  updateTelemetry: (partial) => set((s) => ({
    telemetry: { ...s.telemetry, ...partial },
  })),
  updateState: (updates) => set((s) => ({ ...s, ...updates })),
  updateSystemMetrics: (partial) => set((s) => ({
    systemMetrics: { ...s.systemMetrics, ...partial },
  })),

  // ═══════════════════════════════════════════════════════
  //  ACTIONS: PATH & G-CODE
  // ═══════════════════════════════════════════════════════
  setPathBuffer: (bg, cnt) => set({ pathBuffer: bg, pathCount: cnt, currentPathIndex: 0 }),
  setBaseProfile: (profile) => set({ baseProfile: profile }),
  setActualPos: (pos) => set({ actualPos: pos }),
  setCurrentPathIndex: (idx) => set({ currentPathIndex: idx }),
  setProcessStatus: (status) => set({ processStatus: status }),
  setReviewResult: (result) => set({ reviewResult: result }),
  setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),

  setGCode: (code) => {
    const lines = code.split('\n');
    const path = [];
    let cur = { x: 0, y: 0, z: 10, a: 0 };
    let modalMotion = 'G0';

    lines.forEach((line) => {
      const parts = line.toUpperCase().split(';');
      const cmd = parts[0].trim();
      if (!cmd) return;

      const gMatch = cmd.match(/\b(G0|G1|G2|G3|G00|G01|G02|G03)\b/);
      if (gMatch) modalMotion = gMatch[1];

      const xM = cmd.match(/X([-+]?[0-9]*\.?[0-9]+)/);
      const yM = cmd.match(/Y([-+]?[0-9]*\.?[0-9]+)/);
      const zM = cmd.match(/Z([-+]?[0-9]*\.?[0-9]+)/);
      const aM = cmd.match(/A([-+]?[0-9]*\.?[0-9]+)/);

      let moved = false;
      if (xM) { cur.x = parseFloat(xM[1]); moved = true; }
      if (yM) { cur.y = parseFloat(yM[1]); moved = true; }
      if (zM) { cur.z = parseFloat(zM[1]); moved = true; }
      if (aM) { cur.a = parseFloat(aM[1]); moved = true; }

      if (gMatch || (moved && modalMotion.startsWith('G'))) {
        path.push({
          ...cur,
          _feed: (modalMotion === 'G0' || modalMotion === 'G00') ? 'RAPID' : 'CUT',
        });
      }
    });

    const buffer = new Float32Array(path.length * 3);
    for (let i = 0; i < path.length; i++) {
        buffer[i*3+0] = path[i].x;
        buffer[i*3+1] = path[i].y;
        buffer[i*3+2] = path[i].z;
    }
    set({ gcode: code, pathBuffer: buffer, pathCount: path.length, currentPathIndex: 0 });
  },

  // ═══════════════════════════════════════════════════════
  //  ACTIONS: JOB CONTROL
  // ═══════════════════════════════════════════════════════
  resetJob: () => set({
    pathBuffer: null,
    pathCount: 0,
    gcode: '',
    currentPathIndex: 0,
    actualPos: { x: 0, y: 0, z: 30, a: 0 },
    isSimulating: false,
    telemetry: {
      coords: { actual: { x: 0, y: 0, z: 30, a: 0 }, planned: { x: 0, y: 0, z: 0 } },
      spindle: { rpm: 0, load: 0, temp: 25.0 },
      feedRate: 0,
      status: 'READY',
    },
  }),

  reCenterPlannedPath: () => set((s) => {
    const { pathBuffer, pathCount, machineConfig } = s;
    if (!pathBuffer || pathCount === 0) return {};

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < pathCount; i++) {
      const px = pathBuffer[i * 3];
      const py = pathBuffer[i * 3 + 1];
      if (px < minX) minX = px; if (px > maxX) maxX = px;
      if (py < minY) minY = py; if (py > maxY) maxY = py;
    }

    const dx = (machineConfig.xRange[0] + machineConfig.xRange[1]) / 2 - (minX + maxX) / 2;
    const dy = (machineConfig.yRange[0] + machineConfig.yRange[1]) / 2 - (minY + maxY) / 2;

    const newBuffer = new Float32Array(pathCount * 3);
    for (let i = 0; i < pathCount; i++) {
      newBuffer[i * 3] = pathBuffer[i * 3] + dx;
      newBuffer[i * 3 + 1] = pathBuffer[i * 3 + 1] + dy;
      newBuffer[i * 3 + 2] = pathBuffer[i * 3 + 2];
    }

    return {
      pathBuffer: newBuffer,
      currentPathIndex: 0,
    };
  }),

  // ═══════════════════════════════════════════════════════
  //  ACTIONS: UI
  // ═══════════════════════════════════════════════════════
  toggleSimulationMode: () => set((s) => ({
    isSimulationMode: !s.isSimulationMode,
    telemetry: { ...s.telemetry, status: !s.isSimulationMode ? 'SIMULATED' : 'OFFLINE' },
  })),
  toggleLanguage: () => set((s) => ({ language: s.language === 'en' ? 'ar' : 'en' })),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

  t: (key) => {
    const s = get();
    return translations[s.language]?.[key] || key;
  },

  getUptime: () => {
    const elapsed = Date.now() - get().systemMetrics.startTime;
    const h = Math.floor(elapsed / 3600000);
    const m = Math.floor((elapsed % 3600000) / 60000);
    const s = Math.floor((elapsed % 60000) / 1000);
    return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  },

  addLog: (log) => set((s) => ({
    systemLogs: [
      ...s.systemLogs.slice(-49),
      { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), ...log },
    ],
  })),
})));
