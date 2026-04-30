import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';

interface Props {
  url?: string;
  /** Título opcional exibido à direita (substitui ícone se quiser). */
  title?: string;
  children: ReactNode;
  className?: string;
  /** Aspect ratio do conteúdo (ex.: 'aspect-[16/10]', 'aspect-[4/5]'). Default 16:10. */
  aspect?: string;
}

/**
 * Moldura de navegador com 3 dots semáforo + URL bar. Usada como wrapper
 * dos mockups da landing page para sugerir "isto é uma tela do app".
 */
export function MockBrowserFrame({
  url = 'cargodeck-pro.vercel.app',
  title,
  children,
  className = '',
  aspect = 'aspect-[16/10]',
}: Props) {
  return (
    <div className={`relative ${className}`}>
      {/* Glow halo de fundo — fica atrás da janela, dá depth visual */}
      <div className="absolute -inset-8 bg-action/15 blur-[100px] rounded-full opacity-50 -z-10 pointer-events-none" />

      {/* Janela */}
      <div className="relative rounded-2xl overflow-hidden bg-[#0f172a] border border-white/10 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.5)] ring-1 ring-action/10">
        {/* URL bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0b1220] border-b border-white/5">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
          </div>
          <div className="flex-1 mx-2 px-3 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] text-white/50 font-mono truncate flex items-center gap-2">
            <Lock size={10} className="text-emerald-400/80 shrink-0" />
            <span className="truncate">{url}</span>
          </div>
          {title && (
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest hidden sm:block whitespace-nowrap">
              {title}
            </span>
          )}
        </div>

        {/* Conteúdo */}
        <div className={`relative ${aspect} bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#0b1220]`}>
          {children}
        </div>
      </div>
    </div>
  );
}
