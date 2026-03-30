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
        <main className="flex-1 overflow-auto bg-bg/50 p-6">
          {children}
        </main>
      </div>
      <div className="flex items-center justify-between px-4 py-2 bg-border border-t border-border text-[10px] text-muted shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-border border-border rounded">Arraste</kbd>
            <span>→ carga para posição</span>
          </span>
          <span className="text-muted">|</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-border border-border rounded">R</kbd>
            <span>gira carga</span>
          </span>
          <span className="text-muted">|</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-border border-border rounded">Del</kbd>
            <span>remove carga</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted">CargoDeck Pro v1.0</span>
        </div>
      </div>
    </div>
  );
}
