import React, { useState } from 'react';
import { useRakeezStore } from './store/useRakeezStore';
import { MainController } from './engine/MainController';
import { CommandCenter } from './components/CommandCenter';
import { DigitalTwinView } from './components/DigitalTwinView';
import { VisionStudio } from './components/VisionStudio';
import { ManualControl } from './components/ManualControl';
import { MachineSetup } from './components/MachineSetup';

/**
 * RAKEEZ OS V3 INDUSTRIAL CORE
 * Production-Ready Bento Box Architecture.
 */
export default function App() {
  const telemetry        = useRakeezStore((s) => s.telemetry);
  const isSimulating     = useRakeezStore((s) => s.isSimulating);
  const gcode            = useRakeezStore((s) => s.gcode);
  const language         = useRakeezStore((s) => s.language);
  const pathCount        = useRakeezStore((s) => s.pathCount);

  // Memoize split lines — the summary gcode is max ~300 lines
  const gcodeLines = React.useMemo(() => gcode ? gcode.split('\n') : [], [gcode]);

  const [activeTab, setActiveTab] = useState('Dashboard');
  const [leftPanel, setLeftPanel] = useState('AI');      // AI | JOG | SETUP

  return (
    <div className="h-screen w-screen overflow-hidden bg-white text-slate-900 flex flex-col font-sans select-none antialiased">

      {/* ═══ INDUSTRIAL TOP BAR ═══ */}
      <header className="h-14 shrink-0 px-6 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-3xl z-50">
        <div className="flex items-center space-x-6">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="font-black text-white text-lg italic uppercase">R</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black tracking-tight text-slate-900 uppercase italic leading-none">
                RAKEEZ OS <span className="text-blue-600">V3</span>
              </span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] mt-0.5">
                Industrial Digital Twin
              </span>
            </div>
          </div>

          <div className="h-7 w-px bg-slate-200" />

          {/* NAV TABS */}
          <nav className="flex space-x-6">
            {['Dashboard', 'Vision Studio'].map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                  activeTab === t ? 'text-blue-600' : 'text-slate-400 hover:text-blue-600'
                }`}
              >
                {t}
              </button>
            ))}
          </nav>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center space-x-5">
          <button
            onClick={() => MainController.downloadGCode()}
            disabled={!gcode}
            className="industrial-btn-primary h-9 text-[9px] disabled:opacity-30"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="font-black uppercase tracking-widest">Export_NC</span>
          </button>

          <div className="flex items-center space-x-3 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">LINK_ACTIVE</span>
          </div>

          <button
            onClick={() => useRakeezStore.getState().toggleLanguage()}
            className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
          >
            {language === 'en' ? 'AR' : 'EN'}
          </button>
        </div>
      </header>

      {/* ═══ MAIN CONTENT ═══ */}
      {activeTab === 'Vision Studio' ? (
        <main className="flex-1 p-5 min-h-0 overflow-hidden bg-slate-50/50">
          <VisionStudio />
        </main>
      ) : (
        <main className="flex-1 p-5 grid grid-cols-[30%_1fr_26%] grid-rows-1 gap-5 min-h-0 overflow-hidden bg-slate-50/50">

          {/* ═══ PANEL A: LEFT COLUMN ═══ */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
            {/* Sub-Tabs */}
            <div className="flex border-b border-slate-100 shrink-0">
              {[
                { key: 'AI', label: 'AI Command' },
                { key: 'JOG', label: 'Pendant' },
                { key: 'SETUP', label: 'Setup' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setLeftPanel(key)}
                  className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest transition-all ${
                    leftPanel === key
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Sub-Content */}
            <div className="flex-1 p-6 overflow-hidden min-h-0">
              {leftPanel === 'AI' && <CommandCenter />}
              {leftPanel === 'JOG' && <ManualControl />}
              {leftPanel === 'SETUP' && <MachineSetup />}
            </div>
          </section>

          {/* ═══ PANEL B: 3D DIGITAL TWIN ═══ */}
          <section className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative bg-white">
            <DigitalTwinView />

            {/* ACTION BAR OVERLAY */}
            <div className="absolute bottom-8 inset-x-8 z-20 flex space-x-4">
              <button
                onClick={() => MainController.startSimulation()}
                disabled={!gcode || isSimulating}
                className="industrial-btn-primary flex-1 h-16 rounded-2xl shadow-2xl"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/20">
                  {isSimulating
                    ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <div className="w-0 h-0 border-t-[7px] border-t-transparent border-l-[12px] border-l-white border-b-[7px] border-b-transparent ml-0.5" />
                  }
                </div>
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[8px] font-black uppercase tracking-[0.15em] opacity-70">
                    {isSimulating ? 'Processing...' : 'Ready'}
                  </span>
                  <span className="text-lg font-black uppercase tracking-tight">
                    {isSimulating ? 'Streaming NC' : 'Execute'}
                  </span>
                </div>
              </button>

              <button
                onClick={() => MainController.stopSimulation()}
                className="industrial-btn-danger w-20 h-16 rounded-2xl flex flex-col items-center justify-center group"
              >
                <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-red-500/20">
                  <div className="w-2.5 h-2.5 bg-white rounded-sm" />
                </div>
                <span className="text-[8px] font-black mt-1.5">STOP</span>
              </button>
            </div>
          </section>

          {/* ═══ PANEL C: RIGHT COLUMN ═══ */}
          <div className="flex flex-col min-h-0 gap-5">
            {/* DRO */}
            <section className="flex-none bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-0.5 leading-none">Machine_DRO</span>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight uppercase">Coordinates</h2>
                </div>
                <div className="px-3 py-1 bg-blue-50 border border-blue-100 rounded-full">
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{telemetry.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {['X', 'Y', 'Z', 'A'].map((axis) => (
                  <div key={axis} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{axis}_Axis</span>
                    <div className="flex items-baseline">
                      <span className="data-value">{telemetry.coords.actual[axis.toLowerCase()]?.toFixed(3)}</span>
                      <span className="data-unit">mm</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* NC STREAM */}
            <section className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
              <div className="p-5 border-b border-slate-100 shrink-0 bg-slate-50/50 flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-0.5 leading-none">N-Code_Socket</span>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight uppercase leading-none">NC Stream</h2>
                </div>
                <div className="flex items-center gap-2">
                  {pathCount > 0 && (
                    <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {pathCount.toLocaleString()} PTS
                    </span>
                  )}
                  <span className="text-[8px] font-bold text-orange-600 italic bg-orange-50 px-2 py-0.5 rounded border border-orange-200">REALTIME</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-0 bg-white no-scrollbar">
                <div className="font-mono text-[10px] leading-relaxed">
                  {gcodeLines.length > 0 ? gcodeLines.map((line, i) => (
                    <div
                      key={i}
                      className={`flex items-start px-5 py-1 border-b border-slate-50 ${
                        line.startsWith(';')
                          ? 'text-slate-300 italic'
                          : 'text-slate-500 hover:text-slate-700 transition-colors'
                      }`}
                    >
                      <span className="w-9 shrink-0 text-slate-300 text-[8px] font-bold select-none">
                        {(i + 1).toString().padStart(4, '0')}
                      </span>
                      <span className="font-bold tracking-tight">{line}</span>
                    </div>
                  )) : (
                    <div className="h-full flex items-center justify-center italic text-slate-300 uppercase tracking-widest text-center py-16 font-black opacity-30">
                      Buffer_Empty
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

        </main>
      )}
    </div>
  );
}
