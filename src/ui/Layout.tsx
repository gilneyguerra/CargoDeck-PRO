import type { ReactNode } from 'react';
// BUILD_VERSION: 1.10.4-REDEPLOY-SYNC-V2
import { Header } from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  // Removido appVersion da store, pois não existe no CargoState
  const staticVersion = "1.10";

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg text-text transition-colors duration-300">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-main transition-colors duration-300">
          {children}
        </main>
      </div>
      
      <div className="flex items-center justify-end px-6 py-2 bg-header/50 border-t border-subtle text-[10px] text-secondary/80 shrink-0 transition-colors duration-300 font-mono tracking-widest uppercase">
        <span className="font-black mr-2 opacity-90">CargoDeck Pro Logistics System</span>
        <span className="opacity-60 font-black">Build v{staticVersion}</span>
      </div>
    </div>
  );
}
