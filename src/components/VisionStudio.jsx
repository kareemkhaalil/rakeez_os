import React, { useState, useRef, useCallback, useEffect } from 'react';
import { UploadCloud, Layers, Crosshair, Zap, Loader2, Sparkles, SlidersHorizontal, Ruler, CircleDot, Image as ImageIcon } from 'lucide-react';
import { useRakeezStore } from '../store/useRakeezStore';
import { VisionToCAM } from '../engine/VisionToCAM';

/**
 * RAKEEZ OS V3 — Vision Studio
 * Professional Image Tracing & Scaling Dashboard.
 * Pure client-side: Image → Edge → Vector → TRC → G-code.
 */
export const VisionStudio = () => {
  // ─── File / Image State ───
  const [file, setFile]               = useState(null);
  const [imageEl, setImageEl]         = useState(null);
  const [previewSize, setPreviewSize] = useState({ w: 0, h: 0 });

  // ─── Physical Dimensions ───
  const [targetWidth, setTargetWidth]   = useState(100);
  const [targetHeight, setTargetHeight] = useState(100);
  const [targetDepth, setTargetDepth]   = useState(5);
  const [toolDiameter, setToolDiameter] = useState(6);

  // ─── Vision Controls ───
  const [threshold, setThreshold]   = useState(120);
  const [simplify, setSimplify]     = useState(3);
  const [operation, setOperation]   = useState('PROFILE'); // PROFILE | POCKET

  // ─── Processing State ───
  const [isProcessing, setIsProcessing] = useState(false);
  const [contourCount, setContourCount] = useState(null);
  const [pointCount, setPointCount]     = useState(null);

  // ─── Refs ───
  const fileInputRef  = useRef(null);
  const overlayRef    = useRef(null);

  // ─── Store ───
  const addLog         = useRakeezStore(s => s.addLog);
  const setGCode       = useRakeezStore(s => s.setGCode);
  const setPlannedPath = useRakeezStore(s => s.setPlannedPath);

  // ──────────────────────────────────────────────────────
  //  File Handling
  // ──────────────────────────────────────────────────────
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) setupFile(e.dataTransfer.files[0]);
  }, []);

  const setupFile = (f) => {
    setFile(f);
    setContourCount(null);
    setPointCount(null);

    const img = new Image();
    img.src = URL.createObjectURL(f);
    img.onload = () => {
      setPreviewSize({ w: img.width, h: img.height });
      setImageEl(img);

      // Auto-set aspect-correct targetHeight
      const aspect = img.height / img.width;
      setTargetHeight(Math.round(targetWidth * aspect));
    };
  };

  // ──────────────────────────────────────────────────────
  //  EXECUTE PIPELINE
  // ──────────────────────────────────────────────────────
  const executeVision = async () => {
    if (!imageEl) return;
    setIsProcessing(true);
    addLog({ type: 'info', msg: '[VISION] Initializing client-side extraction...' });

    try {
      const result = VisionToCAM.process(imageEl, {
        targetWidth:  parseFloat(targetWidth),
        targetHeight: parseFloat(targetHeight),
        depth:        parseFloat(targetDepth),
        toolDiameter: parseFloat(toolDiameter),
        threshold:    parseInt(threshold),
        simplify:     parseFloat(simplify),
        operation,
      });

      setContourCount(result.contours.length);
      setPointCount(result.path.length);

      // Render overlay on canvas
      if (overlayRef.current && imageEl) {
        VisionToCAM.renderOverlay(
          overlayRef.current,
          imageEl,
          result.contours,
          parseFloat(targetWidth),
          parseFloat(targetHeight),
        );
      }

      // Push to store
      setGCode(result.gcode);
      setPlannedPath(result.path);

      addLog({
        type: 'success',
        msg: `[VISION] Extracted ${result.contours.length} contours → ${result.path.length} NC points. G-code ready.`,
      });
    } catch (err) {
      addLog({ type: 'error', msg: `[VISION ERROR] ${err.message}` });
      console.error(err);
    }

    setIsProcessing(false);
  };

  // ──────────────────────────────────────────────────────
  //  RENDER
  // ──────────────────────────────────────────────────────
  return (
    <div className="h-full flex gap-6">
      {/* ─── LEFT: IMAGE WORKSPACE ─── */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center">
            <ImageIcon className="w-5 h-5 text-blue-600 mr-3" />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Vision CAM Studio</h2>
          </div>
          {contourCount !== null && (
            <div className="flex items-center space-x-4">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                {contourCount} Contours
              </span>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                {pointCount} NC Points
              </span>
            </div>
          )}
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex items-center justify-center p-8 relative">
          {file ? (
            <div className="relative max-w-full max-h-full">
              <canvas
                ref={overlayRef}
                width={previewSize.w > 512 ? 512 : previewSize.w}
                height={previewSize.h > 512 ? 512 : previewSize.h}
                className="rounded-2xl shadow-2xl border border-slate-200"
                style={{ maxWidth: '100%', maxHeight: '100%' }}
              />
              {/* Draw source image initially */}
              <ImageLoader canvas={overlayRef} image={imageEl} />
            </div>
          ) : (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-lg aspect-square border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center cursor-pointer group hover:border-blue-400 hover:bg-blue-50/30 transition-all"
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => setupFile(e.target.files[0])}
              />
              <UploadCloud className="w-20 h-20 text-slate-300 mb-6 group-hover:text-blue-400 transition-colors" />
              <p className="text-lg font-bold text-slate-400 tracking-tight group-hover:text-slate-600">
                Drop target image here
              </p>
              <p className="text-sm text-slate-300 mt-2 font-medium">
                PNG / JPG / SVG — Flowers, Logos, Patterns
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT: CONTROLS PANEL ─── */}
      <div className="w-[380px] flex flex-col gap-6 min-h-0">

        {/* PHYSICAL DIMENSIONS */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 shrink-0">
          <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-5 flex items-center">
            <Ruler className="w-4 h-4 mr-2" /> Physical Dimensions
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Width (mm)" value={targetWidth} onChange={setTargetWidth} />
            <InputField label="Height (mm)" value={targetHeight} onChange={setTargetHeight} />
            <InputField label="Depth (mm)" value={targetDepth} onChange={setTargetDepth} />
            <InputField label="Tool Ø (mm)" value={toolDiameter} onChange={setToolDiameter} />
          </div>
        </div>

        {/* VISION CONTROLS */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 shrink-0">
          <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-5 flex items-center">
            <SlidersHorizontal className="w-4 h-4 mr-2" /> Vision Parameters
          </h3>
          <div className="space-y-5">
            <SliderField
              label="Edge Threshold"
              value={threshold}
              onChange={setThreshold}
              min={20} max={250} step={1}
              unit=""
            />
            <SliderField
              label="Simplification"
              value={simplify}
              onChange={setSimplify}
              min={0.5} max={10} step={0.5}
              unit="px"
            />

            {/* Operation Toggle */}
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                Cut Mode
              </label>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                {['PROFILE', 'POCKET'].map(m => (
                  <button
                    key={m}
                    onClick={() => setOperation(m)}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                      operation === m
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* FILE INFO */}
        {file && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 shrink-0">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center">
              <CircleDot className="w-4 h-4 mr-2" /> Source File
            </h3>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-slate-900 truncate">{file.name}</span>
                <span className="text-[10px] font-mono text-slate-400">{previewSize.w}×{previewSize.h} px</span>
              </div>
              <button
                onClick={() => { setFile(null); setImageEl(null); setContourCount(null); }}
                className="ml-auto text-[9px] font-black text-red-500 uppercase tracking-widest hover:text-red-700"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* SPACER */}
        <div className="flex-1" />

        {/* EXECUTE BUTTON */}
        <button
          onClick={executeVision}
          disabled={isProcessing || !imageEl}
          className="industrial-btn-primary w-full !p-5 !text-base !rounded-2xl shadow-2xl active:scale-95 transition-all disabled:opacity-30 shrink-0"
        >
          {isProcessing ? (
            <Loader2 className="animate-spin w-6 h-6" />
          ) : (
            <>
              <Zap className="w-5 h-5 mr-2 fill-current" />
              Compile Vision → G-Code
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────
//  Sub-components
// ──────────────────────────────────────────────────────
const InputField = ({ label, value, onChange }) => (
  <div className="space-y-1.5">
    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-sm text-slate-900 font-bold focus:border-blue-600 focus:ring-0 outline-none transition-all"
    />
  </div>
);

const SliderField = ({ label, value, onChange, min, max, step, unit }) => (
  <div>
    <div className="flex justify-between mb-2">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <span className="text-[10px] font-black text-slate-600 font-mono">{value}{unit}</span>
    </div>
    <input
      type="range"
      min={min} max={max} step={step}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full accent-blue-600"
    />
  </div>
);

/** Utility: Draw source image on canvas once loaded */
const ImageLoader = ({ canvas, image }) => {
  useEffect(() => {
    if (canvas.current && image) {
      const ctx = canvas.current.getContext('2d');
      ctx.clearRect(0, 0, canvas.current.width, canvas.current.height);
      ctx.drawImage(image, 0, 0, canvas.current.width, canvas.current.height);
    }
  }, [canvas, image]);
  return null;
};
