import { useEffect, useState, type FC } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- MODAL PADRONIZADO ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  type?: 'default' | 'danger' | 'success';
}

export const StandardModal: FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setShouldRender(true);
  }, [isOpen]);

  const handleAnimationEnd = () => {
    if (!isOpen) setShouldRender(false);
  };

  if (!shouldRender) return null;

  return (
    <div className={cn("modal__backdrop", !isOpen && "opacity-0 pointer-events-none")}>
      <div
        className={cn(
          "modal__card animate-modal",
          !isOpen && "scale-95 opacity-0"
        )}
        onAnimationEnd={handleAnimationEnd}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-subtle bg-header rounded-t-[1.5rem]">
          <h3 className="text-sm font-black text-primary font-sans uppercase tracking-[0.15em]">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-main rounded-xl transition-all text-muted hover:text-primary"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-8 py-6 text-sm text-secondary font-sans leading-relaxed bg-main/60">
          {children}
        </div>

        {footer && (
          <div className="px-6 py-5 border-t border-subtle bg-sidebar/50 rounded-b-[1.5rem] flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// --- TOAST PADRONIZADO ---
interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: (id: string) => void;
}

export const StandardToast: FC<ToastProps> = ({ id, message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(id), 4000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const icons = {
    success: <CheckCircle2 className="text-status-success shrink-0" size={20} />,
    error: <AlertCircle className="text-status-error shrink-0" size={20} />,
    warning: <AlertTriangle className="text-status-warning shrink-0" size={20} />,
    info: <Info className="text-brand-primary shrink-0" size={20} />,
  };

  return (
    <div className="toast__item">
      {icons[type]}
      <span className="text-sm font-semibold tracking-wide">{message}</span>
      <button onClick={() => onClose(id)} className="ml-auto p-1 hover:bg-white/10 rounded-md transition-colors shrink-0">
        <X size={16} opacity={0.6} />
      </button>
    </div>
  );
}

// --- BANNER DE NOTIFICAÇÃO (PROCESSAMENTO) ---
interface BannerProps {
  message: string;
  progress?: number;
  isVisible: boolean;
}

export const StandardBanner: FC<BannerProps> = ({ message, progress, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="banner__wrapper">
      <div className="flex items-center gap-4 w-full">
        <Loader2 className="w-5 h-5 animate-spin text-brand-primary shrink-0" />
        <span className="text-xs font-black uppercase tracking-[0.2em]">{message}</span>

        {progress !== undefined && (
          <div className="ml-auto flex items-center gap-4 flex-1 max-w-xs">
            <div className="flex-1 h-1.5 bg-brand-primary/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-primary transition-all duration-500 shadow-[0_0_8px_rgba(0,86,179,0.4)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] font-mono font-bold w-10">{progress}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
