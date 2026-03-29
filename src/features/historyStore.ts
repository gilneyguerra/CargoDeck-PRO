import { create } from 'zustand';
import type { CargoState } from './cargoStore';

interface HistoryState {
  past: CargoState[];
  limit: number;
  pushState: (state: CargoState) => void;
  undo: () => CargoState | null;
}

const historyStore = create<HistoryState>((set, get) => ({
  past: [],
  limit: 30,
  pushState: (state) => {
    set((state) => {
      // Deep clone the state to avoid mutations
      const clonedState = JSON.parse(JSON.stringify(state));
      const past = [...get().past, clonedState];
      // Enforce limit
      if (past.length > get().limit) {
        past.shift(); // Remove the oldest
      }
      return { past };
    });
  },
  undo: () => {
    const { past } = get();
    if (past.length === 0) return null;
    // Get the last state (most recent)
    const previous = past[past.length - 1];
    // Remove the last state from past
    const newPast = past.slice(0, -1);
    set({ past: newPast });
    return previous;
  },
}));

export const useHistoryStore = () => historyStore;
export { historyStore };