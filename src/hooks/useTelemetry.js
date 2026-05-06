import { useEffect, useRef } from 'react';
import { useRakeezStore } from '../store/useRakeezStore';

/**
 * useTelemetry Hook - RAKEEZ OS V2
 * Connects to the Serial Bridge WebSocket and syncs real-time hardware data with the Global Store.
 */
export const useTelemetry = (isLive = true) => {
  const wsRef = useRef(null);
  const updateTelemetry = useRakeezStore(state => state.updateTelemetry);
  const addLog = useRakeezStore(state => state.addLog);
  const updateSystemMetrics = useRakeezStore(state => state.updateSystemMetrics);

  useEffect(() => {
    if (!isLive) return;

    const connectWS = () => {
      // Use the actual hardware bridge URL
      const ws = new WebSocket('ws://localhost:8000/ws');
      wsRef.current = ws;

      ws.onopen = () => {
        updateTelemetry({ status: 'ONLINE' });
        addLog({ type: 'success', msg: '[HARDWARE] Serial Bridge Connected.' });
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.type === 'TELEMETRY') {
            const raw = msg.raw;
            const parts = raw.replace(/[<>]/g, '').split('|');
            const machineStatus = parts[0];

            // 1. Positions
            const wposPart = parts.find(p => p.startsWith('WPos:'));
            let coords = { actual: { x: 0, y: 0, z: 0, a: 0 } };
            if (wposPart) {
              const [x, y, z, a] = wposPart.split(':')[1].split(',').map(parseFloat);
              coords.actual = { x, y, z, a: a || 0 };
            }

            // 2. Feed/Spindle
            const fsPart = parts.find(p => p.startsWith('FS:'));
            let spindle = { rpm: 0, load: 0, temp: 25 };
            let feedRate = 0;
            if (fsPart) {
              const [f, s] = fsPart.split(':')[1].split(',').map(parseInt);
              feedRate = f;
              spindle.rpm = s;
              // Synthetic load calculation if not provided by hardware
              spindle.load = s > 0 ? (s / 24000) * 100 : 0;
            }

            // Sync with Global Store
            updateTelemetry({
              status: machineStatus.toUpperCase(),
              coords,
              spindle,
              feedRate
            });

            // Update Metrics (Latency simulated for now)
            updateSystemMetrics({ networkLatency: Math.floor(Math.random() * 20) + 5 });
          }

          if (msg.type === 'PROGRESS') {
             updateSystemMetrics({ bufferStatus: `STREAMING ${msg.current}/${msg.total}` });
          }

          if (msg.type === 'MACHINE_CONFIG') {
            useRakeezStore.getState().setMachineConfig({
              xRange: [0, msg.xMax || 1000],
              yRange: [0, msg.yMax || 1000],
              zRange: [-(msg.zMax || 150), 50],
              maxRateX: msg.maxRateX,
              maxRateY: msg.maxRateY,
              maxRateZ: msg.maxRateZ,
              accelX: msg.accelX,
              accelY: msg.accelY,
              accelZ: msg.accelZ
            });
            addLog({ type: 'success', msg: `[HARDWARE] Synced Envelope: ${msg.xMax}x${msg.yMax}x${msg.zMax}` });
          }

          if (msg.type === 'CONSOLE' || msg.type === 'ALERT') {
             addLog({ 
               type: msg.type === 'ALERT' ? 'error' : 'info', 
               msg: `[HARDWARE] ${msg.msg}` 
             });
          }
        } catch (err) {
          console.error("Telemetry Parse Error:", err);
        }
      };

      ws.onclose = () => {
        // Only mark offline if we're not in simulation mode
        const { isSimulationMode } = useRakeezStore.getState();
        if (!isSimulationMode) {
          updateTelemetry({ status: 'OFFLINE' });
        }
        // Retry connection after 5s
        setTimeout(connectWS, 5000);
      };
    };

    connectWS();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [isLive, updateTelemetry, addLog, updateSystemMetrics]);

  // Return the store's telemetry for consumption (keeps API compatible)
  return useRakeezStore(state => state.telemetry);
};
