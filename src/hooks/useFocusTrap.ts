import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface UseFocusTrapOptions {
  isActive: boolean;
  onEscape?: () => void;
}

/**
 * Captura Tab/Shift+Tab dentro do container e cicla foco entre elementos focáveis.
 * Esc dispara `onEscape` (caso fornecido). Restaura foco no elemento anterior ao desmontar.
 */
export function useFocusTrap<T extends HTMLElement>({ isActive, onEscape }: UseFocusTrapOptions) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Foco inicial no primeiro elemento focável (se houver)
    const focusFirst = () => {
      const root = containerRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusables.length > 0) focusables[0].focus();
    };
    // Pequeno delay para garantir que o DOM do modal foi montado
    const timer = window.setTimeout(focusFirst, 30);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }

      if (e.key !== 'Tab') return;
      const root = containerRef.current;
      if (!root) return;

      const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      // Restaura foco anterior
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [isActive, onEscape]);

  return containerRef;
}
