import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
// BUILD_VERSION: 1.14.0-OCR-FIX-V1
import { Header } from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  // Removido appVersion da store, pois não existe no CargoState
  const staticVersion = "1.14";
  // Sidebar só aparece na rota /deck; em /modais e /contentores o conteúdo
  // ocupa toda a largura para a toolbar dedicada operar com mais espaço.
  const { pathname } = useLocation();
  const showSidebar = pathname === '/deck';

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg text-text transition-colors duration-300 font-sans">
      <Header />
      <div className="flex flex-1 overflow-hidden w-full mx-auto border-x border-subtle">
        {showSidebar && <Sidebar />}
        <main className="deck-container flex-1 overflow-y-auto p-4 lg:p-6 bg-main transition-colors duration-300 relative">
          {children}
        </main>
      </div>
      
      <div className="flex items-center justify-between px-10 py-3 bg-header/80 border-t border-subtle shrink-0 transition-colors duration-300 glass">
        {/* Left tagline — prosa em sans, tracking elegante */}
        <span className="text-[11px] font-bold text-primary uppercase tracking-[0.25em]">
          Professional Offshore Stowage Intelligence
        </span>
        {/* Right build/version — mono+tabular para harmonizar com identidade
            técnica/numérica (versão + ano são valores estruturados). */}
        <span className="text-[11px] font-mono font-black tabular-nums text-primary tracking-[0.18em]">
          BUILD V{staticVersion} • 2026
        </span>
      </div>
    </div>
  );
}
