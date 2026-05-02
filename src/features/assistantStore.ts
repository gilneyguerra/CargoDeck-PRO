import { create } from 'zustand';

/**
 * @file Mini store para o estado do Assistente IA flutuante (chat widget).
 *
 * Antes o `showAssistant` era state local em ModalGenerationPage e o
 * botão IA vivia no toolbar daquela página. Migramos para FAB global
 * acessível de qualquer rota — o estado precisa viver fora de uma única
 * página. Zustand sem persist (state é volátil; cada sessão começa
 * fechado).
 */

interface AssistantState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set(s => ({ open: !s.open })),
}));
