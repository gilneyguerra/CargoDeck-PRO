interface Props {
  /** Nome do keyframe CSS (ex.: 'cursor-excel-flow'). */
  animation: string;
  /** Duração da animação em segundos. Default 6. */
  duration?: number;
  /** Delay antes de iniciar (segundos). Default 0. */
  delay?: number;
  className?: string;
}

/**
 * Cursor SVG estilizado com pulse-ring atrás. A animação é controlada via
 * keyframe CSS externo (definido no <style> do LandingPage) para que a
 * trajetória possa ser customizada por mock.
 */
export function AnimatedCursor({ animation, duration = 6, delay = 0, className = '' }: Props) {
  return (
    <div
      className={`absolute pointer-events-none z-30 ${className}`}
      style={{
        animation: `${animation} ${duration}s ease-in-out ${delay}s infinite`,
      }}
    >
      <div className="relative">
        {/* Pulse ring — bate junto com clique */}
        <span className="absolute -inset-2 rounded-full bg-cyan-neon/30 blur-sm animate-ping" />
        <span className="absolute inset-0 rounded-full bg-cyan-neon/20" />

        {/* Cursor pointer */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          className="relative drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
        >
          <path
            d="M3 3 L3 17 L7.5 13 L10 19 L13 17.5 L10.5 11.5 L17 11.5 Z"
            fill="white"
            stroke="#0f172a"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
