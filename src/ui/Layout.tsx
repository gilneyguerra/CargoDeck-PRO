import type { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg text-text transition-colors duration-300">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-neutral-200 dark:bg-[#111116] p-6 transition-colors duration-300">
          {children}
        </main>
      </div>
      <div className="flex items-center justify-end px-4 py-1.5 bg-neutral-200 dark:bg-[#16161d] border-t border-neutral-300 dark:border-[#2d2d38] text-[10px] text-neutral-500 dark:text-neutral-400 shrink-0 transition-colors duration-300">
        <span>CargoDeck Pro v1.0</span>
      </div>
    </div>
  );
}
