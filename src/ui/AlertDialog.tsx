import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export type AlertVariant = 'success' | 'error' | 'warning';

interface AlertDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  variant: AlertVariant;
  onConfirm: () => void;
  confirmLabel?: string;
}

const VARIANT_CONFIG: Record<AlertVariant, {
  icon: typeof CheckCircle2;
  iconBg: string;
  iconColor: string;
  buttonBg: string;
  ring: string;
}> = {
  success: {
    icon: CheckCircle2,
    iconBg: 'bg-status-success/15',
    iconColor: 'text-status-success',
    buttonBg: 'bg-status-success hover:brightness-110',
    ring: 'ring-status-success/30',
  },
  error: {
    icon: AlertCircle,
    iconBg: 'bg-status-error/15',
    iconColor: 'text-status-error',
    buttonBg: 'bg-status-error hover:brightness-110',
    ring: 'ring-status-error/30',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-status-warning/15',
    iconColor: 'text-status-warning',
    buttonBg: 'bg-status-warning hover:brightness-110',
    ring: 'ring-status-warning/30',
  },
};

export function AlertDialog({ isOpen, title, message, variant, onConfirm, confirmLabel = 'OK' }: AlertDialogProps) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    window.setTimeout(() => {
      setIsClosing(false);
      onConfirm();
    }, 200);
  };

  const containerRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen && !isClosing,
    onEscape: handleClose,
  });

  // Reset isClosing quando reabre
  useEffect(() => {
    if (isOpen) setIsClosing(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const cfg = VARIANT_CONFIG[variant];
  const Icon = cfg.icon;
  const titleId = `alert-title-${variant}`;

  return createPortal(
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[1100] font-sans transition-opacity duration-200 ${
        isClosing ? 'opacity-0' : 'opacity-100 animate-in fade-in duration-200'
      }`}
    >
      <div
        ref={containerRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`bg-main border-2 border-subtle rounded-[2rem] w-full max-w-md shadow-high relative flex flex-col items-center px-8 py-10 ${
          isClosing ? 'animate-out zoom-out-95 duration-200' : 'animate-in zoom-in-95 duration-300'
        }`}
        style={{ animationTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        {/* Ícone grande */}
        <div className={`w-20 h-20 rounded-full ${cfg.iconBg} ring-8 ${cfg.ring} flex items-center justify-center mb-6`}>
          <Icon size={40} className={cfg.iconColor} strokeWidth={2.5} />
        </div>

        {/* Título */}
        <h2
          id={titleId}
          className="font-montserrat font-black text-xl text-primary tracking-tight uppercase text-center mb-3"
        >
          {title}
        </h2>

        {/* Mensagem */}
        <p className="text-sm text-secondary text-center leading-relaxed mb-8 max-w-sm">
          {message}
        </p>

        {/* Botão único */}
        <button
          onClick={handleClose}
          autoFocus
          className={`min-h-[40px] px-10 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all shadow-md active:scale-95 ${cfg.buttonBg}`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>,
    document.body
  );
}
