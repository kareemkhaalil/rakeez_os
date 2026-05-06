import React, { useState } from 'react';
import { Upload, FileText, Play, Square, Save, HardDrive, FileCode, Search, Trash2, FolderOpen } from 'lucide-react';
import { useRakeezStore } from '../store/useRakeezStore';

export const GCodeManager = () => {
  const [code, setCode] = useState(`G21 (Metric)
G90 (Absolute)
M3 S12000 (Spindle On)
G0 X0 Y0 Z10 (Rapid Height)
G1 X10 Y10 F500 (Linear Move)
G1 X10 Y50
G1 X50 Y50
G1 X50 Y10
G1 X10 Y10
G0 Z10
M5 (Spindle Off)
M30 (End of Program)`);

  const [activeLine, setActiveLine] = useState(4);
  const language = useRakeezStore(state => state.language);

  return (
    <div className="grid grid-cols-12 gap-8 h-full max-h-[800px]">
      
      {/* --- Workspace Explorer --- */}
      <div className="col-span-3 flex flex-col space-y-6">
        <div className="glass-panel p-6 flex flex-col flex-1 border-neon-primary/5">
          <div className="flex items-center justify-between border-b border-glass-border pb-4 mb-4">
             <div className="flex items-center space-x-2">
                <HardDrive className="w-4 h-4 text-neon-primary" />
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-industrial-gray-500">Local_Storage</span>
             </div>
             <button className="p-1.5 rounded-md hover:bg-neon-primary/10 transition-colors">
                <Search className="w-3.5 h-3.5 text-industrial-gray-600" />
             </button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
             {[
               { name: 'BKT-BASE-22.nc', size: '4.2 KB', active: false },
               { name: 'SIDE-PANEL-L.nc', size: '1.8 KB', active: false },
               { name: 'LOGO-ENGRAVE.gcode', size: '12.4 KB', active: true },
               { name: 'CAL-WEDGE-V2.nc', size: '8.3 KB', active: false }
             ].map((file) => (
                <div 
                   key={file.name} 
                   className={`p-3 rounded-xl border transition-all cursor-pointer group
                     ${file.active 
                        ? 'border-neon-primary/30 bg-neon-primary/5 text-neon-primary' 
                        : 'border-glass-border text-industrial-gray-500 hover:bg-white/5 hover:border-glass-border'}`}
                >
                   <div className="flex items-center space-x-3">
                      <FileCode className={`w-4 h-4 ${file.active ? 'text-neon-primary' : 'text-industrial-gray-700'}`} />
                      <div className="flex flex-col">
                         <span className="text-[11px] font-mono font-bold">{file.name}</span>
                         <span className="text-[8px] font-mono opacity-50 uppercase">{file.size}</span>
                      </div>
                   </div>
                </div>
             ))}
          </div>

          <div className="mt-6 p-6 border-2 border-dashed border-glass-border rounded-2xl flex flex-col items-center justify-center space-y-3 group cursor-pointer hover:border-neon-primary/20 transition-all">
             <div className="w-10 h-10 rounded-full bg-industrial-black flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-5 h-5 text-industrial-gray-700 group-hover:text-neon-primary" />
             </div>
             <span className="text-[9px] font-mono uppercase text-industrial-gray-700 font-black tracking-widest">Import_Job_File</span>
          </div>
        </div>
      </div>

      {/* --- High-End Code Editor --- */}
      <div className="col-span-9 flex flex-col">
        <div className="glass-panel flex flex-1 flex-col overflow-hidden border-neon-primary/5">
          {/* Editor Header */}
          <div className="px-6 py-4 border-b border-glass-border flex justify-between items-center bg-black/40">
             <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-3">
                   <div className="w-1.5 h-1.5 bg-neon-primary shadow-[0_0_8px_var(--color-neon-primary)]" />
                   <span className="text-[11px] font-mono font-black text-industrial-aluminum tracking-widest uppercase italic">LOGO-ENGRAVE.gcode</span>
                </div>
                <div className="flex items-center space-x-4 border-l border-glass-border pl-6">
                   <div className="flex flex-col">
                      <span className="text-[8px] text-industrial-gray-600 font-black uppercase">Lines</span>
                      <span className="text-xs font-mono font-bold text-industrial-gray-400">1,422</span>
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[8px] text-industrial-gray-600 font-black uppercase">Status</span>
                      <span className="text-[9px] font-mono font-bold text-neon-primary uppercase">Read_Ready</span>
                   </div>
                </div>
             </div>
             <div className="flex items-center space-x-3">
                <button className="industrial-btn-primary flex items-center space-x-2 !px-6">
                   <Play className="w-3.5 h-3.5" />
                   <span className="font-black text-[10px]">Launch_Job</span>
                </button>
                <button className="p-2.5 rounded-xl border border-glass-border text-industrial-gray-500 hover:text-industrial-aluminum hover:bg-white/5 transition-all">
                   <Save className="w-4 h-4" />
                </button>
                <button className="p-2.5 rounded-xl border border-neon-danger/20 text-neon-danger/60 hover:text-neon-danger hover:bg-neon-danger/5 transition-all">
                   <Trash2 className="w-4 h-4" />
                </button>
             </div>
          </div>

          {/* Code Viewer */}
          <div className="flex-1 overflow-auto bg-black/20 p-6 font-mono text-[12px] leading-relaxed custom-scrollbar">
             {code.split('\n').map((line, i) => (
                <div 
                  key={i} 
                  className={`flex space-x-6 py-0.5 transition-colors group cursor-pointer
                    ${i === activeLine ? 'bg-neon-primary/5 -mx-6 px-6 relative after:absolute after:left-0 after:top-0 after:bottom-0 after:w-1 after:bg-neon-primary' : ''}`}
                  onClick={() => setActiveLine(i)}
                >
                   <span className={`w-12 text-right select-none opacity-30 group-hover:opacity-100 transition-opacity ${i === activeLine ? 'text-neon-primary opacity-100' : 'text-industrial-gray-500'}`}>
                      {(i + 1).toString().padStart(4, '0')}
                   </span>
                   <span className={`flex-1 transition-all ${
                     i === activeLine 
                      ? 'text-neon-primary font-bold translate-x-1' 
                      : line.includes('G0') || line.includes('G1') 
                        ? 'text-industrial-aluminum' 
                        : 'text-neon-warning/80 shadow-[0_0_20px_rgba(255,176,20,0.1)]'
                   }`}>
                      {line}
                   </span>
                </div>
             ))}
          </div>

          {/* Editor Footer */}
          <div className="px-6 py-3 border-t border-glass-border bg-black/60 flex justify-between">
             <div className="flex items-center space-x-6">
                <span className="text-[9px] font-mono text-industrial-gray-600 font-bold uppercase tracking-widest">UTF-8 // CNC_GRBL_PROTO</span>
                <div className="flex items-center space-x-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-neon-primary opacity-40" />
                   <span className="text-[9px] font-mono text-industrial-gray-600 font-bold uppercase tracking-widest">Syntax_Linked</span>
                </div>
             </div>
             <span className="text-[10px] font-mono font-bold text-industrial-gray-400 uppercase tracking-tighter">Line {activeLine + 1} : Block {Math.floor(activeLine/10)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
