import { useState, useEffect } from 'react';
/* eslint-disable react-hooks/set-state-in-effect */
import { useCargoStore } from '@/features/cargoStore';
import { X } from 'lucide-react';

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
      alert(`Erro dimensional: O comprimento das ${baysCount} baias somadas (${sumL}m) excede o Comprimento Total do deck (${tL}m).`);
      return;
    }

    // Step 4b: confirm before destructive bay count change
    const newBaysCount = Number(baysCount);
    if (newBaysCount !== activeLocation.config.numberOfBays) {
      const totalAllocated = activeLocation.bays.reduce(
        (acc, bay) => acc + bay.allocatedCargoes.length, 0
      );
      if (totalAllocated > 0) {
        const confirmed = window.confirm(
          `Atenção: Alterar o número de baias irá mover ${totalAllocated} carga(s) alocada(s) de volta para a lista de não alocadas.\n\nDeseja continuar?`
        );
        if (!confirmed) return;
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

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm p-4 font-sans animate-in fade-in duration-300">
      <div className="bg-header border border-subtle rounded-[2.5rem] p-10 w-full max-w-xl shadow-high relative overflow-hidden glass">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-primary via-indigo-400 to-brand-primary" />
        
        <button onClick={onClose} className="absolute top-6 right-8 text-muted hover:text-primary transition-colors p-2 hover:bg-main rounded-full">
          <X className="w-6 h-6" />
        </button>
        
        <div className="mb-10">
          <h2 className="text-3xl font-extrabold text-primary tracking-tighter uppercase leading-none">{activeLocation.name}</h2>
          <p className="text-[11px] font-bold text-muted uppercase tracking-[0.3em] mt-3 opacity-80">Deck Architecture Settings</p>
        </div>
        
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-8">
             <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.2em] ml-1">Total Length (m)</label>
                <div className="relative">
                  <input type="number" value={length} onChange={e => setLength(e.target.value)} className="w-full bg-main border-2 border-subtle rounded-2xl p-5 text-sm font-extrabold text-primary outline-none focus:border-brand-primary transition-all focus:ring-4 focus:ring-brand-primary/5" />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted/40 uppercase">Axis Y</span>
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.2em] ml-1">Total Width (m)</label>
                <div className="relative">
                  <input type="number" value={width} onChange={e => setWidth(e.target.value)} className="w-full bg-main border-2 border-subtle rounded-2xl p-5 text-sm font-extrabold text-primary outline-none focus:border-brand-primary transition-all focus:ring-4 focus:ring-brand-primary/5" />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted/40 uppercase">Axis X</span>
                </div>
             </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.2em] ml-1">Floor Z-Elevation (m)</label>
            <input type="number" step="0.1" value={elevationMeters} onChange={e => setElevationMeters(e.target.value)} className="w-full bg-main border-2 border-subtle rounded-2xl p-5 text-sm font-extrabold text-primary outline-none focus:border-brand-primary transition-all focus:ring-4 focus:ring-brand-primary/5" />
            <p className="text-[10px] text-muted font-bold mt-1 ml-1 opacity-60">Reference for stability calculations.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mt-8 p-6 bg-sidebar/30 rounded-3xl border border-subtle/50">
          <div className="space-y-2 text-center">
            <label className="text-[9px] font-black text-muted uppercase tracking-wider">Port</label>
            <input type="number" step="0.1" value={portWidth} onChange={e => setPortWidth(e.target.value)} className="w-full bg-main border border-subtle text-center rounded-xl p-3 text-xs font-extrabold text-primary outline-none focus:border-brand-primary" />
          </div>
          <div className="space-y-2 text-center">
            <label className="text-[9px] font-black text-muted uppercase tracking-wider">Center</label>
            <input type="number" step="0.1" value={centerWidth} onChange={e => setCenterWidth(e.target.value)} className="w-full bg-main border border-subtle text-center rounded-xl p-3 text-xs font-extrabold text-primary outline-none focus:border-brand-primary" />
          </div>
          <div className="space-y-2 text-center">
            <label className="text-[9px] font-black text-muted uppercase tracking-wider">Starboard</label>
            <input type="number" step="0.1" value={starboardWidth} onChange={e => setStarboardWidth(e.target.value)} className="w-full bg-main border border-subtle text-center rounded-xl p-3 text-xs font-extrabold text-primary outline-none focus:border-brand-primary" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mt-8 pb-8 border-b border-subtle">
          <div className="space-y-2">
            <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.2em] ml-1">Bay Count</label>
            <input type="number" value={baysCount} onChange={e => setBaysCount(e.target.value)} className="w-full bg-main border-2 border-subtle rounded-2xl p-5 text-sm font-extrabold text-primary outline-none focus:border-brand-primary" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.2em] ml-1">Bay Pitch (m)</label>
            <input type="number" value={bayLength} onChange={e => setBayLength(e.target.value)} className="w-full bg-main border-2 border-subtle rounded-2xl p-5 text-sm font-extrabold text-primary outline-none focus:border-brand-primary" />
          </div>
        </div>

        <div className="mt-10 flex gap-4">
          <button onClick={onClose} className="flex-1 py-5 text-xs font-extrabold text-muted hover:text-primary uppercase tracking-widest transition-colors">
            CANCEL
          </button>
          <button onClick={handleSave} className="flex-[2] py-5 bg-gradient-to-br from-[#10b981] to-[#059669] text-white rounded-2xl text-xs font-extrabold uppercase tracking-[0.2em] shadow-high shadow-status-success/20 hover:brightness-110 active:scale-95 transition-all hover-lift">
            UPDATE CONFIGURATION
          </button>
        </div>
      </div>
    </div>
  )
}
