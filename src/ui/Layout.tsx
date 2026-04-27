import type { ReactNode } from 'react';
// BUILD_VERSION: 1.14.0-OCR-FIX-V1
import { Header } from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  // Removido appVersion da store, pois não existe no CargoState
  const staticVersion = "1.14";

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg text-text transition-colors duration-300 font-sans">
      <Header />
      <div className="flex flex-1 overflow-hidden max-w-[1600px] w-full mx-auto shadow-high border-x border-subtle">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 bg-main transition-colors duration-300 relative">
          {children}
        </main>
      </div>
      
      <div className="flex items-center justify-between px-10 py-3 bg-header/80 border-t border-subtle text-[10px] text-muted shrink-0 transition-colors duration-300 font-mono tracking-[0.2em] uppercase glass">
        <span className="font-extrabold">Professional Offshore Stowage Intelligence</span>
        <span className="font-extrabold text-primary">BUILD V{staticVersion} • 2026</span>
      </div>
    </div>
  );
}
