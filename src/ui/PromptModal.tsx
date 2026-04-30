import { useEffect, useState, useId, useRef, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageSquareText, CheckCircle2 } from 'lucide-react';
import { useNotificationStore } from '@/features/notificationStore';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { cn } from '@/lib/utils';

/**
 * Modal de prompt (substitui window.prompt) — sempre centralizado e padronizado
 * com o restante do app. Usa Z-1050 (mesmo padrão do StandardModal de confirmação)
 * para sempre aparecer em primeiro plano sobre modais comuns (Z-1000).
 */
export function PromptModal() {
  const promptState = useNotificationStore(s => s.prompt);
  const titleId = useId();
  const containerRef = useFocusTrap<HTMLDivElement>({ isActive: promptState.isOpen, onEscape: () => promptState.onCancel() });
  const inputRef = useRef<HTMLInputElement>(null);

  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reseta valor + erro toda vez que o modal abre
  useEffect(() => {
    if (promptState.isOpen) {
      setValue(promptState.defaultValue);
      setError(null);
      // Foco no input após o modal montar
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 80);
    }
  }, [promptState.isOpen, promptState.defaultValue]);

  if (!promptState.isOpen) return null;

  const handleConfirm = () => {
    const trimmed = value.trim();
    if (promptState.required && !trimmed) {
      setError('Este campo é obrigatório.');
      inputRef.current?.focus();
      return;
    }
    promptState.onConfirm(trimmed);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[1050] font-sans animate-in fade-in duration-200">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-main border-2 border-subtle rounded-[2rem] w-full max-w-md shadow-high relative flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-primary via-indigo-500 to-brand-primary" />

        {/* Header */}
        <div className="px-7 pt-7 pb-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shrink-0">
            <MessageSquareText size={18} className="text-brand-primary" />
          </div>
          <div className="flex-1">
            <h2 id={titleId} className="text-base font-montserrat font-black text-primary tracking-tight uppercase leading-tight">
              {promptState.title}
            </h2>
            {promptState.message && (
              <p className="text-[12px] text-secondary leading-relaxed mt-1">{promptState.message}</p>
            )}
          </div>
          <button
            onClick={() => promptState.onCancel()}
            className="p-2 rounded-xl text-muted hover:text-primary hover:bg-sidebar transition-all"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-7 pb-2">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => { setValue(e.target.value); if (error) setError(null); }}
            onKeyDown={handleKey}
            placeholder={promptState.placeholder}
            className={cn(
              'w-full bg-sidebar/40 border-2 rounded-xl px-4 py-3 text-sm font-bold text-primary outline-none transition-all min-h-[44px] placeholder:text-muted/50',
              error
                ? 'border-status-error bg-status-error/5 focus:border-status-error'
                : 'border-subtle focus:border-brand-primary'
            )}
          />
          {error && (
            <p className="text-[10px] font-bold text-status-error mt-1.5 ml-1">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-7 py-5 mt-2 flex items-center justify-end gap-3 border-t border-subtle bg-sidebar/30">
          <button
            onClick={() => promptState.onCancel()}
            className="px-5 py-2.5 rounded-xl text-xs font-black text-muted hover:text-primary hover:bg-main uppercase tracking-widest transition-all min-h-[40px]"
          >
            {promptState.cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all min-h-[40px] shadow-md shadow-brand-primary/20"
          >
            <CheckCircle2 size={14} />
            {promptState.confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
