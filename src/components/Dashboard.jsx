import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Thermometer, Zap, RotateCcw, Crosshair, ChevronRight, Activity, Cpu, ShieldAlert, Gauge, Monitor } from 'lucide-react';
import { useRakeezStore } from '../store/useRakeezStore';
import { translations } from '../engine/translations';

export const TelemetryCard = ({ title, value, unit, icon: Icon, status = 'neutral' }) => {
  const isAlert = status === 'alert';
  const isWarning = status === 'warning';
  
  return (
    <div className={`interactive-card p-6 flex flex-col justify-between
      ${isAlert ? 'border-red-500/30' : isWarning ? 'border-orange-500/30' : 'border-zinc-800'}`}>
      
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <span className="label-caps !text-zinc-500 mb-1">{title}</span>
          <div className="flex items-center space-x-2">
             <div className={`w-2 h-2 rounded-full ${isAlert ? 'bg-red-500 animate-pulse' : isWarning ? 'bg-orange-500' : 'bg-premium-blue'}`} />
             <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{status}</span>
          </div>
        </div>
        <Icon className={`w-5 h-5 ${isAlert ? 'text-red-500' : isWarning ? 'text-orange-500' : 'text-zinc-600'}`} />
      </div>

      <div className="mt-8 flex items-baseline">
        <span className={`text-4xl font-mono font-bold tracking-tight text-white ${isAlert ? 'text-red-500' : ''}`}>
          {typeof value === 'number' ? value.toLocaleString() : (value || '0')}
        </span>
        <span className="text-xs font-bold text-zinc-500 ml-2 uppercase">{unit}</span>
      </div>
    </div>
  );
};

export const Dashboard = ({ telemetry }) => {
  const language = useRakeezStore(state => state.language);
  const t = (key) => translations[language][key] || key;

  return (
    <div className="space-y-10">
      {/* Real-time Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <TelemetryCard 
          title="Spindle Speed" 
          value={telemetry.spindle.rpm} 
          unit="RPM" 
          icon={RotateCcw} 
          status={telemetry.spindle.rpm > 18000 ? 'warning' : 'neutral'}
        />
        <TelemetryCard 
          title="Cut Feed Rate" 
          value={telemetry.feedRate} 
          unit="mm/min" 
          icon={Zap} 
          status="running"
        />
        <TelemetryCard 
          title="Component Temp" 
          value={telemetry.spindle.temp} 
          unit="°C" 
          icon={Thermometer} 
          status={telemetry.spindle.temp > 45 ? 'alert' : telemetry.spindle.temp > 38 ? 'warning' : 'neutral'}
        />
        <TelemetryCard 
          title="Active Motor Load" 
          value={telemetry.spindle.load} 
          unit="%" 
          icon={Activity} 
          status={telemetry.spindle.load > 85 ? 'alert' : 'neutral'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Radar Map / Visualizer */}
        <div className="lg:col-span-2 flex flex-col space-y-6">
           <div className="flex items-center justify-between border-b border-zinc-900 pb-5">
              <div className="flex items-center">
                 <Monitor className="w-5 h-5 text-premium-blue mr-3" />
                 <h2 className="text-xl font-bold text-white tracking-tight">Kinematic Tracking</h2>
              </div>
              <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                 <span className="px-4 py-1 text-[10px] font-bold text-premium-blue uppercase tracking-widest bg-zinc-900 rounded-md shadow-inner">2D Top-View</span>
              </div>
           </div>
           <GCodeVisualizer coords={telemetry.coords} />
        </div>
        
        {/* Information Panel */}
        <div className="space-y-8 flex flex-col">
           <div className="glass-panel p-8 space-y-8">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-5">
                 <h2 className="label-caps text-zinc-400">Machine Specifications</h2>
                 <span className="text-[10px] font-bold text-white bg-zinc-800 px-3 py-1 rounded-lg border border-zinc-700">MILL_3.0_PRO</span>
              </div>
              <div className="grid grid-cols-2 gap-8">
                 {[
                   { label: 'Spindle Peak', val: '2.2KW @ 24K' },
                   { label: 'Env Range', val: '1000x1000x150' },
                   { label: 'Resolution', val: '0.0001 mm' },
                   { label: 'Logic', val: 'Python Realtime' }
                 ].map(spec => (
                   <div key={spec.label} className="flex flex-col">
                      <span className="text-[10px] font-bold text-zinc-600 uppercase mb-1">{spec.label}</span>
                      <span className="text-sm font-semibold text-zinc-200">{spec.val}</span>
                   </div>
                 ))}
              </div>
           </div>

           <div className="flex-1 min-h-[400px] flex flex-col bg-zinc-950 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-zinc-900 bg-zinc-900/10 flex items-center">
                 <Activity className="w-4 h-4 text-premium-blue mr-3" />
                 <h2 className="label-caps !text-zinc-500">Telemetry Stream</h2>
              </div>
              <AITerminal logs={telemetry.logs || []} />
           </div>
        </div>
      </div>
    </div>
  );
};

export const AITerminal = ({ logs }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-4 font-mono text-xs bg-zinc-950 custom-scrollbar" ref={scrollRef}>
      <AnimatePresence mode="popLayout">
        {logs.map((log) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start group"
          >
            <span className="text-zinc-700 font-bold mr-4 shrink-0">[{log.time}]</span>
            <span className={`leading-relaxed tracking-tight ${
              log.type === 'error' ? 'text-red-400 font-bold' : 
              log.type === 'warning' ? 'text-orange-400' : 
              log.type === 'success' ? 'text-blue-400 font-bold' : 'text-zinc-400'
            }`}>
              {log.msg}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export const GCodeVisualizer = ({ coords }) => {
  const { machineConfig } = useRakeezStore();
  const offsetX = machineConfig.xRange[1] / 2;
  const offsetY = machineConfig.yRange[1] / 2;
  const scale = 0.4;

  return (
    <div className="flex-1 relative min-h-[500px] rounded-3xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-inner">
      {/* Precision Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1.5px,transparent_1.5px)] [background-size:48px_48px] pointer-events-none" />
      
      {/* Crosshairs Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
         <div className="w-[85%] h-[85%] border border-white/50 rounded-full" />
         <div className="w-[60%] h-[60%] border border-white/30 rounded-full" />
         <div className="w-[30%] h-[30%] border border-white/10 rounded-full" />
         <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/10" />
         <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white/10" />
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div 
           animate={{ x: (coords.actual.x - offsetX) * scale, y: (coords.actual.y - offsetY) * scale }}
           className="relative"
        >
          {/* Active Target Indicator */}
          <div className="absolute -top-[1000px] left-0 w-px h-[2000px] bg-premium-blue/40" />
          <div className="absolute top-0 -left-[1000px] w-[2000px] h-px bg-premium-blue/40" />
          
          <div className="w-12 h-12 border-2 border-premium-blue flex items-center justify-center bg-premium-blue/10 rounded-full shadow-2xl shadow-blue-500/20">
             <div className="w-2.5 h-2.5 bg-premium-blue rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
          </div>
          
          <div className="absolute top-10 left-10 p-4 bg-zinc-950/90 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl min-w-[160px] animate-in fade-in slide-in-from-left-4 duration-500">
             <div className="label-caps !text-zinc-600 mb-3 block">Live Coordinates</div>
             <div className="space-y-3 font-mono">
                <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                   <span className="text-zinc-500 text-[10px] font-bold">X</span>
                   <span className="text-lg font-bold text-white tracking-tight">{coords.actual.x.toFixed(3)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                   <span className="text-zinc-500 text-[10px] font-bold">Y</span>
                   <span className="text-lg font-bold text-white tracking-tight">{coords.actual.y.toFixed(3)}</span>
                </div>
             </div>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-6 right-8 flex space-x-6">
         <div className="flex items-center">
            <div className="w-2.5 h-2.5 bg-premium-blue rounded-full mr-2" />
            <span className="label-caps !text-zinc-500">Active Position</span>
         </div>
         <div className="flex items-center">
            <div className="w-2.5 h-2.5 border border-zinc-700 rounded-full mr-2" />
            <span className="label-caps !text-zinc-500">Safe Boundary</span>
         </div>
      </div>
    </div>
  );
};
