import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export type AlertVariant = 'success' | 'error' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

interface BannerState {
  isVisible: boolean;
  message: string;
  progress?: number;
}

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

interface AlertState {
  isOpen: boolean;
  title: string;
  message: string;
  variant: AlertVariant;
  onConfirm: () => void;
}

interface PromptState {
  isOpen: boolean;
  title: string;
  message: string;
  placeholder: string;
  defaultValue: string;
  confirmLabel: string;
  cancelLabel: string;
  required: boolean;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

interface NotificationState {
  notifications: Notification[];
  banner: BannerState;
  confirm: ConfirmState;
  alert: AlertState;
  prompt: PromptState;

  // Toasts
  notify: (message: string, type?: NotificationType, duration?: number) => void;
  removeNotification: (id: string) => void;

  // Banner
  setBanner: (message: string, progress?: number) => void;
  hideBanner: () => void;

  // Confirm Dialog
  ask: (title: string, message: string) => Promise<boolean>;
  closeConfirm: () => void;

  // Alert Dialog (erros críticos / sucesso destacado)
  showAlert: (opts: { title: string; message: string; variant: AlertVariant }) => Promise<void>;
  closeAlert: () => void;

  // Prompt Dialog (substitui window.prompt) — retorna string ou null se cancelado
  askInput: (opts: {
    title: string;
    message?: string;
    placeholder?: string;
    defaultValue?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    required?: boolean;
  }) => Promise<string | null>;
  closePrompt: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  banner: { isVisible: false, message: '' },
  confirm: {
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {}
  },
  alert: {
    isOpen: false,
    title: '',
    message: '',
    variant: 'success',
    onConfirm: () => {},
  },
  prompt: {
    isOpen: false,
    title: '',
    message: '',
    placeholder: '',
    defaultValue: '',
    confirmLabel: 'OK',
    cancelLabel: 'Cancelar',
    required: false,
    onConfirm: () => {},
    onCancel: () => {},
  },

  notify: (message, type = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      notifications: [...state.notifications, { id, type, message, duration }],
    }));
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  setBanner: (message, progress) => {
    set({ banner: { isVisible: true, message, progress } });
  },

  hideBanner: () => {
    set((state) => ({ banner: { ...state.banner, isVisible: false } }));
  },

  ask: (title, message) => {
    return new Promise((resolve) => {
      set({
        confirm: {
          isOpen: true,
          title,
          message,
          onConfirm: () => {
            set((s) => ({ confirm: { ...s.confirm, isOpen: false } }));
            resolve(true);
          },
          onCancel: () => {
            set((s) => ({ confirm: { ...s.confirm, isOpen: false } }));
            resolve(false);
          }
        }
      });
    });
  },

  closeConfirm: () => {
    set((s) => ({ confirm: { ...s.confirm, isOpen: false } }));
  },

  showAlert: ({ title, message, variant }) => {
    return new Promise<void>((resolve) => {
      set({
        alert: {
          isOpen: true,
          title,
          message,
          variant,
          onConfirm: () => {
            set((s) => ({ alert: { ...s.alert, isOpen: false } }));
            resolve();
          },
        },
      });
    });
  },

  closeAlert: () => {
    set((s) => ({ alert: { ...s.alert, isOpen: false } }));
  },

  askInput: ({ title, message = '', placeholder = '', defaultValue = '', confirmLabel = 'OK', cancelLabel = 'Cancelar', required = false }) => {
    return new Promise<string | null>((resolve) => {
      set({
        prompt: {
          isOpen: true,
          title,
          message,
          placeholder,
          defaultValue,
          confirmLabel,
          cancelLabel,
          required,
          onConfirm: (value: string) => {
            set((s) => ({ prompt: { ...s.prompt, isOpen: false } }));
            resolve(value);
          },
          onCancel: () => {
            set((s) => ({ prompt: { ...s.prompt, isOpen: false } }));
            resolve(null);
          },
        },
      });
    });
  },

  closePrompt: () => {
    set((s) => ({ prompt: { ...s.prompt, isOpen: false } }));
  },
}));
