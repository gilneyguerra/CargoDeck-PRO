import { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { useCargoStore } from '@/features/cargoStore';
import { useNotificationStore } from '@/features/notificationStore';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { X, Layout, Maximize2, MoveVertical, GitCommitVertical } from 'lucide-react';

export function DeckSettingsModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { locations, activeLocationId, updateActiveLocationConfig } = useCargoStore();
  const { showAlert, ask } = useNotificationStore();
  const titleId = useId();
  const containerRef = useFocusTrap<HTMLDivElement>({ isActive: isOpen, onEscape: onClose });
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

  const handleSave = async () => {
    const tL = Number(length); const tW = Number(width); const sumW = Number(portWidth) + Number(centerWidth) + Number(starboardWidth); const sumL = Number(bayLength) * Number(baysCount);
    // Validações: usam showAlert (z-1100, fica acima do modal) — o usuário pode
    // continuar editando após reconhecer o erro, então NÃO fechamos o modal.
    if (sumW > tW) {
      await showAlert({ title: 'Erro Dimensional', message: `A soma das larguras (${sumW}m) excede a Largura Total (${tW}m).`, variant: 'error' });
      return;
    }
    if (sumL > tL) {
      await showAlert({ title: 'Erro Dimensional', message: `O comprimento das baias (${sumL}m) excede o Comprimento Total (${tL}m).`, variant: 'error' });
      return;
    }
    const newBaysCount = Number(baysCount);
    const needsBayConfirm = newBaysCount !== activeLocation.config.numberOfBays
      && activeLocation.bays.reduce((acc, bay) => acc + bay.allocatedCargoes.length, 0) > 0;
    const totalAllocated = activeLocation.bays.reduce((acc, bay) => acc + bay.allocatedCargoes.length, 0);

    // Caso terminal: fecha o modal ANTES do ask para que a confirmação fique
    // em primeiro plano (regra aplicada também ao GroupMoveModal).
    if (needsBayConfirm) {
      onClose();
      const ok = await ask('Atenção', `A mudança de baias retornará ${totalAllocated} cargas ao estoque. Continuar?`);
      if (!ok) return; // se cancelar, o modal já está fechado — usuário pode reabrir
      updateActiveLocationConfig({ lengthMeters: tL, widthMeters: tW, numberOfBays: newBaysCount, bayLengthMeters: Number(bayLength), elevationMeters: Number(elevationMeters), portWidthMeters: Number(portWidth), centerWidthMeters: Number(centerWidth), starboardWidthMeters: Number(starboardWidth) });
      return;
    }

    updateActiveLocationConfig({ lengthMeters: tL, widthMeters: tW, numberOfBays: newBaysCount, bayLengthMeters: Number(bayLength), elevationMeters: Number(elevationMeters), portWidthMeters: Number(portWidth), centerWidthMeters: Number(centerWidth), starboardWidthMeters: Number(starboardWidth) });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-header border-2 border-subtle rounded-[2.5rem] w-full max-w-xl shadow-high relative flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 glass"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 via-brand-primary to-emerald-500 z-50 shadow-glow shadow-brand-primary/10" />
        
        {/* Header Section */}
        <div className="px-10 pt-10 pb-8 border-b border-subtle shrink-0">
            <button onClick={onClose} className="absolute top-7 right-10 text-primary hover:text-brand-primary p-2 hover:bg-main rounded-full transition-all">
                <X className="w-7 h-7" />
            </button>
            <div className="flex flex-col gap-2">
                <h2 id={titleId} className="text-3xl font-black text-primary tracking-tighter uppercase leading-none">{activeLocation.name}</h2>
                <p className="text-[10px] font-black text-secondary uppercase tracking-[0.4em] opacity-90">Configuração da Área de Carga</p>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-10">
            <div className="space-y-10">
                {/* Master Dimensions */}
                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest ml-1">
                            <MoveVertical size={14} className="text-emerald-500" /> Comprimento Total (m)
                        </label>
                        <div className="relative">
                            <input type="number" value={length} onChange={e => setLength(e.target.value)} className="w-full bg-main border-2 border-strong/40 rounded-2xl px-6 py-4.5 text-sm font-mono font-black text-primary outline-none focus:border-emerald-500 transition-all shadow-inner" />
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[9px] font-black text-secondary/40 uppercase tracking-widest">Y-Axis</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest ml-1">
                             <Maximize2 size={14} className="text-emerald-500" /> Largura Total (m)
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
                       <GitCommitVertical size={16} className="text-emerald-500" /> Elevação do Convés (m)
                    </label>
                    <input type="number" step="0.1" value={elevationMeters} onChange={e => setElevationMeters(e.target.value)} className="w-full bg-header border-2 border-subtle rounded-xl px-6 py-4 text-sm font-black text-primary outline-none focus:border-emerald-500 transition-all shadow-low" />
                    <p className="text-[9px] font-black text-secondary uppercase opacity-70 tracking-widest leading-relaxed">Referência de segurança: altitude obrigatória para protocolo de estabilidade.</p>
                </div>

                {/* Transversal Zones */}
                <div className="space-y-4">
                    <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest ml-1">
                        <Layout size={14} className="text-emerald-500" /> Zonas Transversais
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col gap-2">
                            <span className="text-[9px] font-black text-secondary text-center uppercase tracking-[0.2em] opacity-80">Bombordo</span>
                            <input type="number" step="0.1" value={portWidth} onChange={e => setPortWidth(e.target.value)} className="w-full bg-header border-2 border-subtle text-center rounded-2xl py-4 text-sm font-mono font-black text-primary outline-none focus:border-emerald-500 shadow-low" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <span className="text-[9px] font-black text-secondary text-center uppercase tracking-[0.2em] opacity-80">Centro</span>
                            <input type="number" step="0.1" value={centerWidth} onChange={e => setCenterWidth(e.target.value)} className="w-full bg-header border-2 border-subtle text-center rounded-2xl py-4 text-sm font-mono font-black text-primary outline-none focus:border-emerald-500 shadow-low" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <span className="text-[9px] font-black text-secondary text-center uppercase tracking-[0.2em] opacity-80">Boreste</span>
                            <input type="number" step="0.1" value={starboardWidth} onChange={e => setStarboardWidth(e.target.value)} className="w-full bg-header border-2 border-subtle text-center rounded-2xl py-4 text-sm font-mono font-black text-primary outline-none focus:border-emerald-500 shadow-low" />
                        </div>
                    </div>
                </div>

                {/* Bay Geometry */}
                <div className="grid grid-cols-2 gap-8 pt-4">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Número de Baias</label>
                        <input type="number" value={baysCount} onChange={e => setBaysCount(e.target.value)} className="w-full bg-main border-2 border-strong/40 rounded-2xl px-6 py-4.5 text-sm font-black text-primary outline-none focus:border-emerald-500 shadow-inner" />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Comprimento de Baia (m)</label>
                        <input type="number" value={bayLength} onChange={e => setBayLength(e.target.value)} className="w-full bg-main border-2 border-strong/40 rounded-2xl px-6 py-4.5 text-sm font-black text-primary outline-none focus:border-emerald-500 shadow-inner" />
                    </div>
                </div>
            </div>
        </div>

        {/* Footer Section */}
        <div className="px-10 py-6 border-t border-subtle bg-sidebar shrink-0 flex items-center justify-between gap-8">
            <button
                type="button" onClick={onClose}
                className="px-8 py-4 rounded-2xl text-xs font-black text-primary bg-main border-2 border-subtle hover:bg-sidebar transition-all active:scale-95 uppercase tracking-[0.2em]"
            >
                CANCELAR
            </button>
            <button
                onClick={handleSave}
                className="flex-1 bg-brand-primary text-white py-5 rounded-2xl text-xs font-black uppercase tracking-[0.25em] shadow-xl shadow-brand-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-4"
            >
                SALVAR CONFIGURAÇÃO
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
