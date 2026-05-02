import { useNotificationStore } from '@/features/notificationStore';
import { StandardToast, StandardBanner, StandardModal } from './standard/UIComponents';
import { AlertDialog } from './AlertDialog';
import { PromptModal } from './PromptModal';

export function ToastContainer() {
  const { notifications, removeNotification, banner, confirm, alert } = useNotificationStore();

  return (
    <>
      {/* 1. Banner de Notificação — Topo */}
      <StandardBanner
        isVisible={banner.isVisible}
        message={banner.message}
        progress={banner.progress}
      />

      {/* 2. Toasts de Feedback — Centro Inferior */}
      <div className="toast__container">
        {notifications.map((n) => (
          <StandardToast
            key={n.id}
            id={n.id}
            message={n.message}
            type={n.type}
            onClose={removeNotification}
          />
        ))}
      </div>

      {/* 3. Modal de Confirmação Padronizado — variant define cor do
          accent bar + ícone + botão Confirm. Default = azul brand;
          'warning' = âmbar (ações de efeito amplo); 'danger' = vermelho
          (destrutivas/irreversíveis). */}
      <StandardModal
        isOpen={confirm.isOpen}
        onClose={confirm.onCancel}
        title={confirm.title}
        variant={confirm.variant}
        footer={
          <>
            <button
              onClick={confirm.onCancel}
              className="px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] text-muted hover:bg-main hover:text-primary transition-[background-color,border-color,color] duration-200 border border-transparent hover:border-subtle min-h-[40px]"
            >
              {confirm.cancelLabel}
            </button>
            <button
              onClick={confirm.onConfirm}
              className={
                'px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] text-white transition-[filter,transform,box-shadow] duration-200 shadow-md active:scale-95 hover:brightness-110 min-h-[40px] ' +
                (confirm.variant === 'warning'
                  ? 'bg-status-warning shadow-status-warning/30'
                  : confirm.variant === 'danger'
                  ? 'bg-status-error shadow-status-error/30'
                  : 'bg-status-success shadow-status-success/30')
              }
            >
              {confirm.confirmLabel}
            </button>
          </>
        }
      >
        <p className="text-primary font-medium text-center py-2 leading-relaxed">{confirm.message}</p>
      </StandardModal>

      {/* 4. Alert Dialog Global — Erros Críticos / Sucesso Destacado (Z-1100) */}
      <AlertDialog
        isOpen={alert.isOpen}
        title={alert.title}
        message={alert.message}
        variant={alert.variant}
        onConfirm={alert.onConfirm}
      />

      {/* 5. Prompt Modal Global — substitui window.prompt (Z-1050, sempre centralizado) */}
      <PromptModal />
    </>
  );
}
