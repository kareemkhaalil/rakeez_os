import React from 'react';
import { useRakeezStore } from '../store/useRakeezStore';
import { Settings, Box, Crosshair, RotateCcw } from 'lucide-react';

/**
 * RAKEEZ OS V3 — Machine & Workpiece Setup
 * Defines physical machine limits, stock dimensions, WCS origin, and axis mode.
 */
export const MachineSetup = () => {
  const machineConfig    = useRakeezStore((s) => s.machineConfig);
  const stock            = useRakeezStore((s) => s.stockDimensions);
  const wcsOrigin        = useRakeezStore((s) => s.wcsOrigin);
  const machineMode      = useRakeezStore((s) => s.machineMode);
  const setMachineConfig = useRakeezStore((s) => s.setMachineConfig);
  const setStock         = useRakeezStore((s) => s.setStockDimensions);
  const setWcs           = useRakeezStore((s) => s.setWcsOrigin);
  const setMode          = useRakeezStore((s) => s.setMachineMode);

  const NumberInput = ({ label, value, onChange, unit = 'mm', min = 0 }) => (
    <div className="space-y-1">
      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
        <input
          type="number"
          value={value}
          min={min}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 px-3 py-2 text-[11px] font-mono font-bold text-slate-900 bg-transparent outline-none"
        />
        <span className="text-[9px] font-black text-slate-300 pr-3 uppercase">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto no-scrollbar">
      {/* ── AXIS MODE ── */}
      <div>
        <h3 className="text-[9px] font-black text-purple-600 uppercase tracking-widest mb-3 flex items-center">
          <RotateCcw className="w-3.5 h-3.5 mr-2" /> Axis Mode
        </h3>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          {[
            { key: '3-AXIS', label: '3-Axis (Milling)', desc: 'X / Y / Z' },
            { key: '4-AXIS', label: '4-Axis (Rotary)', desc: 'X / Y / Z / A' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                machineMode === key
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── MACHINE LIMITS ── */}
      <div>
        <h3 className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center">
          <Settings className="w-3.5 h-3.5 mr-2" /> Machine Envelope
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <NumberInput label="X Max" value={machineConfig.xRange[1]}
            onChange={(v) => setMachineConfig({ xRange: [0, v] })} />
          <NumberInput label="Y Max" value={machineConfig.yRange[1]}
            onChange={(v) => setMachineConfig({ yRange: [0, v] })} />
          <NumberInput label="Z Max" value={Math.abs(machineConfig.zRange[0])}
            onChange={(v) => setMachineConfig({ zRange: [-v, 50] })} />
        </div>
      </div>

      {/* ── STOCK DIMENSIONS ── */}
      <div>
        <h3 className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center">
          <Box className="w-3.5 h-3.5 mr-2" /> Stock Workpiece
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <NumberInput label="Width (X)" value={stock.width}
            onChange={(v) => setStock({ ...stock, width: v })} />
          <NumberInput label="Height (Y)" value={stock.height}
            onChange={(v) => setStock({ ...stock, height: v })} />
          <NumberInput label="Depth (Z)" value={stock.depth}
            onChange={(v) => setStock({ ...stock, depth: v })} />
        </div>
      </div>

      {/* ── WCS ORIGIN ── */}
      <div>
        <h3 className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-3 flex items-center">
          <Crosshair className="w-3.5 h-3.5 mr-2" /> Work Origin (WCS)
        </h3>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          {[
            { key: 'CENTER', label: 'Center' },
            { key: 'BOTTOM_LEFT', label: 'Bottom-Left' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setWcs(key)}
              className={`flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                wcsOrigin === key
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── VISUAL SUMMARY ── */}
      <div className="mt-auto bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Physical Summary</span>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[10px] font-mono font-bold text-slate-600">
          <span>Mode</span>
          <span className={machineMode === '4-AXIS' ? 'text-purple-600' : 'text-blue-600'}>{machineMode}</span>
          <span>Bed</span><span>{machineConfig.xRange[1]} × {machineConfig.yRange[1]} mm</span>
          <span>Stock</span><span>{stock.width} × {stock.height} × {stock.depth} mm</span>
          <span>Z Clearance</span><span>{Math.abs(machineConfig.zRange[0])} + 50 mm</span>
          <span>WCS Origin</span><span>{wcsOrigin}</span>
        </div>
      </div>
    </div>
  );
};
