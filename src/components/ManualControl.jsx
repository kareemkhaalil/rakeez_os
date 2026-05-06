import React, { useRef, useCallback, useEffect } from 'react';
import { useRakeezStore } from '../store/useRakeezStore';
import {
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  ChevronUp, ChevronDown, RotateCcw, RotateCw,
  Home, Target, Crosshair,
} from 'lucide-react';

/**
 * RAKEEZ OS V3 — ManualControl (Virtual Pendant)
 * 4-Axis D-Pad: X/Y planar, Z vertical, A rotary.
 * Modes: INCREMENTAL (click) and CONTINUOUS (hold).
 */
export const ManualControl = () => {
  const jogMode   = useRakeezStore((s) => s.jogMode);
  const stepSize  = useRakeezStore((s) => s.stepSize);
  const actualPos = useRakeezStore((s) => s.actualPos);
  const jogAxis   = useRakeezStore((s) => s.jogAxis);
  const setJogMode  = useRakeezStore((s) => s.setJogMode);
  const setStepSize = useRakeezStore((s) => s.setStepSize);
  const gotoOrigin  = useRakeezStore((s) => s.gotoOrigin);
  const zeroAxis    = useRakeezStore((s) => s.zeroAxis);

  // ── Continuous jog interval ref ──
  const intervalRef = useRef(null);

  const startContinuous = useCallback((axis, delta) => {
    if (jogMode !== 'CONTINUOUS') return;
    intervalRef.current = setInterval(() => jogAxis(axis, delta * 0.5), 50);
  }, [jogMode, jogAxis]);

  const stopContinuous = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => () => stopContinuous(), [stopContinuous]);

  const handleJog = useCallback((axis, direction) => {
    const delta = direction * stepSize;
    if (jogMode === 'INCREMENTAL') {
      jogAxis(axis, delta);
    }
  }, [jogMode, stepSize, jogAxis]);

  const steps = [0.1, 1.0, 10.0];

  // ── Jog Button ──
  const JogBtn = ({ axis, dir, children, className = '', size = 'normal' }) => {
    const delta = dir * stepSize;
    const sizeClass = size === 'small'
      ? 'w-10 h-10'
      : 'w-14 h-14';

    return (
      <button
        onClick={() => handleJog(axis, dir)}
        onMouseDown={() => startContinuous(axis, delta)}
        onMouseUp={stopContinuous}
        onMouseLeave={stopContinuous}
        className={`${sizeClass} rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 active:scale-90 transition-all shadow-sm ${className}`}
      >
        {children}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* ── MODE SELECTOR ── */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
        {['INCREMENTAL', 'CONTINUOUS'].map((m) => (
          <button
            key={m}
            onClick={() => setJogMode(m)}
            className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
              jogMode === m
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* ── STEP SIZE ── */}
      {jogMode === 'INCREMENTAL' && (
        <div className="flex gap-2">
          {steps.map((s) => (
            <button
              key={s}
              onClick={() => setStepSize(s)}
              className={`flex-1 py-2.5 text-[10px] font-black rounded-xl border transition-all ${
                stepSize === s
                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-300'
              }`}
            >
              {s}mm
            </button>
          ))}
        </div>
      )}

      {/* ── X/Y D-PAD + Z COLUMN ── */}
      <div className="flex items-center justify-center gap-6">
        {/* X/Y CROSS */}
        <div className="grid grid-cols-3 grid-rows-3 gap-1.5 w-fit">
          <div /> {/* empty */}
          <JogBtn axis="Y" dir={1}><ArrowUp className="w-5 h-5" /></JogBtn>
          <div />
          <JogBtn axis="X" dir={-1}><ArrowLeft className="w-5 h-5" /></JogBtn>
          {/* CENTER: Home */}
          <button
            onClick={gotoOrigin}
            className="w-14 h-14 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 hover:bg-blue-100 active:scale-90 transition-all"
          >
            <Home className="w-5 h-5" />
          </button>
          <JogBtn axis="X" dir={1}><ArrowRight className="w-5 h-5" /></JogBtn>
          <div />
          <JogBtn axis="Y" dir={-1}><ArrowDown className="w-5 h-5" /></JogBtn>
          <div />
        </div>

        {/* Z COLUMN */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-1">Z</span>
          <JogBtn axis="Z" dir={1}><ChevronUp className="w-5 h-5" /></JogBtn>
          <div className="w-14 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
            <span className="text-[10px] font-mono font-black text-blue-700">{actualPos.z?.toFixed(1)}</span>
          </div>
          <JogBtn axis="Z" dir={-1}><ChevronDown className="w-5 h-5" /></JogBtn>
        </div>

        {/* A ROTARY */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[8px] font-black text-purple-500 uppercase tracking-widest mb-1">A</span>
          <JogBtn axis="A" dir={1} size="small"><RotateCw className="w-4 h-4" /></JogBtn>
          <div className="w-10 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center">
            <span className="text-[10px] font-mono font-black text-purple-700">{(actualPos.a || 0).toFixed(1)}°</span>
          </div>
          <JogBtn axis="A" dir={-1} size="small"><RotateCcw className="w-4 h-4" /></JogBtn>
        </div>
      </div>

      {/* ── AXIS ZERO BUTTONS ── */}
      <div className="grid grid-cols-4 gap-2 mt-auto">
        {['X', 'Y', 'Z', 'A'].map((a) => (
          <button
            key={a}
            onClick={() => zeroAxis(a)}
            className="py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition-all"
          >
            Zero {a}
          </button>
        ))}
      </div>

      {/* ── LIVE POS READOUT ── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { axis: 'X', color: 'text-red-500', val: actualPos.x },
          { axis: 'Y', color: 'text-emerald-500', val: actualPos.y },
          { axis: 'Z', color: 'text-blue-500', val: actualPos.z },
          { axis: 'A', color: 'text-purple-500', val: actualPos.a || 0 },
        ].map(({ axis, color, val }) => (
          <div key={axis} className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
            <span className={`text-[8px] font-black ${color} uppercase`}>{axis}</span>
            <div className="text-[11px] font-mono font-black text-slate-900 mt-0.5">
              {val?.toFixed(3)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
