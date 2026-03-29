import type { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-neutral-950 text-neutral-100">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-neutral-950/50 p-6">
          {children}
        </main>
      </div>
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-t border-neutral-800 text-[10px] text-neutral-500 shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded">Arraste</kbd>
            <span>→ carga para posição</span>
          </span>
          <span className="text-neutral-700">|</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded">R</kbd>
            <span>gira carga</span>
          </span>
          <span className="text-neutral-700">|</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded">Del</kbd>
            <span>remove carga</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-neutral-600">CargoDeck Pro v1.0</span>
        </div>
      </div>
    </div>
  );
}
