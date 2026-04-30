import { useEffect, useRef, useState } from 'react';

interface UseScrollRevealOptions {
  /** Fração do elemento visível para disparar (0–1). Default 0.25. */
  threshold?: number;
  /** Margin do root (mesmo formato do IntersectionObserver). Default '0px 0px -10% 0px'. */
  rootMargin?: string;
  /** Se true (default), reveala uma vez e desconecta. */
  once?: boolean;
}

/**
 * Hook de scroll reveal baseado em IntersectionObserver. Retorna um ref que
 * deve ser anexado ao elemento alvo e um boolean `isVisible` que vira true
 * assim que o elemento entra no viewport conforme o threshold.
 *
 * Fallback: ambientes sem IntersectionObserver (server-side, browsers muito
 * antigos) recebem `isVisible = true` imediato — preferimos mostrar conteúdo
 * sem animação a esconder algo do usuário.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollRevealOptions = {}
): [React.RefObject<T | null>, boolean] {
  const { threshold = 0.25, rootMargin = '0px 0px -10% 0px', once = true } = options;
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setIsVisible(false);
          }
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, isVisible];
}
