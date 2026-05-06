import { OllamaService } from './OllamaService';
import { IntentParser } from './IntentParser';
import { useRakeezStore } from '../store/useRakeezStore';

/**
 * Main Controller for RAKEEZ OS V2 Orchestration.
 * Coordinates between AI, Geometry Engine, and UI Store.
 */
export const MainController = {
  /**
   * Process raw text intent via AI or Fallback.
   */
  processRawText: async (rawText) => {
    const store = useRakeezStore.getState();
    const { machineConfig } = store;

    store.addLog({ type: 'info', msg: `[COGNITIVE] Receiving intent: "${rawText}"` });
    store.setProcessStatus('initializing');

    let intent = null;

    try {
      // ─── Phase 1: Local AI Parsing ───
      store.setProcessStatus('negotiating');
      intent = await OllamaService.parseTextCommand(rawText);
      
      if (intent && intent.operation) {
        store.addLog({ type: 'success', msg: `[AI] Llama3/Gemma parsed intent successfully.` });
      } else {
        throw new Error('Malformed AI response.');
      }

    } catch (err) {
      // ─── Phase 1.5: Fallback to V1 Regex ───
      store.addLog({ type: 'warning', msg: `[AI FAIL] ${err.message}. FALLBACK TO DETERMINISTIC REGEX...` });
      store.setProcessStatus('executingFallback');
      
      const fallbackResult = IntentParser.parse(rawText);
      if (fallbackResult.success) {
        intent = fallbackResult.intent;
        store.addLog({ type: 'success', msg: '[PARSER] Fallback regex extraction successful.' });
      } else {
        store.addLog({ type: 'error', msg: '[CRITICAL] AI and Fallback failed to parse command.' });
        store.setProcessStatus('');
        return;
      }
    }

    // ─── Phase 2: Geometry Execution ───
    try {
      await MainController._executeGeometryPipeline(intent, machineConfig, store);
    } catch (err) {
      store.addLog({ type: 'error', msg: `[KERNEL CRASH] ${err.message}` });
      store.setProcessStatus('');
    }
  },

  /**
   * Process blueprint images via LLaVA
   */
  processImage: async (base64Image) => {
    const store = useRakeezStore.getState();
    const { machineConfig } = store;

    store.addLog({ type: 'info', msg: '[VISION] Image blueprint received. Starting extraction...' });
    store.setProcessStatus('extracting');

    try {
      const intent = await OllamaService.parseBlueprintImage(base64Image);
      if (intent && intent.operation) {
        store.addLog({ type: 'success', msg: `[VISION] Blueprint parsed correctly.` });
        await MainController._executeGeometryPipeline(intent, machineConfig, store);
      } else {
        throw new Error('Image analysis did not return a valid machining operation.');
      }
    } catch (err) {
      store.addLog({ type: 'error', msg: `[VISION FAIL] ${err.message}` });
      store.setProcessStatus('');
    }
  },

  /**
   * Process raw G-code file text
   */
  processGCodeFile: async (textContent) => {
    const store = useRakeezStore.getState();
    store.addLog({ type: 'info', msg: '[STORAGE] Importing external G-code file...' });
    store.setProcessStatus('initializing');

    try {
      store.setGCode(textContent);
      store.setProcessStatus('ready');
      store.addLog({ type: 'success', msg: `[SYSTEM] Import successful.` });
    } catch (err) {
      store.addLog({ type: 'error', msg: `[IMPORT FAIL] ${err.message}` });
      store.setProcessStatus('');
    }
  },

  /**
   * Internal Geometry & Review pipeline
   */
  /**
   * RAKEEZ V3 - Decentralized JS CAM Engine
   * Routes intent to specialized JS engines (Milling vs Lathe).
   */
  _executeGeometryPipeline: async (intent, machineConfig, store) => {
    store.setProcessStatus('initializing_js_engine');
    
    store.addLog({ 
      type: 'info', 
      msg: `[ORCHESTRATOR] Initializing RAKEEZ V3 JS Engine...` 
    });

    try {
      store.setProcessStatus('generating_nc_code');
      
      const { CamOrchestrator } = await import('./CamOrchestrator');
      const result = await CamOrchestrator.route(intent, machineConfig);
      
      store.setMachineMode(result.mode);

      if (result.gcode) {
          // CRITICAL: Do NOT call setGCode() — it re-parses the entire string with regex.
          // The worker already gave us the binary pathBuffer. Store gcode as-is for display/export.
          store.updateState({ gcode: result.gcode });
          store.setPathBuffer(result.pathBuffer, result.pathCount);
          store.setProcessStatus('ready');
          store.addLog({ 
            type: 'success', 
            msg: `[CORE] ${result.mode} Toolpath: ${result.pathCount.toLocaleString()} vertices. Safety: ${result.stats.isSafe ? 'PASS' : 'WARN'}.` 
          });
      }
    } catch (err) {
      throw new Error(`[ENGINE FAIL] ${err.message}`);
    }
  },

  /**
   * Send the current G-code in store to the Hardware Serial Bridge.
   */
  streamGCodeToHardware: async (startLine = 0) => {
    const store = useRakeezStore.getState();
    const gcode = store.gcode;

    if (!gcode) {
      store.addLog({ type: 'error', msg: '[BRIDGE] No G-code available to stream.' });
      return;
    }

    try {
      store.addLog({ type: 'info', msg: `[BRIDGE] Handshaking with Serial Bridge (Start Line: ${startLine})...` });
      
      const blob = new Blob([gcode], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', blob, 'job.nc');
      formData.append('startLine', startLine);

      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Hardware sync failed.');

      const result = await response.json();
      store.addLog({ type: 'success', msg: `[HARDWARE] Stream active. ${result.line_count} lines queued.` });
      store.setIsSimulating(true); // Trigger UI to monitor progress
    } catch (err) {
      store.addLog({ type: 'error', msg: `[BRIDGE FAIL] ${err.message}` });
    }
  },

  /**
   * Real-Time Stream Interrupts
   */
  pauseHardware: async () => {
    try { await fetch('http://localhost:8000/pause', { method: 'POST' }); }
    catch (e) { useRakeezStore.getState().addLog({ type: 'error', msg: `[Feed Hold] ${e}` }); }
  },

  resumeHardware: async () => {
    try { await fetch('http://localhost:8000/resume', { method: 'POST' }); }
    catch (e) { useRakeezStore.getState().addLog({ type: 'error', msg: `[Cycle Start] ${e}` }); }
  },

  overrideHardware: async (command) => {
    try { await fetch(`http://localhost:8000/override/${command}`, { method: 'POST' }); }
    catch (e) { useRakeezStore.getState().addLog({ type: 'error', msg: `[Override Failure] ${e}` }); }
  },

  /**
   * Browser-Based G-Code Export (Production Output)
   */
  downloadGCode: () => {
    const store = useRakeezStore.getState();
    const { pathBuffer, pathCount, machineMode } = store;
    
    if (!pathBuffer || pathCount === 0) {
      store.addLog({ type: 'error', msg: '[EXPORT] No path data found to export.' });
      return;
    }

    try {
      store.addLog({ type: 'info', msg: `[EXPORT] Generating full NC file for ${pathCount.toLocaleString()} moves...` });

      // Generate full G-code from pathBuffer on demand
      const lines = [
        '; RAKEEZ OS V3 - FULL NC EXPORT',
        `; MODE: ${machineMode}`,
        `; TOTAL MOVES: ${pathCount}`,
        'G21', 'G90', 'M3 S18000', 'G0 Z50',
      ];

      for (let i = 0; i < pathCount; i++) {
        const off = i * 3;
        const x = pathBuffer[off + 0];
        const y = pathBuffer[off + 1];
        const z = pathBuffer[off + 2];
        const isRapid = z > 40;
        const cmd = isRapid ? 'G0' : 'G1';
        const f = isRapid ? '' : (z < 0 ? ' F400' : ' F2500');
        lines.push(`${cmd} X${x.toFixed(3)} Y${y.toFixed(3)} Z${z.toFixed(3)}${f}`);
      }
      lines.push('G0 Z50', 'M5', 'M30');

      const fullGcode = lines.join('\n');
      const blob = new Blob([fullGcode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      
      a.href = url;
      a.download = `rakeez_job_${timestamp}.nc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      store.addLog({ type: 'success', msg: `[EXPORT] NC file downloaded. ${pathCount.toLocaleString()} moves.` });
    } catch (err) {
      store.addLog({ type: 'error', msg: `[EXPORT FAIL] ${err.message}` });
    }
  },

  /**
   * Immediate Hardware Emergency Stop
   */
  triggerHardwareEstop: async () => {
    const store = useRakeezStore.getState();
    try {
      await fetch('http://localhost:8000/estop', { method: 'POST' });
      store.addLog({ type: 'error', msg: '!!! EMERGENCY STOP SENT TO HARDWARE !!!' });
      store.stopSimulation();
    } catch (err) {
      store.addLog({ type: 'error', msg: `[ESTOP FAIL] ${err.message}` });
    }
  },
  startSimulation: () => {
    const store = useRakeezStore.getState();
    const { pathBuffer, pathCount, isSimulating } = store;
    
    if (isSimulating) return;
    if (!pathBuffer || pathCount === 0) {
      store.addLog({ type: 'error', msg: '[SIM] NO NC DATA FOUND. COMPILE INTENT FIRST.' });
      return;
    }

    // Reset and start — SimulationEngine inside DigitalTwinView handles the 60FPS rendering
    store.updateState({ isSimulating: true, currentPathIndex: 0, simulationProgress: 0 });
    store.addLog({ type: 'success', msg: `[SIM] Industrial Cycle Active. Processing ${pathCount} vertices via GPU pipeline.` });
  },

  stopSimulation: () => {
    const store = useRakeezStore.getState();
    store.updateState({ 
      isSimulating: false,
      telemetry: { ...store.telemetry, status: 'IDLE', spindle: { rpm: 0, load: 0, temp: 25 } }
    });
    store.addLog({ type: 'info', msg: '[SIM] Process sequence terminated.' });
  },

  /**
   * Manual Axis Jogging (Incremental)
   */
  jog: async (axis, distance) => {
    const store = useRakeezStore.getState();
    const feed = store.jogFeedRate || 1500;
    
    if (store.isSimulationMode) {
      const current = store.telemetry.coords.actual;
      const newVal = current[axis.toLowerCase()] + distance;
      const updated = { ...current, [axis.toLowerCase()]: newVal };
      
      store.updateTelemetry({
        coords: { ...store.telemetry.coords, actual: updated }
      });
      store.setActualPos(updated); // Sync with 3D view
      return;
    }

    const cmd = `G91 G0 ${axis.toUpperCase()}${distance} F${feed} G90`;
    try {
      await fetch(`http://localhost:8000/jog?command=${encodeURIComponent(cmd)}`, { method: 'POST' });
    } catch (err) {
      store.addLog({ type: 'error', msg: `Jog Failure: ${err.message}` });
    }
  },

  /**
   * Reset Axis to Zero (G10 L20 P1)
   */
  zeroAxis: async (axis) => {
    const store = useRakeezStore.getState();
    
    if (store.isSimulationMode) {
      const current = store.telemetry.coords.actual;
      const updated = { ...current, [axis.toLowerCase()]: 0 };
      store.updateTelemetry({
        coords: { ...store.telemetry.coords, actual: updated }
      });
      store.setActualPos(updated); // Sync with 3D view
      store.addLog({ type: 'success', msg: `[VIRTUAL] Axis ${axis.toUpperCase()} zeroed.` });
      return;
    }

    const cmd = `G10 L20 P1 ${axis.toUpperCase()}0`;
    try {
      await fetch(`http://localhost:8000/jog?command=${encodeURIComponent(cmd)}`, { method: 'POST' });
      store.addLog({ type: 'success', msg: `[WCS] Axis ${axis.toUpperCase()} zeroed.` });
    } catch (err) {
      store.addLog({ type: 'error', msg: `Zero Failure: ${err.message}` });
    }
  },

  /**
   * Rapid to Origin (0,0,10)
   */
  gotoOrigin: () => {
    const store = useRakeezStore.getState();
    const origin = { x: 0, y: 0, z: 10, a: 0 };
    
    if (store.isSimulationMode) {
      store.updateTelemetry({
        coords: { ...store.telemetry.coords, actual: origin }
      });
      store.setActualPos(origin);
      store.addLog({ type: 'info', msg: '[VIRTUAL] Rapid to Origin.' });
    } else {
      // Hardware rapid to origin...
    }
  },

  /**
   * Home Machine ($H)
   */
  homeMachine: async () => {
    const store = useRakeezStore.getState();

    if (store.isSimulationMode) {
      store.updateTelemetry({
        coords: { ...store.telemetry.coords, actual: { x: 0, y: 0, z: 10, a: 0 } }
      });
      store.addLog({ type: 'info', msg: '[VIRTUAL] Homing sequence complete.' });
      return;
    }

    try {
      await fetch(`http://localhost:8000/jog?command=${encodeURIComponent('$H')}`, { method: 'POST' });
      store.addLog({ type: 'info', msg: '[MACHINE] Homing sequence initiated.' });
    } catch (err) {
      store.addLog({ type: 'error', msg: `Home Failure: ${err.message}` });
    }
  },


};
