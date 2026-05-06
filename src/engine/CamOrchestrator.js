import { MillingCAM } from './MillingCAM';
import { LatheCAM } from './LatheCAM';
import { SafetyAuditor } from './SafetyAuditor';
import { useRakeezStore } from '../store/useRakeezStore';

/**
 * RAKEEZ OS V3 — CamOrchestrator (HIGH PERFORMANCE)
 * Routes intent → WebWorker (or fallback).
 * Now expects pure binary payloads and pre-audited strings from the worker.
 */
export const CamOrchestrator = {
  /**
   * Attempt to run CAM inside a WebWorker.
   * Falls back to main-thread if Worker fails.
   */
  _runInWorker(intent, machineConfig) {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(
          new URL('./camWorker.js', import.meta.url),
          { type: 'module' }
        );

        const timeout = setTimeout(() => {
          worker.terminate();
          reject(new Error('Worker timeout (30s)'));
        }, 30000);

        worker.onmessage = (e) => {
          clearTimeout(timeout);
          worker.terminate();
          if (e.data.type === 'RESULT') {
            resolve({ 
               gcode: e.data.gcode, 
               pathBuffer: e.data.pathBuffer,  // Float32Array
               counts: e.data.counts,
               isSafe: e.data.isSafe
            });
          } else {
            reject(new Error(e.data.message || 'Worker error'));
          }
        };

        worker.onerror = (err) => {
          clearTimeout(timeout);
          worker.terminate();
          reject(new Error(err.message));
        };

        const storeMode = useRakeezStore?.getState?.()?.machineMode;
        worker.postMessage({ type: 'GENERATE', intent, machineConfig, machineMode: storeMode });
      } catch (err) {
        reject(err);
      }
    });
  },

  async route(intent, machineConfig) {
    const op = (intent.operation || '').toUpperCase();
    const sh = (intent.shape || '').toUpperCase();
    const storeMode = useRakeezStore?.getState?.()?.machineMode;
    const isTurning = sh === 'CYLINDER' || op === 'TURN' || op === 'LATHE' || storeMode === '4-AXIS';
    console.log(`[ORCHESTRATOR] Routing: ${op} → ${sh} (MODE: ${storeMode}, TURNING: ${isTurning})`);

    let result;

    try {
      console.log('[ORCHESTRATOR] Delegating generation to WebWorker...');
      result = await this._runInWorker(intent, machineConfig);
      console.log(`[ORCHESTRATOR] Worker returned ${result.counts} vertices. (Float32Array Size: ${result.pathBuffer.length})`);
    } catch (workerErr) {
      console.warn(`[ORCHESTRATOR] Worker failed (${workerErr.message}), system fallback is deprecated for raw buffers! Throwing error.`);
      throw workerErr;
    }

    if (!result.isSafe) {
      console.warn('[ORCHESTRATOR] ⚠ ALARM: Worker detected Envelope limits exceeded.');
    }

    return {
      mode: isTurning ? '4-AXIS' : '3-AXIS',
      gcode: result.gcode,
      pathBuffer: result.pathBuffer, // Float32Array passed to Zustand !
      pathCount: result.counts,
      stats: {
        points: result.counts,
        isSafe: result.isSafe,
      },
    };
  },
};
