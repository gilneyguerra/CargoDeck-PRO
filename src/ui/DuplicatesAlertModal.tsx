import { useId } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, MapPin, Trash2, CheckCircle2 } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { Cargo } from '@/domain/Cargo';

export interface DuplicateEntry {
  /** A carga não alocada (no grid de movimentação) que duplica outra */
  candidate: Cargo;
  /** A carga existente já alocada */
  existing: Cargo;
  /** Onde a existente está alocada (ex: "Convés Principal — Baia 03") */
  location: string;
  /** Bordo da carga existente */
  side: 'port' | 'center' | 'starboard' | undefined;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  duplicates: DuplicateEntry[];
  /** Confirma a remoção das cargas duplicadas do grid (mantendo as alocadas onde estão). */
  onRemoveDuplicates: (candidateIds: string[]) => void;
}

const SIDE_LABEL: Record<string, string> = {
  port: 'Bombordo',
  center: 'Centro',
  starboard: 'Boreste',
};

export function DuplicatesAlertModal({ isOpen, onClose, duplicates, onRemoveDuplicates }: Props) {
  const titleId = useId();
  const containerRef = useFocusTrap<HTMLDivElement>({ isActive: isOpen, onEscape: onClose });

  if (!isOpen) return null;

  const handleRemoveAll = () => {
    onRemoveDuplicates(duplicates.map(d => d.candidate.id));
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[1100] font-sans animate-in fade-in duration-200">
      <div
        ref={containerRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-main border-2 border-status-warning/40 rounded-[2rem] w-full max-w-3xl shadow-high relative flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-status-warning via-amber-500 to-status-warning" />

        {/* Header */}
        <div className="px-7 pt-7 pb-5 border-b border-subtle flex items-center gap-3 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-status-warning/10 border border-status-warning/30 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} className="text-status-warning" />
          </div>
          <div>
            <h2 id={titleId} className="text-base font-montserrat font-black text-primary tracking-tight uppercase leading-none">
              Cargas Duplicadas Detectadas
            </h2>
            <p className="text-[10px] font-bold text-secondary uppercase tracking-[0.25em] opacity-80 mt-1">
              {duplicates.length} código(s) já alocado(s) em outro local
            </p>
          </div>
          <button onClick={onClose} className="ml-auto p-2 hover:bg-sidebar rounded-xl text-muted hover:text-primary transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-3">
          <p className="text-[12px] text-secondary leading-relaxed mb-4">
            As cargas abaixo possuem o mesmo <strong className="text-primary">código identificador</strong> de cargas que já estão alocadas em conveses. Se confirmar, elas serão <strong className="text-status-warning">removidas APENAS do grid de movimentação</strong> (e da página de Geração Modal); a alocação original permanece intacta.
          </p>

          {duplicates.map((dup, idx) => (
            <div key={dup.candidate.id} className="bg-sidebar/30 border-2 border-subtle rounded-2xl p-4 hover:border-status-warning/40 transition-colors">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-7 h-7 rounded-lg bg-status-warning/15 border border-status-warning/30 flex items-center justify-center text-status-warning font-mono font-black text-xs">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-mono font-black text-sm text-primary">{dup.candidate.identifier}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-status-warning/15 text-status-warning border border-status-warning/30">
                      DUPLICADA
                    </span>
                  </div>
                  <p className="text-[11px] text-secondary leading-relaxed mb-2 line-clamp-2">{dup.candidate.description}</p>

                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                    <MapPin size={11} className="text-brand-primary shrink-0" />
                    <span className="text-muted">Já alocada em</span>
                    <span className="text-brand-primary font-mono">{dup.location}</span>
                    {dup.side && (
                      <>
                        <span className="text-muted">·</span>
                        <span className="text-secondary">{SIDE_LABEL[dup.side] ?? dup.side}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-secondary">
                    <span>{dup.candidate.lengthMeters?.toFixed(1)}×{dup.candidate.widthMeters?.toFixed(1)} m</span>
                    <span className="font-bold text-primary">{dup.candidate.weightTonnes?.toFixed(2)} t</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-7 py-5 border-t border-subtle bg-sidebar/40 shrink-0 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[10px] text-muted font-bold flex items-center gap-1.5">
            <CheckCircle2 size={11} className="text-status-success" />
            As cargas alocadas <strong className="text-primary">não serão tocadas</strong>.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-[11px] font-black text-muted hover:text-primary hover:bg-main uppercase tracking-widest transition-all min-h-[40px]"
            >
              Cancelar
            </button>
            <button
              onClick={handleRemoveAll}
              className="flex items-center gap-2 px-6 py-2.5 bg-status-warning hover:brightness-110 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-md shadow-status-warning/30 active:scale-95 transition-all min-h-[40px]"
            >
              <Trash2 size={13} />
              Remover {duplicates.length} do Grid
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
