import { useState, useId } from 'react';
import { createPortal } from 'react-dom';
import { X, Flag, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';
import { useCargoStore } from '@/features/cargoStore';
import { useNotificationStore } from '@/features/notificationStore';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { cn } from '@/lib/utils';
import type { CargoPriority } from '@/domain/Cargo';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedCargoIds: string[];
}

const PRIORITY_OPTIONS: {
  value: CargoPriority;
  label: string;
  description: string;
  icon: typeof Flag;
  color: string;
  bg: string;
}[] = [
  { value: 'normal', label: 'Normal',          description: 'Embarque convencional',                 icon: Flag,           color: 'text-secondary', bg: 'bg-main' },
  { value: 'high',   label: 'Alta',             description: 'Priorizar carga / Aviso operacional',   icon: AlertTriangle, color: 'text-status-warning', bg: 'bg-status-warning/10' },
  { value: 'urgent', label: 'Urgente / Crítica', description: 'Borda pulsante + topo do grid',         icon: Zap,           color: 'text-status-error', bg: 'bg-status-error/10' },
];

export function PriorityModal({ isOpen, onClose, selectedCargoIds }: Props) {
  const { setPriorityBatch, clearCargoSelection } = useCargoStore();
  const { notify } = useNotificationStore();
  const titleId = useId();
  const containerRef = useFocusTrap<HTMLDivElement>({ isActive: isOpen, onEscape: onClose });

  const [selected, setSelected] = useState<CargoPriority>('normal');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedCargoIds.length === 0) {
      notify('Nenhuma carga selecionada.', 'error');
      return;
    }
    setPriorityBatch(selectedCargoIds, selected);
    notify(`Prioridade "${selected}" aplicada a ${selectedCargoIds.length} carga(s).`, 'success');
    clearCargoSelection();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-main border-2 border-subtle rounded-[2rem] w-full max-w-md shadow-high relative flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-status-warning via-status-error to-status-warning" />

        {/* Header */}
        <div className="px-7 pt-7 pb-5 border-b border-subtle flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-status-warning/10 border border-status-warning/30 flex items-center justify-center">
            <Flag size={18} className="text-status-warning" />
          </div>
          <div>
            <h2 id={titleId} className="text-base font-montserrat font-black text-primary tracking-tight uppercase leading-none">Alterar Prioridade</h2>
            <p className="text-[9px] font-black text-secondary uppercase tracking-[0.3em] opacity-80 mt-1">{selectedCargoIds.length} carga(s) selecionada(s)</p>
          </div>
          <button onClick={onClose} className="ml-auto p-2 hover:bg-sidebar rounded-xl text-muted hover:text-primary transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-3">
          {PRIORITY_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const isSel = selected === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSelected(opt.value)}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all active:scale-[0.98] text-left',
                  isSel
                    ? 'border-brand-primary bg-brand-primary/5 shadow-md'
                    : 'border-subtle bg-main hover:border-strong'
                )}
              >
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', opt.bg)}>
                  <Icon size={18} className={opt.color} />
                </div>
                <div className="flex-1">
                  <p className={cn('text-sm font-black uppercase tracking-widest', opt.color)}>{opt.label}</p>
                  <p className="text-[10px] text-muted mt-0.5">{opt.description}</p>
                </div>
                {isSel && <CheckCircle2 size={18} className="text-brand-primary shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-subtle bg-sidebar flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-xs font-black text-muted hover:text-primary hover:bg-main uppercase tracking-widest transition-all min-h-[40px]"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all min-h-[40px] shadow-md"
          >
            <CheckCircle2 size={14} />
            Aplicar Prioridade
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
