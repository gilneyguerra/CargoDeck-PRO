import { useEffect, useState, type FC } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- MODAL PADRONIZADO ---
type ModalVariant = 'default' | 'warning' | 'danger';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Variante visual: 'default' (azul brand), 'warning' (âmbar — ações de
   *  efeito amplo), 'danger' (vermelho — destrutivas/irreversíveis). */
  variant?: ModalVariant;
}

const VARIANT_THEME: Record<ModalVariant, {
  accentBar: string;
  iconBg: string;
  iconRing: string;
  iconColor: string;
  Icon: typeof CheckCircle2;
}> = {
  default: {
    accentBar: 'from-brand-primary via-indigo-500 to-brand-primary',
    iconBg: 'bg-brand-primary/10',
    iconRing: 'ring-brand-primary/20',
    iconColor: 'text-brand-primary',
    Icon: Info,
  },
  warning: {
    accentBar: 'from-status-warning via-amber-500 to-status-warning',
    iconBg: 'bg-status-warning/10',
    iconRing: 'ring-status-warning/30',
    iconColor: 'text-status-warning',
    Icon: AlertTriangle,
  },
  danger: {
    accentBar: 'from-status-error via-red-500 to-status-error',
    iconBg: 'bg-status-error/10',
    iconRing: 'ring-status-error/30',
    iconColor: 'text-status-error',
    Icon: AlertCircle,
  },
};

export const StandardModal: FC<ModalProps> = ({ isOpen, onClose, title, children, footer, variant = 'default' }) => {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setShouldRender(true);
  }, [isOpen]);

  const handleAnimationEnd = () => {
    if (!isOpen) setShouldRender(false);
  };

  if (!shouldRender) return null;

  const theme = VARIANT_THEME[variant];
  const Icon = theme.Icon;

  return (
    <div className={cn("modal__backdrop", !isOpen && "opacity-0 pointer-events-none")}>
      <div
        className={cn(
          "modal__card animate-modal relative overflow-hidden",
          !isOpen && "scale-95 opacity-0"
        )}
        onAnimationEnd={handleAnimationEnd}
      >
        {/* Accent bar topo — cor segue variant. Mesmo padrão visual usado em
            PromptModal e CargoEditorModal — coerência visual entre modais. */}
        <div className={cn('absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r z-50', theme.accentBar)} />

        {/* Header — ícone variant + título + fechar. Theme-aware via tokens
            (text-primary muda automaticamente light/dark). */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-subtle bg-header/60">
          <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center ring-2 shrink-0', theme.iconBg, theme.iconRing)}>
            <Icon size={18} className={theme.iconColor} strokeWidth={2.5} />
          </div>
          <h3 className="flex-1 text-[13px] font-black text-primary font-sans uppercase tracking-[0.15em] leading-tight">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-main rounded-xl transition-[background-color,color] duration-200 text-muted hover:text-primary"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — text-primary para preto/branco theme-aware (era text-secondary
            fixo). Tamanho text-[14px] consistente com PromptModal. */}
        <div className="px-8 py-6 text-[14px] text-primary font-sans leading-relaxed bg-main/60">
          {children}
        </div>

        {footer && (
          <div className="px-6 py-5 border-t border-subtle bg-sidebar/50 flex justify-end gap-3">
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
