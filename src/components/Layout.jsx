import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, Cpu, Settings, FileCode, BarChart3, Terminal as TerminalIcon, Sun, Moon, Zap, Box, LayoutGrid } from 'lucide-react';
import { useRakeezStore } from '../store/useRakeezStore';
import { translations } from '../engine/translations';
import { useShallow } from 'zustand/react/shallow';

const SidebarItem = ({ icon: Icon, label, active = false, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-4 rtl:space-x-reverse px-6 py-3.5 transition-all duration-200 relative group
      ${active 
        ? 'text-white bg-premium-blue/10 border-r-4 border-premium-blue' 
        : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
  >
    <Icon className={`w-5 h-5 transition-colors ${active ? 'text-premium-blue' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
    <span className="font-semibold text-sm tracking-tight">{label}</span>
  </button>
);

export const Layout = ({ children, activeTab, setActiveTab, systemStatus = 'online' }) => {
  const { 
    machineConfig, 
    systemMetrics, 
    getUptime, 
    language, 
    theme, 
    toggleLanguage, 
    toggleTheme,
    isSimulationMode,
    toggleSimulationMode,
    triggerHardwareEstop
  } = useRakeezStore(useShallow(state => ({
    machineConfig: state.machineConfig,
    systemMetrics: state.systemMetrics,
    getUptime: state.getUptime,
    language: state.language,
    theme: state.theme,
    toggleLanguage: state.toggleLanguage,
    toggleTheme: state.toggleTheme,
    isSimulationMode: state.isSimulationMode,
    toggleSimulationMode: state.toggleSimulationMode,
    triggerHardwareEstop: state.triggerHardwareEstop
  })));

  const [uptime, setUptime] = useState('0h 00m 00s');
  const t = (key) => translations[language][key] || key;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.lang = language;
  }, [theme, language]);

  useEffect(() => {
    const tick = setInterval(() => {
      setUptime(getUptime());
    }, 1000);
    return () => clearInterval(tick);
  }, [getUptime]);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-industrial-base text-zinc-100 overflow-x-hidden font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-full lg:w-64 flex-shrink-0 border-r border-industrial-border flex flex-col bg-industrial-surface z-20">
        <div className="p-6 border-b border-industrial-border flex items-center space-x-3 rtl:space-x-reverse">
          <div className="w-10 h-10 bg-premium-blue rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white mb-0">{t('title')}</h1>
            <p className="text-[10px] font-bold text-premium-blue uppercase tracking-widest opacity-80">OS V2 // PRO_KERNEL</p>
          </div>
        </div>

        <nav className="flex-1 py-6 overflow-y-auto custom-scrollbar">
          <div className="px-6 mb-4 label-caps">Control Center</div>
          <SidebarItem icon={BarChart3} label={t('navDashboard')} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={Cpu} label={t('navCommandCenter')} active={activeTab === 'commandcenter'} onClick={() => setActiveTab('commandcenter')} />
          <SidebarItem icon={Zap} label="Vision Studio" active={activeTab === 'vision'} onClick={() => setActiveTab('vision')} />
          <SidebarItem icon={FileCode} label={t('navGCodeEditor')} active={activeTab === 'gcode'} onClick={() => setActiveTab('gcode')} />
          <SidebarItem icon={Box} label={t('navAnalytics')} active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
          
          <div className="px-6 mt-8 mb-4 label-caps">Management</div>
          <SidebarItem icon={Settings} label={t('navSettings')} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          <SidebarItem icon={TerminalIcon} label="System Logs" active={activeTab === 'ailog'} onClick={() => setActiveTab('ailog')} />
        </nav>

        {/* Machine Status Summary */}
        <div className="p-4 border-t border-industrial-border bg-black/20">
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Sync Status</span>
              <span className="text-[11px] font-bold text-premium-blue uppercase">{systemMetrics.bufferStatus}</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
               <div className="h-full bg-premium-blue w-[75%]" />
            </div>
            <div className="flex items-center justify-between mt-4">
               <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Uptime</span>
               <span className="text-xs font-mono font-medium text-zinc-300">{uptime}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-zinc-950 overflow-y-auto">
        
        {/* Header */}
        <header className="h-20 border-b border-industrial-border flex items-center justify-between px-8 bg-zinc-900/40 backdrop-blur-md z-10">
          <div className="flex items-center space-x-10 rtl:space-x-reverse">
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className={`w-3 h-3 rounded-full ${systemStatus === 'online' ? 'bg-premium-blue animate-pulse' : 'bg-red-500'} shadow-[0_0_12px_rgba(59,130,246,0.3)]`} />
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-wide uppercase text-zinc-200">
                  {systemStatus === 'online' ? "System Ready" : "System Offline"}
                </span>
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">RAKEEZ_PYTHON_KERNEL_3.2</span>
              </div>
            </div>
            
            <div className="hidden xl:flex items-center space-x-8 rtl:space-x-reverse border-l border-industrial-border pl-8">
               <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">Latency</span>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-lg font-mono font-bold text-white">{systemMetrics.networkLatency || 8}</span>
                    <span className="text-[10px] text-premium-blue font-bold">MS</span>
                  </div>
               </div>
               <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">Core Load</span>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-lg font-mono font-bold text-white">{Math.round(systemMetrics.coreLoad) || 12}</span>
                    <span className="text-[10px] text-premium-blue font-bold">%</span>
                  </div>
               </div>
            </div>
          </div>

          <div className="flex items-center space-x-5 rtl:space-x-reverse">
              {/* Simulation Mode Toggle */}
              <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
                <button 
                  onClick={toggleSimulationMode}
                  className={`px-6 py-1.5 font-bold text-xs tracking-wide transition-all rounded-lg
                    ${isSimulationMode ? 'bg-premium-blue text-white shadow-lg shadow-blue-500/20' : 'text-zinc-600 hover:text-zinc-300'}`}
                >
                  SIMULATION
                </button>
                <button 
                  onClick={toggleSimulationMode}
                  className={`px-6 py-1.5 font-bold text-xs tracking-wide transition-all rounded-lg
                    ${!isSimulationMode ? 'bg-premium-orange text-white shadow-lg shadow-orange-500/20' : 'text-zinc-600 hover:text-zinc-300'}`}
                >
                  LIVE HARDWARE
                </button>
              </div>

              {/* Theme & Language */}
              <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
                <button onClick={toggleTheme} className="p-2 text-zinc-500 hover:text-white transition-colors">
                  {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>
                <div className="w-[1px] h-4 bg-zinc-800 mx-1" />
                <button onClick={toggleLanguage} className="px-4 py-1.5 font-bold text-xs text-zinc-500 hover:text-white">
                  {language.toUpperCase()}
                </button>
              </div>

             <button onClick={triggerHardwareEstop} className="industrial-btn-danger px-8">
                <ShieldAlert className="w-4 h-4 mr-2" />
                STOP
             </button>
          </div>
        </header>

        {/* Workspace */}
        <div className="flex-1 overflow-auto p-10 relative">
          {/* Subtle grid background */}
          <div className="absolute inset-0 bg-[radial-gradient(rgba(244,244,245,0.03)_1.5px,transparent_1.5px)] [background-size:48px_48px] pointer-events-none" />
          
          <div className="relative h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
