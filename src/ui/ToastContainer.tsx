import { useNotificationStore } from '@/features/notificationStore';
import { StandardToast, StandardBanner, StandardModal } from './standard/UIComponents';
import { AlertDialog } from './AlertDialog';

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

      {/* 3. Modal de Confirmação Padronizado */}
      <StandardModal
        isOpen={confirm.isOpen}
        onClose={confirm.onCancel}
        title={confirm.title}
        footer={
          <>
            <button
              onClick={confirm.onCancel}
              className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-muted hover:bg-main hover:text-primary transition-all border border-transparent hover:border-subtle"
            >
              Cancelar
            </button>
            <button
              onClick={confirm.onConfirm}
              className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-status-success hover:brightness-110 text-white transition-all shadow-md active:scale-95"
            >
              Confirmar
            </button>
          </>
        }
      >
        <p className="text-primary font-medium text-center py-4">{confirm.message}</p>
      </StandardModal>

      {/* 4. Alert Dialog Global — Erros Críticos / Sucesso Destacado (Z-1100) */}
      <AlertDialog
        isOpen={alert.isOpen}
        title={alert.title}
        message={alert.message}
        variant={alert.variant}
        onConfirm={alert.onConfirm}
      />
    </>
  );
}
