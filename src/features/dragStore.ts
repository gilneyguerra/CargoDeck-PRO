import { create } from 'zustand';
import type { Cargo } from '@/domain/Cargo';

export interface DragState {
  isDragging: boolean;
  draggedCargo: Cargo | null;
  isRotated: boolean;
  ghostPosition: { x: number; y: number } | null;
  startDrag: (cargo: Cargo, initialEvent: React.DragEvent | DragEvent) => void;
  updateGhostPosition: (x: number, y: number) => void;
  toggleRotation: () => void;
  endDrag: () => void;
}

export const useDragStore = create<DragState>((set, get) => ({
  isDragging: false,
  draggedCargo: null,
  isRotated: false,
  ghostPosition: null,

  startDrag: (cargo, event) => {
    // Hide the default browser drag image
    if (event.dataTransfer) {
      const img = new Image();
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      event.dataTransfer.setDragImage(img, 0, 0);
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', cargo.id);
    }
    set({
      isDragging: true,
      draggedCargo: cargo,
      isRotated: cargo.isRotated ?? false,
      ghostPosition: { x: (event as any).clientX, y: (event as any).clientY }
    });
  },

  updateGhostPosition: (x, y) => {
    if (get().isDragging) {
      set({ ghostPosition: { x, y } });
    }
  },

  toggleRotation: () => {
    if (get().isDragging) {
      set(state => ({ isRotated: !state.isRotated }));
    }
  },

  endDrag: () => {
    set({
      isDragging: false,
      draggedCargo: null,
      isRotated: false,
      ghostPosition: null
    });
  }
}));
