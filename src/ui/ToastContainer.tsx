import { useNotificationStore, NotificationType } from '@/features/notificationStore';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState, type ReactNode } from 'react';

const icons: Record<NotificationType, ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-green-500" />,
  error: <AlertCircle className="w-5 h-5 text-red-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
};

export function ToastContainer() {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 w-80 max-w-[90vw]">
      {notifications.map((n) => (
        <ToastItem key={n.id} notification={n} onRemove={() => removeNotification(n.id)} />
      ))}
    </div>
  );
}

function ToastItem({ notification: n, onRemove }: { notification: any; onRemove: () => void }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (n.duration && n.duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
      }, n.duration - 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [n.duration]);

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-300 transform",
        "bg-white/80 dark:bg-neutral-900/80 border-neutral-200 dark:border-neutral-700",
        isExiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100 animate-in fade-in slide-in-from-right-2"
      )}
    >
      <div className="shrink-0 mt-0.5">{icons[n.type as NotificationType]}</div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-800 dark:text-neutral-100 leading-tight">
          {n.message}
        </p>
      </div>
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(onRemove, 300);
        }}
        className="shrink-0 p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
