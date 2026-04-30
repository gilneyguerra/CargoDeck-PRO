// Hierarquia centralizada de Z-index (spec Padronização UI/UX, seção 9)
// Use estas constantes como referência conceitual.
// Nas classes Tailwind, aplicar literais (`z-[1000]`) para preservar IntelliSense.
export const Z_INDEX = {
  TOOLTIP: 50,
  HEADER: 100,
  BANNER: 800,
  TOAST: 900,
  MODAL: 1000,
  ALERT: 1100,
  CARGO_TOOLTIP: 1200,
} as const;

export type ZIndexLayer = keyof typeof Z_INDEX;
