import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

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

interface NotificationState {
  notifications: Notification[];
  banner: BannerState;
  confirm: ConfirmState;
  
  // Toasts
  notify: (message: string, type?: NotificationType, duration?: number) => void;
  removeNotification: (id: string) => void;
  
  // Banner
  setBanner: (message: string, progress?: number) => void;
  hideBanner: () => void;
  
  // Confirm Dialog
  ask: (title: string, message: string) => Promise<boolean>;
  closeConfirm: () => void;
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
  }
}));
