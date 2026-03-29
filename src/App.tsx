import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { Layout } from '@/ui/Layout';
import { DeckArea } from '@/ui/DeckArea';
import { useCargoStore } from '@/features/cargoStore';
import { useState } from 'react';
import type { Cargo } from '@/domain/Cargo';
import { useAuthAndHydration } from '@/hooks/useAuthAndHydration';
import { useAutoSave } from '@/hooks/useAutoSave';
import { CargoPreview } from '@/ui/CargoPreview';
import { Edit, Trash2 } from 'lucide-react';
import { getCargoFontSize, getCargoIconSize } from '@/lib/scaling';
import { cn } from '@/lib/utils';

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
        const fullId = String(over.id);
        // Extract the bay ID and side from format "{bayId}-{side}" where side is port/center/starboard
        if (fullId.endsWith('-port') || fullId.endsWith('-center') || fullId.endsWith('-starboard')) {
          const lastHyphenIndex = fullId.lastIndexOf('-');
          if (lastHyphenIndex > 0) {
            const bayId = fullId.substring(0, lastHyphenIndex);
            const side = fullId.substring(lastHyphenIndex + 1) as 'port' | 'center' | 'starboard';
            moveCargoToBay(String(active.id), bayId, side);
          }
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
          <div 
            className={cn(
              "border border-indigo-500/70 rounded flex flex-col gap-2 p-2 opacity-95 shadow-2xl cursor-grabbing",
              "bg-neutral-900/95"
            )}
            style={{ 
              minWidth: '100px',
              maxWidth: '160px'
            }}
          >
            <CargoPreview 
              format={activeCargo.format || 'Retangular'} 
              length={activeCargo.lengthMeters} 
              width={activeCargo.widthMeters} 
              height={activeCargo.heightMeters || 1} 
              color={activeCargo.color || '#3b82f6'} 
              quantity={activeCargo.quantity} 
              weightTonnes={activeCargo.weightTonnes}
              cargo={activeCargo}
            />
            <div className="text-xs text-neutral-300 text-center font-medium leading-tight px-1">
              {activeCargo.description}
            </div>
            <div className="flex flex-wrap gap-1 justify-center text-[10px] text-neutral-400">
              <span className="bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-700">
                {activeCargo.quantity} x {activeCargo.weightTonnes.toFixed(1)} t
              </span>
              <span className="bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-700">
                {activeCargo.lengthMeters}x{activeCargo.widthMeters} m
              </span>
              <span className="bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20">
                {activeCargo.category}
              </span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export default App
