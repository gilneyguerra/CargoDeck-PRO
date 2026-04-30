import type { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface Props {
  /** Número exibido em ghost (01, 02, ...). */
  index: number;
  /** Lado do mock: 'lr' = mock à esquerda, texto à direita. 'rl' inverte. */
  direction: 'lr' | 'rl';
  /** Pequeno texto uppercase acima do título (ex.: 'EXTRAÇÃO INTELIGENTE'). */
  eyebrow: string;
  /** Título principal. */
  title: string;
  /** Parágrafo descritivo. */
  description: string;
  /** Bullets curtos (3-5 itens). */
  bullets: string[];
  /** Componente mock que vai dentro da MockBrowserFrame. */
  mock: ReactNode;
  /** aria-label do mock. */
  mockLabel: string;
}

/**
 * Bloco showcase com layout alternado: mock visual de um lado, texto + bullets
 * do outro. Dispara fade-in + slide-up quando entra no viewport.
 */
export function FeatureShowcase({
  index,
  direction,
  eyebrow,
  title,
  description,
  bullets,
  mock,
  mockLabel,
}: Props) {
  const [ref, isVisible] = useScrollReveal<HTMLDivElement>({ threshold: 0.18 });

  return (
    <div
      ref={ref}
      className={cn(
        'grid lg:grid-cols-2 gap-10 lg:gap-20 items-center transition-all duration-700 ease-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      )}
    >
      {/* Mock side */}
      <div
        role="img"
        aria-label={mockLabel}
        className={cn(
          'relative w-full',
          direction === 'rl' ? 'lg:order-2' : 'lg:order-1'
        )}
      >
        {mock}
      </div>

      {/* Text side */}
      <div
        className={cn(
          'space-y-7',
          direction === 'rl' ? 'lg:order-1' : 'lg:order-2'
        )}
      >
        <div className="flex items-start gap-5">
          <span
            className="text-7xl md:text-8xl font-montserrat font-black text-action/15 leading-none tracking-tighter select-none"
            aria-hidden="true"
          >
            {String(index).padStart(2, '0')}
          </span>
          <div className="flex-1 space-y-3 pt-2">
            <p className="text-[10px] font-black text-action uppercase tracking-[0.4em]">
              {eyebrow}
            </p>
            <h3 className="text-3xl md:text-4xl xl:text-5xl font-montserrat font-black tracking-tighter text-maritime uppercase italic leading-[1.05]">
              {title}
            </h3>
          </div>
        </div>

        <p className="text-base md:text-lg text-maritime/65 font-medium leading-relaxed pl-1">
          {description}
        </p>

        <ul className="space-y-3 pl-1">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-3">
              <CheckCircle2
                className="text-action shrink-0 mt-0.5"
                size={18}
                strokeWidth={2.5}
              />
              <span className="text-sm md:text-base text-maritime/80 font-medium leading-snug">
                {b}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
