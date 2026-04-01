import type { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg text-text">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-neutral-200 dark:bg-bg/50 p-6">
          {children}
        </main>
      </div>
      <div className="flex items-center justify-end px-4 py-1.5 bg-neutral-200 dark:bg-border border-t border-neutral-300 dark:border-border text-[10px] text-neutral-500 dark:text-muted shrink-0">
        <span>CargoDeck Pro v1.0</span>
      </div>
    </div>
  );
}
