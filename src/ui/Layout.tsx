import type { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useCargoStore } from '@/features/cargoStore';
import { Undo2 } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { undo, canUndo } = useCargoStore();
  
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg text-text">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-neutral-200 dark:bg-bg/50 p-6">
          {children}
        </main>
      </div>
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-200 dark:bg-border border-t border-neutral-300 dark:border-border text-[10px] text-neutral-600 dark:text-muted shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => undo()}
            disabled={!canUndo()}
            className="flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
            title="Desfazer (Ctrl+Z)"
          >
            <kbd className="px-1.5 py-0.5 bg-neutral-300 dark:bg-border border border-neutral-400 dark:border-border rounded">Ctrl+Z</kbd>
            <span>Desfaz</span>
            <Undo2 className="w-3 h-3" />
          </button>
          <span className="text-neutral-400 dark:text-muted">|</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-neutral-300 dark:bg-border border border-neutral-400 dark:border-border rounded">Arraste</kbd>
            <span>→ carga para posição</span>
          </span>
          <span className="text-neutral-400 dark:text-muted">|</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-neutral-300 dark:bg-border border border-neutral-400 dark:border-border rounded">R</kbd>
            <span>gira carga</span>
          </span>
          <span className="text-neutral-400 dark:text-muted">|</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-neutral-300 dark:bg-border border border-neutral-400 dark:border-border rounded">Del</kbd>
            <span>remove carga</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-neutral-600 dark:text-muted">CargoDeck Pro v1.0</span>
        </div>
      </div>
    </div>
  );
}
