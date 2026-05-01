import { useState, useEffect, useId, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, Package, Tag, Power } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useContainerStore } from '@/features/containerStore';
import { useNotificationStore } from '@/features/notificationStore';
import type { Container, ContainerStatus, ContainerType } from '@/domain/Container';
import { CONTAINER_TYPE_LABELS } from '@/domain/Container';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Quando definido, o modal abre em modo de edição. */
  editing?: Container | null;
}

const TYPE_OPTIONS: { value: ContainerType }[] = [
  { value: 'container' },
  { value: 'cesta' },
  { value: 'skid' },
  { value: 'caixa' },
  { value: 'outro' },
];

/**
 * Modal de criação/edição de container (unidade de transporte fiscal).
 * Campos: nome (único por usuário), tipo, status.
 */
export function ContainerModal({ isOpen, onClose, editing }: Props) {
  const titleId = useId();
  const containerRef = useFocusTrap<HTMLDivElement>({ isActive: isOpen, onEscape: onClose });
  const { addContainer, updateContainer, containers } = useContainerStore();
  const { notify } = useNotificationStore();

  const [name, setName] = useState('');
  const [type, setType] = useState<ContainerType>('container');
  const [status, setStatus] = useState<ContainerStatus>('Ativo');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setName(editing.name);
      setType(editing.type);
      setStatus(editing.status);
    } else {
      setName('');
      setType('container');
      setStatus('Ativo');
    }
  }, [isOpen, editing]);

  if (!isOpen) return null;

  const trimmed = name.trim();
  const nameTaken = trimmed.length > 0 && containers.some(c =>
    c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== editing?.id
  );
  const canSubmit = trimmed.length > 0 && !nameTaken && !submitting;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      if (editing) {
        await updateContainer(editing.id, { name: trimmed, type, status });
        notify('Container atualizado.', 'success');
      } else {
        await addContainer({ name: trimmed, type, status });
        notify('Container criado.', 'success');
      }
      onClose();
    } catch {
      // errorReporter já registrou o erro detalhado
      notify('Não foi possível salvar. Verifique sua conexão.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-main border-2 border-subtle rounded-[2rem] w-full max-w-lg shadow-high relative flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-primary via-indigo-500 to-brand-primary z-50" />

        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-subtle shrink-0 flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
            <Package size={20} className="text-brand-primary" />
          </div>
          <div>
            <h2 id={titleId} className="text-lg font-montserrat font-black text-primary tracking-tighter uppercase leading-none">
              {editing ? 'Editar Container' : 'Novo Container'}
            </h2>
            <p className="text-[9px] font-black text-secondary uppercase tracking-[0.3em] opacity-80 mt-1">
              Unidade de transporte · DANFE
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="ml-auto p-2 hover:bg-sidebar rounded-xl text-muted hover:text-primary transition-all"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Nome */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
              <Tag size={13} className="text-brand-primary" /> Nome
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              autoFocus
              placeholder="Ex.: Container Petrobras 03"
              className={cn(
                'w-full bg-sidebar border-2 rounded-xl px-4 py-3 text-sm font-bold text-primary outline-none transition-all',
                nameTaken ? 'border-status-error' : 'border-subtle focus:border-brand-primary'
              )}
            />
            {nameTaken && (
              <p className="text-[10px] font-bold text-status-error">
                Já existe um container com esse nome.
              </p>
            )}
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
              <Package size={13} className="text-brand-primary" /> Tipo
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={cn(
                    'px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all active:scale-95',
                    type === opt.value
                      ? 'border-brand-primary bg-brand-primary/10 text-brand-primary shadow-md'
                      : 'border-subtle bg-main text-secondary hover:border-strong'
                  )}
                >
                  {CONTAINER_TYPE_LABELS[opt.value]}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
              <Power size={13} className="text-brand-primary" /> Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['Ativo', 'Inativo'] as ContainerStatus[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    'px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all active:scale-95',
                    status === s
                      ? s === 'Ativo'
                        ? 'border-status-success bg-status-success/10 text-status-success shadow-md'
                        : 'border-muted bg-muted/10 text-muted shadow-md'
                      : 'border-subtle bg-main text-secondary hover:border-strong'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-subtle bg-sidebar shrink-0 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            type="button"
            className="px-6 py-2.5 rounded-xl text-xs font-black text-muted hover:text-primary hover:bg-main uppercase tracking-widest transition-all min-h-[40px]"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            type="submit"
            disabled={!canSubmit}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md shadow-brand-primary/20 active:scale-95 transition-all min-h-[40px]"
          >
            {submitting ? 'Salvando…' : editing ? 'Salvar' : 'Criar Container'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
