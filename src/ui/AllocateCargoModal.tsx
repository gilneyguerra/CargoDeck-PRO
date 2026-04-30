import { useState, useEffect, useId, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Ship, Layers, ArrowRight, Compass, AlertTriangle } from 'lucide-react';
import { useCargoStore } from '@/features/cargoStore';
import { useNotificationStore } from '@/features/notificationStore';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { cn } from '@/lib/utils';

type Side = 'port' | 'center' | 'starboard';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedCargoIds: string[];
  onSuccess: () => void;
}

const SIDE_OPTIONS: { value: Side; label: string; helper: string }[] = [
  { value: 'port',       label: 'Bombordo',  helper: 'Lado esquerdo' },
  { value: 'center',     label: 'Centro',    helper: 'Eixo central' },
  { value: 'starboard',  label: 'Boreste',   helper: 'Lado direito' },
];

export function AllocateCargoModal({ isOpen, onClose, selectedCargoIds, onSuccess }: Props) {
  const { locations, moveCargoToBay, unallocatedCargoes, clearCargoSelection } = useCargoStore();
  const { notify } = useNotificationStore();
  const titleId = useId();
  const containerRef = useFocusTrap<HTMLDivElement>({ isActive: isOpen, onEscape: onClose });

  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [selectedBayId, setSelectedBayId] = useState<string>('');
  const [selectedSide, setSelectedSide] = useState<Side>('center');
  const [submitting, setSubmitting] = useState(false);

  // Reseta ao abrir
  useEffect(() => {
    if (isOpen && locations.length > 0 && !selectedLocationId) {
      setSelectedLocationId(locations[0].id);
    }
  }, [isOpen, locations, selectedLocationId]);

  // Bays do convés selecionado
  const currentLocation = locations.find(l => l.id === selectedLocationId);
  const bays = currentLocation?.bays ?? [];

  // Cargas selecionadas + métricas
  const selectedCargos = useMemo(
    () => unallocatedCargoes.filter(c => selectedCargoIds.includes(c.id)),
    [unallocatedCargoes, selectedCargoIds]
  );
  const totalWeight = selectedCargos.reduce((s, c) => s + (c.weightTonnes || 0), 0);

  // Resetar bay quando muda location
  useEffect(() => {
    setSelectedBayId('');
  }, [selectedLocationId]);

  const handleConfirm = async () => {
    if (!selectedLocationId || !selectedBayId || selectedCargoIds.length === 0) {
      notify('Selecione um convés e uma baia.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      for (const id of selectedCargoIds) {
        moveCargoToBay(id, selectedBayId, selectedSide);
      }
      notify(`${selectedCargoIds.length} carga(s) alocada(s) com sucesso!`, 'success');
      clearCargoSelection();
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      notify('Erro na alocação: ' + msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Validação de capacidade da bay selecionada
  const currentBay = bays.find(b => b.id === selectedBayId);
  const wouldExceed = currentBay
    ? (currentBay.currentWeightTonnes + totalWeight) > currentBay.maxWeightTonnes
    : false;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-main border-2 border-subtle rounded-[2rem] w-full max-w-2xl shadow-high relative flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-status-success via-brand-primary to-status-success z-50" />

        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-subtle shrink-0 flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-status-success/10 border border-status-success/20 flex items-center justify-center">
            <ArrowRight size={20} className="text-status-success" />
          </div>
          <div>
            <h2 id={titleId} className="text-lg font-montserrat font-black text-primary tracking-tighter uppercase leading-none">Alocar Cargas em Lote</h2>
            <p className="text-[9px] font-black text-secondary uppercase tracking-[0.3em] opacity-80 mt-1">
              {selectedCargoIds.length} carga(s) · {totalWeight.toFixed(2)} t total
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto p-2 hover:bg-sidebar rounded-xl text-muted hover:text-primary transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Convés (Location) */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
              <Ship size={13} className="text-brand-primary" /> Convés
            </label>
            <div className="grid grid-cols-2 gap-2">
              {locations.map(loc => (
                <button
                  key={loc.id}
                  onClick={() => setSelectedLocationId(loc.id)}
                  className={cn(
                    'px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all active:scale-95 text-left',
                    selectedLocationId === loc.id
                      ? 'border-brand-primary bg-brand-primary/10 text-brand-primary shadow-md'
                      : 'border-subtle bg-main text-secondary hover:border-strong'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span>{loc.name}</span>
                    <span className="text-[9px] text-muted font-mono">{loc.bays.length} baia(s)</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Baia */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
              <Layers size={13} className="text-brand-primary" /> Baia
            </label>
            {bays.length === 0 ? (
              <div className="bg-status-warning/10 border-2 border-status-warning/30 rounded-xl p-4 text-center">
                <AlertTriangle size={16} className="text-status-warning mx-auto mb-1" />
                <p className="text-[11px] font-bold text-status-warning">Este convés não possui baias configuradas.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto no-scrollbar p-1">
                {bays.map(bay => {
                  const occupancyPct = bay.maxWeightTonnes > 0
                    ? Math.round((bay.currentWeightTonnes / bay.maxWeightTonnes) * 100)
                    : 0;
                  const isFull = occupancyPct >= 100;
                  return (
                    <button
                      key={bay.id}
                      onClick={() => setSelectedBayId(bay.id)}
                      className={cn(
                        'relative p-3 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all active:scale-95 flex flex-col items-center gap-1',
                        selectedBayId === bay.id
                          ? 'border-brand-primary bg-brand-primary/10 text-brand-primary shadow-md'
                          : isFull
                          ? 'border-status-error/40 bg-status-error/5 text-status-error/70'
                          : 'border-subtle bg-main text-secondary hover:border-strong'
                      )}
                    >
                      <span className="font-mono text-[14px] font-black">B{bay.number}</span>
                      <span className="text-[9px] text-muted">{occupancyPct}%</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bordo */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
              <Compass size={13} className="text-brand-primary" /> Bordo
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SIDE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedSide(opt.value)}
                  className={cn(
                    'px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all active:scale-95 flex flex-col items-center gap-0.5',
                    selectedSide === opt.value
                      ? 'border-brand-primary bg-brand-primary/10 text-brand-primary shadow-md'
                      : 'border-subtle bg-main text-secondary hover:border-strong'
                  )}
                >
                  <span>{opt.label}</span>
                  <span className="text-[8px] font-bold text-muted normal-case tracking-normal">{opt.helper}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Alerta de capacidade */}
          {wouldExceed && (
            <div className="bg-status-error/10 border-2 border-status-error/30 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle size={16} className="text-status-error shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-black text-status-error uppercase tracking-widest">Capacidade Excedida</p>
                <p className="text-[10px] text-secondary mt-0.5">
                  Adicionar {totalWeight.toFixed(2)}t a esta baia (atual: {currentBay?.currentWeightTonnes.toFixed(2)}t)
                  ultrapassará o limite de {currentBay?.maxWeightTonnes.toFixed(2)}t.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-subtle bg-sidebar shrink-0 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-xs font-black text-muted hover:text-primary hover:bg-main uppercase tracking-widest transition-all min-h-[40px]"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || !selectedBayId || selectedCargoIds.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-status-success hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md shadow-status-success/20 active:scale-95 transition-all min-h-[40px]"
          >
            <ArrowRight size={14} />
            {submitting ? 'Alocando…' : `Alocar ${selectedCargoIds.length} Carga(s)`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
