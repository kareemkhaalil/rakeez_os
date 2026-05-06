import React, { useState, useEffect } from 'react';
import { useRakeezStore } from '../store/useRakeezStore';
import { MainController } from '../engine/MainController';

/**
 * RAKEEZ OS V3 - Cognitive Commander
 * Focused AI Input & System Information Engine.
 */
export const CommandCenter = () => {
    const [thought, setThought] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const systemLogs = useRakeezStore(state => state.systemLogs);

    const handleExecute = async () => {
        if (!thought.trim() || isThinking) return;
        setIsThinking(true);
        try {
            await MainController.processRawText(thought);
            setThought('');
        } catch (e) {
            console.error(e);
        }
        setIsThinking(false);
    };

    return (
        <div className="flex flex-col h-full gap-6">
            
            {/* AI Reasoning Input */}
            <div className="relative group shrink-0">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-blue-400 rounded-3xl blur opacity-0 group-focus-within:opacity-10 transition-opacity" />
                <textarea 
                    value={thought}
                    onChange={(e) => setThought(e.target.value)}
                    placeholder="Describe your machining intent..."
                    className="relative w-full h-48 bg-slate-50 border border-slate-200 rounded-2xl p-6 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-0 outline-none transition-all resize-none shadow-inner"
                />
                <button 
                  onClick={handleExecute}
                  disabled={isThinking || !thought.trim()}
                  className="industrial-btn-primary absolute bottom-4 right-4 shadow-xl"
                >
                    {isThinking ? 'Processing...' : 'Sync Intelligence'}
                </button>
            </div>

            {/* Industrial Event Stream */}
            <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-2xl border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Process_Log_Stream</span>
                    <div className="flex space-x-1">
                        <div className="w-1 h-1 rounded-full bg-slate-300" />
                        <div className="w-1 h-1 rounded-full bg-slate-300" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
                    {systemLogs.map((log, i) => (
                        <div key={log.id || i} className="flex space-x-4 text-[10px] items-start">
                            <span className="text-slate-300 font-mono flex-shrink-0 mt-0.5">[{log.time}]</span>
                            <div className="flex flex-col">
                                <span className={`font-black tracking-[0.05em] uppercase mb-0.5 ${
                                    log.type === 'error' ? 'text-red-500' : 
                                    log.type === 'success' ? 'text-emerald-500' : 
                                    log.type === 'warning' ? 'text-orange-500' : 'text-blue-600'
                                }`}>
                                    {log.type}
                                </span>
                                <span className="text-slate-600 font-bold leading-relaxed">{log.msg}</span>
                            </div>
                        </div>
                    ))}
                    {systemLogs.length === 0 && (
                        <div className="h-full flex items-center justify-center text-slate-300 italic tracking-widest font-black uppercase opacity-20">
                           System Telemetry Clear.
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};
