import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { Layout } from '@/ui/Layout';
import { DeckArea } from '@/ui/DeckArea';
import { useCargoStore } from '@/features/cargoStore';
import { useState } from 'react';
import type { Cargo } from '@/domain/Cargo';
import { useAuthAndHydration } from '@/hooks/useAuthAndHydration';
import { useAutoSave } from '@/hooks/useAutoSave';

function App() {
  const { 
    moveCargoToBay, unallocatedCargoes, locations, 
    activeLocationId, setActiveLocation 
  } = useCargoStore();

  const [activeCargo, setActiveCargo] = useState<Cargo | null>(null);

  useAuthAndHydration();
  useAutoSave();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const id = active.id as string;
    
    let cargo = unallocatedCargoes.find(c => c.id === id);
    if (!cargo) {
      for (const loc of locations) {
        for (const bay of loc.bays) {
           const found = bay.allocatedCargoes.find(c => c.id === id);
           if (found) { cargo = found; break; }
        }
      }
    }
    setActiveCargo(cargo || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCargo(null);
    
    if (over && over.id) {
      const fullBayId = String(over.id);
      if (fullBayId.startsWith('bay-')) {
        moveCargoToBay(String(active.id), fullBayId);
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over && String(over.id).startsWith('tab-')) {
      const targetLocId = String(over.id).replace('tab-', '');
      if (activeLocationId !== targetLocId) {
        setActiveLocation(targetLocId);
      }
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <Layout>
        <DeckArea />
      </Layout>
      <DragOverlay>
        {activeCargo ? (
          <div className="bg-neutral-800 border-2 border-indigo-500 rounded p-3 opacity-95 shadow-2xl scale-105 cursor-grabbing w-64">
            <div className="flex items-start justify-between mb-2">
              <span className="text-sm font-medium text-neutral-100">{activeCargo.description}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-xs bg-neutral-900 px-1.5 rounded">{activeCargo.weightTonnes}t</span>
              <span className="text-xs text-indigo-400">{activeCargo.category}</span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export default App
