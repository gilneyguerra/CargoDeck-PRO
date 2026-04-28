import { useNotificationStore } from '@/features/notificationStore';
import { StandardToast, StandardBanner, StandardModal } from './standard/UIComponents';

export function ToastContainer() {
  const { notifications, removeNotification, banner, confirm } = useNotificationStore();

  return (
    <>
      {/* 1. Banner de Notificação - Topo (abaixo do header via CSS) */}
      <StandardBanner 
        isVisible={banner.isVisible} 
        message={banner.message} 
        progress={banner.progress} 
      />

      {/* 2. Toasts de Feedback - Centro Inferior */}
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
              className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-ui-gray hover:bg-ui-gray-light transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={confirm.onConfirm}
              className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-ui-emerald hover:bg-ui-emerald-hover text-white transition-all shadow-md active:scale-95"
            >
              Confirmar
            </button>
          </>
        }
      >
        <p className="text-ui-navy font-medium text-center py-4">{confirm.message}</p>
      </StandardModal>
    </>
  );
}
