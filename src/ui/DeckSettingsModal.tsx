import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCargoStore } from '@/features/cargoStore';
import { X, Layout, Maximize2, MoveVertical, GitCommitVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    const tL = Number(length);
    const tW = Number(width);
    const sumW = Number(portWidth) + Number(centerWidth) + Number(starboardWidth);
    const sumL = Number(bayLength) * Number(baysCount);

    if (sumW > tW) {
      alert(`Erro dimensional: A soma das larguras das posições (${sumW}m) excede a Largura Total do deck (${tW}m).`);
      return;
    }
    if (sumL > tL) {
      alert(`Erro dimensional: O comprimento das baias somadas (${sumL}m) excede o Comprimento Total (${tL}m).`);
      return;
    }

    const newBaysCount = Number(baysCount);
    if (newBaysCount !== activeLocation.config.numberOfBays) {
      const totalAllocated = activeLocation.bays.reduce((acc, bay) => acc + bay.allocatedCargoes.length, 0);
      if (totalAllocated > 0) {
        if (!window.confirm(`Atenção: Alterar o número de baias retornará ${totalAllocated} carga(s) para o inventário. Continuar?`)) return;
      }
    }

    updateActiveLocationConfig({
      lengthMeters: tL,
      widthMeters: tW,
      numberOfBays: newBaysCount,
      bayLengthMeters: Number(bayLength),
      elevationMeters: Number(elevationMeters),
      portWidthMeters: Number(portWidth),
      centerWidthMeters: Number(centerWidth),
      starboardWidthMeters: Number(starboardWidth)
    });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans">
      <div className="bg-header border border-subtle rounded-[2.5rem] w-full max-w-xl shadow-high relative flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 glass">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 via-brand-primary to-emerald-500 z-50" />
        
        {/* Header Section (Fixed) */}
        <div className="px-8 pt-8 pb-6 border-b border-subtle shrink-0">
            <button onClick={onClose} className="absolute top-7 right-8 text-muted hover:text-primary p-2 hover:bg-main rounded-full transition-all">
                <X className="w-6 h-6" />
            </button>
            <div className="flex flex-col gap-1.5">
                <h2 className="text-2xl font-black text-primary tracking-tighter uppercase leading-none">{activeLocation.name}</h2>
                <p className="text-[9px] font-black text-muted uppercase tracking-[0.4em] opacity-80">Deck Architecture & Spatial Scaling</p>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-8">
            <div className="space-y-8">
                {/* Master Dimensions */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[9px] font-black text-muted uppercase tracking-widest ml-1">
                            <MoveVertical size={10} className="text-emerald-500" /> Total Length (m)
                        </label>
                        <div className="relative">
                            <input type="number" value={length} onChange={e => setLength(e.target.value)} className="w-full bg-main border-2 border-subtle rounded-xl px-5 py-3.5 text-xs font-mono font-bold text-primary outline-none focus:border-emerald-500 transition-all shadow-inner" />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted/30 uppercase">Y-Axis</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[9px] font-black text-muted uppercase tracking-widest ml-1">
                             <Maximize2 size={10} className="text-emerald-500" /> Total Width (m)
                        </label>
                        <div className="relative">
                            <input type="number" value={width} onChange={e => setWidth(e.target.value)} className="w-full bg-main border-2 border-subtle rounded-xl px-5 py-3.5 text-xs font-mono font-bold text-primary outline-none focus:border-emerald-500 transition-all shadow-inner" />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted/30 uppercase">X-Axis</span>
                        </div>
                    </div>
                </div>

                {/* Elevation Tracking */}
                <div className="bg-main/30 p-5 rounded-2xl border border-subtle shadow-inner space-y-3">
                    <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
                       <GitCommitVertical size={12} className="text-emerald-500" /> Deck Z-Elevation
                    </label>
                    <input type="number" step="0.1" value={elevationMeters} onChange={e => setElevationMeters(e.target.value)} className="w-full bg-main border-2 border-subtle rounded-xl px-5 py-3 text-xs font-bold text-primary outline-none focus:border-emerald-500 transition-all" />
                    <p className="text-[9px] font-bold text-muted uppercase opacity-60 tracking-tighter">Reference altitude for Center of Gravity stability analysis.</p>
                </div>

                {/* Transversal Zones */}
                <div className="space-y-3">
                    <label className="flex items-center gap-2 text-[10px] font-black text-muted uppercase tracking-widest ml-1">
                        <Layout size={10} className="text-emerald-500" /> Transversal Zone Widths
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[8px] font-black text-muted text-center uppercase tracking-tighter">Port</span>
                            <input type="number" step="0.1" value={portWidth} onChange={e => setPortWidth(e.target.value)} className="w-full bg-header border border-subtle text-center rounded-xl py-2.5 text-xs font-mono font-bold text-primary outline-none focus:border-emerald-500" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[8px] font-black text-muted text-center uppercase tracking-tighter">Center</span>
                            <input type="number" step="0.1" value={centerWidth} onChange={e => setCenterWidth(e.target.value)} className="w-full bg-header border border-subtle text-center rounded-xl py-2.5 text-xs font-mono font-bold text-primary outline-none focus:border-emerald-500" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[8px] font-black text-muted text-center uppercase tracking-tighter">Stbd</span>
                            <input type="number" step="0.1" value={starboardWidth} onChange={e => setStarboardWidth(e.target.value)} className="w-full bg-header border border-subtle text-center rounded-xl py-2.5 text-xs font-mono font-bold text-primary outline-none focus:border-emerald-500" />
                        </div>
                    </div>
                </div>

                {/* Bay Geometry */}
                <div className="grid grid-cols-2 gap-8 pt-4">
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-muted uppercase tracking-widest ml-1">Logical Bay Count</label>
                        <input type="number" value={baysCount} onChange={e => setBaysCount(e.target.value)} className="w-full bg-main border-2 border-subtle rounded-xl px-5 py-3 text-xs font-bold text-primary outline-none focus:border-emerald-500" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-muted uppercase tracking-widest ml-1">Bay Pitch (m)</label>
                        <input type="number" value={bayLength} onChange={e => setBayLength(e.target.value)} className="w-full bg-main border-2 border-subtle rounded-xl px-5 py-3 text-xs font-bold text-primary outline-none focus:border-emerald-500" />
                    </div>
                </div>
            </div>
        </div>

        {/* Footer Section (Fixed) */}
        <div className="p-8 border-t border-subtle bg-sidebar/20 shrink-0 flex items-center justify-between gap-6">
            <button
                type="button" onClick={onClose}
                className="text-[10px] font-black text-muted hover:text-primary uppercase tracking-[0.2em] transition-colors"
            >
                Discard
            </button>
            <button
                onClick={handleSave}
                className="flex-1 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/10 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
                Synchronize Configuration
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
