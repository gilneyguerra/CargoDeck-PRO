import { useEffect, useState } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface Props {
  /** Valor final do contador. */
  end: number;
  /** Duração da contagem em ms. Default 1500. */
  duration?: number;
  /** Casas decimais. Default 0. */
  decimals?: number;
  /** Prefixo (ex.: 'R$ '). */
  prefix?: string;
  /** Sufixo (ex.: ' t', '%'). */
  suffix?: string;
  className?: string;
}

/**
 * Contador animado de 0 ao valor final com easeOutCubic. Dispara quando o
 * elemento entra no viewport (uma única vez). Sem deps externas — usa
 * requestAnimationFrame e useScrollReveal.
 */
export function CountUp({
  end,
  duration = 1500,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}: Props) {
  const [ref, isVisible] = useScrollReveal<HTMLSpanElement>({ threshold: 0.5 });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    let raf: number;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(end * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isVisible, end, duration]);

  const formatted = value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
