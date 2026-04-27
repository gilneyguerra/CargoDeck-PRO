import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCargoStore } from '@/features/cargoStore';
import { X, Layout, Maximize2, MoveVertical, GitCommitVertical } from 'lucide-react';

export function DeckSettingsModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { locations, activeLocationId, updateActiveLocationConfig } = useCargoStore();
  const activeLocation = locations.find(l => l.id === activeLocationId);

  const [length, setLength] = useState<number | string>(0);
  const [width, setWidth] = useState<number | string>(0);
  const [baysCount, setBaysCount] = useState<number | string>(0);
  const [bayLength, setBayLength] = useState<number | string>(0);
  const [elevationMeters, setElevationMeters] = useState<number | string>(30);
  const [portWidth, setPortWidth] = useState<number | string>(5);
  const [centerWidth, setCenterWidth] = useState<number | string>(5);
  const [starboardWidth, setStarboardWidth] = useState<number | string>(5);

  useEffect(() => {
    if (activeLocation) {
      setLength(activeLocation.config.lengthMeters);
      setWidth(activeLocation.config.widthMeters || 15);
      setBaysCount(activeLocation.config.numberOfBays);
      const defaultLength = activeLocation.config.lengthMeters / (activeLocation.config.numberOfBays || 1);
      setBayLength(activeLocation.config.bayLengthMeters !== undefined ? activeLocation.config.bayLengthMeters : defaultLength);
      setElevationMeters(activeLocation.config.elevationMeters !== undefined ? activeLocation.config.elevationMeters : 30);
      setPortWidth(activeLocation.config.portWidthMeters || 5);
      setCenterWidth(activeLocation.config.centerWidthMeters || 5);
      setStarboardWidth(activeLocation.config.starboardWidthMeters || 5);
    }
  }, [activeLocation, isOpen]);

  if (!isOpen || !activeLocation) return null;

  const handleSave = () => {
    const tL = Number(length); const tW = Number(width); const sumW = Number(portWidth) + Number(centerWidth) + Number(starboardWidth); const sumL = Number(bayLength) * Number(baysCount);
    if (sumW > tW) { alert(`Erro dimensional: A soma das larguras (${sumW}m) excede a Largura Total (${tW}m).`); return; }
    if (sumL > tL) { alert(`Erro dimensional: O comprimento das baias (${sumL}m) excede o Comprimento Total (${tL}m).`); return; }
    const newBaysCount = Number(baysCount);
    if (newBaysCount !== activeLocation.config.numberOfBays) {
      const totalAllocated = activeLocation.bays.reduce((acc, bay) => acc + bay.allocatedCargoes.length, 0);
      if (totalAllocated > 0) { if (!window.confirm(`Atenção: A mudança de baias retornará ${totalAllocated} cargas ao estoque. Continuar?`)) return; }
    }
    updateActiveLocationConfig({ lengthMeters: tL, widthMeters: tW, numberOfBays: newBaysCount, bayLengthMeters: Number(bayLength), elevationMeters: Number(elevationMeters), portWidthMeters: Number(portWidth), centerWidthMeters: Number(centerWidth), starboardWidthMeters: Number(starboardWidth) });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans">
      <div className="bg-header border-2 border-subtle rounded-[2.5rem] w-full max-w-xl shadow-high relative flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 glass">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 via-brand-primary to-emerald-500 z-50 shadow-glow shadow-brand-primary/10" />
        
        {/* Header Section */}
        <div className="px-10 pt-10 pb-8 border-b border-subtle shrink-0">
            <button onClick={onClose} className="absolute top-7 right-10 text-primary hover:text-emerald-500 p-2 hover:bg-main rounded-full transition-all">
                <X className="w-7 h-7" />
            </button>
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-black text-primary tracking-tighter uppercase leading-none">{activeLocation.name}</h2>
                <p className="text-[10px] font-black text-secondary uppercase tracking-[0.4em] opacity-90">Deck Architecture & Spatial Scaling</p>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-10">
            <div className="space-y-10">
                {/* Master Dimensions */}
                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest ml-1">
                            <MoveVertical size={14} className="text-emerald-500" /> Total Length (m)
                        </label>
                        <div className="relative">
                            <input type="number" value={length} onChange={e => setLength(e.target.value)} className="w-full bg-main border-2 border-strong/40 rounded-2xl px-6 py-4.5 text-sm font-mono font-black text-primary outline-none focus:border-emerald-500 transition-all shadow-inner" />
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[9px] font-black text-secondary/40 uppercase tracking-widest">Y-Axis</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest ml-1">
                             <Maximize2 size={14} className="text-emerald-500" /> Total Width (m)
                        </label>
                        <div className="relative">
                            <input type="number" value={width} onChange={e => setWidth(e.target.value)} className="w-full bg-main border-2 border-strong/40 rounded-2xl px-6 py-4.5 text-sm font-mono font-black text-primary outline-none focus:border-emerald-500 transition-all shadow-inner" />
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[9px] font-black text-secondary/40 uppercase tracking-widest">X-Axis</span>
                        </div>
                    </div>
                </div>

                {/* Elevation Hub */}
                <div className="bg-main/50 p-8 rounded-[2rem] border-2 border-subtle shadow-inner space-y-4">
                    <label className="flex items-center gap-2 text-[11px] font-black text-primary uppercase tracking-widest border-b border-subtle pb-3">
                       <GitCommitVertical size={16} className="text-emerald-500" /> Deck Z-Elevation Datum
                    </label>
                    <input type="number" step="0.1" value={elevationMeters} onChange={e => setElevationMeters(e.target.value)} className="w-full bg-header border-2 border-subtle rounded-xl px-6 py-4 text-sm font-black text-primary outline-none focus:border-emerald-500 transition-all shadow-low" />
                    <p className="text-[9px] font-black text-secondary uppercase opacity-70 tracking-widest leading-relaxed">Safety Reference: Mandatory altitude datum for Center of Gravity stability protocols.</p>
                </div>

                {/* Transversal Zones */}
                <div className="space-y-4">
                    <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest ml-1">
                        <Layout size={14} className="text-emerald-500" /> Transversal Zone Architecture
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col gap-2">
                            <span className="text-[9px] font-black text-secondary text-center uppercase tracking-[0.2em] opacity-80">Port</span>
                            <input type="number" step="0.1" value={portWidth} onChange={e => setPortWidth(e.target.value)} className="w-full bg-header border-2 border-subtle text-center rounded-2xl py-4 text-sm font-mono font-black text-primary outline-none focus:border-emerald-500 shadow-low" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <span className="text-[9px] font-black text-secondary text-center uppercase tracking-[0.2em] opacity-80">Center</span>
                            <input type="number" step="0.1" value={centerWidth} onChange={e => setCenterWidth(e.target.value)} className="w-full bg-header border-2 border-subtle text-center rounded-2xl py-4 text-sm font-mono font-black text-primary outline-none focus:border-emerald-500 shadow-low" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <span className="text-[9px] font-black text-secondary text-center uppercase tracking-[0.2em] opacity-80">Stbd</span>
                            <input type="number" step="0.1" value={starboardWidth} onChange={e => setStarboardWidth(e.target.value)} className="w-full bg-header border-2 border-subtle text-center rounded-2xl py-4 text-sm font-mono font-black text-primary outline-none focus:border-emerald-500 shadow-low" />
                        </div>
                    </div>
                </div>

                {/* Bay Geometry */}
                <div className="grid grid-cols-2 gap-8 pt-4">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Grid Bay Count</label>
                        <input type="number" value={baysCount} onChange={e => setBaysCount(e.target.value)} className="w-full bg-main border-2 border-strong/40 rounded-2xl px-6 py-4.5 text-sm font-black text-primary outline-none focus:border-emerald-500 shadow-inner" />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Modal Bay Pitch (m)</label>
                        <input type="number" value={bayLength} onChange={e => setBayLength(e.target.value)} className="w-full bg-main border-2 border-strong/40 rounded-2xl px-6 py-4.5 text-sm font-black text-primary outline-none focus:border-emerald-500 shadow-inner" />
                    </div>
                </div>
            </div>
        </div>

        {/* Footer Section */}
        <div className="px-10 py-10 border-t border-subtle bg-sidebar shrink-0 flex items-center justify-between gap-8">
            <button
                type="button" onClick={onClose}
                className="text-xs font-black text-secondary hover:text-primary uppercase tracking-[0.25em] transition-colors"
            >
                Discard Edits
            </button>
            <button
                onClick={handleSave}
                className="flex-1 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white py-5 rounded-2xl text-xs font-black uppercase tracking-[0.25em] shadow-xl shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-4"
            >
                Synchronize Architecture
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
