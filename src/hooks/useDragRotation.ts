import { useEffect, useCallback, useRef } from 'react';

/**
 * Hook that listens for the 'R' key during an active drag to toggle cargo rotation.
 * Mimics vapozeiro.com.br's rotation behaviour during drag.
 */
export function useDragRotation(
  isDragging: boolean,
  isRotated: boolean,
  setIsRotated: (v: boolean) => void
) {
  // Keep a stable ref to avoid stale closure in the event listener
  const isRotatedRef = useRef(isRotated);
  isRotatedRef.current = isRotated;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isDragging) return;
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setIsRotated(!isRotatedRef.current);
      }
    },
    [isDragging, setIsRotated]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
