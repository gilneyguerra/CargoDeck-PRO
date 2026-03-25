import { useState } from 'react';
import { useCargoStore } from '@/features/cargoStore';
import { Settings, Plus, Trash2, Search } from 'lucide-react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { Bay } from '@/domain/Bay';
import type { Cargo } from '@/domain/Cargo';
import type { CargoLocation } from '@/domain/Location';
import { DeckSettingsModal } from './DeckSettingsModal';

function LocationTab({ loc, isActive, onClick }: { loc: CargoLocation, isActive: boolean, onClick: () => void }) {
  const { setNodeRef } = useDroppable({
    id: `tab-${loc.id}`
  });

  const tabWeight = loc.bays.reduce((acc, bay) => acc + bay.currentWeightTonnes, 0);

  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        "px-4 py-2 text-sm font-medium transition-colors border-b-2 mb-[-1px] flex items-center gap-2",
        isActive 
          ? "border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-md" 
          : "border-transparent text-neutral-400 hover:text-neutral-200"
      )}
    >
      <span>{loc.name}</span>
      {tabWeight > 0 && (
         <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-full font-bold tracking-wide",
            isActive ? "bg-indigo-500/20 text-indigo-200" : "bg-neutral-800 text-neutral-500"
         )}>
           {tabWeight.toFixed(1)} t
         </span>
      )}
    </button>
  );
}

function DraggableAllocatedCargo({ cargo }: { cargo: Cargo }) {
   const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
     id: cargo.id,
   });
   const { deleteCargo } = useCargoStore();
   
   const style = transform ? {
     transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
   } : undefined;

   const handleDelete = async () => {
     await deleteCargo(cargo.id);
   };

   return (
     <div 
       ref={setNodeRef} 
       style={style} 
       {...listeners} 
       {...attributes}
       className={cn(
         "bg-[#242436] border border-[#3b3b55] hover:border-indigo-400 cursor-grab active:cursor-grabbing rounded p-1.5 text-xs text-neutral-200 shadow-[0_4px_10px_rgba(0,0,0,0.5)] flex flex-col items-center min-w-[70px] transition-transform relative z-20",
         isDragging ? "opacity-30 scale-105" : "hover:scale-105"
       )}
     >
       <div className="flex items-center justify-between w-full">
         <span className="font-medium text-center text-[10px] mt-1 leading-tight line-clamp-2 w-full px-1">
           {cargo.description}
         </span>
         <button 
           onClick={handleDelete}
           className="text-red-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-900/20"
           title="Excluir carga"
         >
           <Trash2 className="w-4 h-4" />
         </button>
       </div>
       <span className="text-[9px] text-[#6c6c8c] mt-auto mb-1 bg-black/30 px-1 rounded">
         {cargo.weightTonnes}t | {cargo.lengthMeters}x{cargo.widthMeters}m
       </span>
     </div>
   )
 }

function DroppableBaySide({ bay, side, isLast, deckConfig }: { bay: Bay, side: 'port'|'center'|'starboard', isLast: boolean, deckConfig: any }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `${bay.id}-${side}`,
  });

  const cargoes = bay.allocatedCargoes.filter(c => c.positionInBay === side || (!c.positionInBay && side === 'center'));

  let sideWidth = 5;
  if (side === 'port') sideWidth = deckConfig.portWidthMeters || 5;
  if (side === 'center') sideWidth = deckConfig.centerWidthMeters || 5;
  if (side === 'starboard') sideWidth = deckConfig.starboardWidthMeters || 5;

  const bayLength = deckConfig.bayLengthMeters !== undefined 
     ? deckConfig.bayLengthMeters 
     : (deckConfig.numberOfBays > 0 ? (deckConfig.lengthMeters / deckConfig.numberOfBays) : 0);
  const maxArea = sideWidth * bayLength;
  const currentOccupiedArea = cargoes.reduce((acc, c) => acc + (c.widthMeters * c.lengthMeters), 0);
  const isOverArea = maxArea > 0 && currentOccupiedArea > maxArea;

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "flex-1 min-h-[120px] flex flex-col items-start p-2 relative transition-colors",
        !isLast && "border-r border-dashed border-neutral-700/50",
        isOver ? "bg-indigo-500/20" : "",
        isOverArea && !isOver ? "bg-red-950/20" : ""
      )}
    >
      <div className="w-full flex justify-between items-center mb-2 px-1 border-b border-neutral-800/50 pb-1">
         <span className="opacity-40 font-bold text-[9px] tracking-widest">{side === 'port' ? 'BOMBORDO' : side === 'center' ? 'CENTRO' : 'BORESTE'}</span>
         <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded", isOverArea ? "bg-red-500/20 text-red-400" : "bg-black/30 text-neutral-500")}>
            {currentOccupiedArea.toFixed(1)} / {maxArea.toFixed(1)} m²
         </span>
      </div>
      
      <div className="flex flex-wrap gap-2 items-start content-start justify-center w-full">
        {cargoes.map(cargo => (
           <DraggableAllocatedCargo key={cargo.id} cargo={cargo} />
        ))}
      </div>
    </div>
  );
}

function DroppableBay({ bay, activeLocation }: { bay: Bay, activeLocation: CargoLocation }) {
  const percentOccupied = bay.maxAreaSqMeters ? (bay.currentOccupiedArea / bay.maxAreaSqMeters) * 100 : 0;
  const isOverArea = percentOccupied > 100;

  return (
    <div 
      className={cn(
        "w-full border-2 rounded-md relative flex flex-col items-center pt-8 transition-colors min-h-[120px]",
        "bg-[#1f1f26] border-dashed border-[#2d2d38]"
      )}
    >
      <div className="absolute top-2 left-2 flex items-center gap-2">
        <span className="bg-black/40 text-neutral-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-neutral-800/50">
          Baia {String(bay.number).padStart(2, '0')}
        </span>
      </div>

      <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
        <span className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded",
          bay.currentWeightTonnes > bay.maxWeightTonnes ? "bg-red-500/20 text-red-500" : "bg-neutral-800 text-neutral-400"
        )}>
          {bay.currentWeightTonnes.toFixed(1)} / {bay.maxWeightTonnes}t
        </span>
        <span className={cn(
          "text-[9px] font-bold px-1.5 py-0.5 rounded",
          isOverArea ? "bg-red-500/20 text-red-500" : "bg-neutral-800/50 text-neutral-500"
        )}>
          {bay.currentOccupiedArea.toFixed(1)} / {bay.maxAreaSqMeters.toFixed(1)} m²
        </span>
      </div>

      <div className="flex w-full mt-2 relative z-10 border-t border-dashed border-neutral-700/50">
        <DroppableBaySide bay={bay} side="port" isLast={false} deckConfig={activeLocation.config} />
        <DroppableBaySide bay={bay} side="center" isLast={false} deckConfig={activeLocation.config} />
        <DroppableBaySide bay={bay} side="starboard" isLast={true} deckConfig={activeLocation.config} />
      </div>

    </div>
  )
}

export function DeckArea() {
   const { locations, activeLocationId, setActiveLocation, addLocation, unallocatedCargoes } = useCargoStore();
   const activeLocation = locations.find(l => l.id === activeLocationId);
   const [isSettingsOpen, setIsSettingsOpen] = useState(false);
   const [searchTerm, setSearchTerm] = useState('');

   const handleAddLocation = () => {
     const name = prompt('Nome do novo local: (ex. Porão 1)');
     if (name) addLocation(name);
   };

   if (!activeLocation) return <div className="text-white p-6">Nenhum local ativo.</div>;
   const { bays } = activeLocation;
   
   // Filter unallocated cargoes based on search term
   const filteredUnallocatedCargoes = unallocatedCargoes.filter(cargo =>
     cargo.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
     cargo.description.toLowerCase().includes(searchTerm.toLowerCase())
   );

   return (
     <div className="flex flex-col h-full w-full">
       {/* Tabs / Sub-nav */}
       <div className="flex items-center gap-1 mb-4 border-b border-neutral-800 pb-2 overflow-x-auto shrink-0 scrollbar-hide relative">
         {locations.map(loc => (
           <LocationTab 
             key={loc.id} 
             loc={loc} 
             isActive={activeLocationId === loc.id} 
             onClick={() => setActiveLocation(loc.id)} 
           />
         ))}
         <div className="relative flex-1 min-w-0">
           <input
             type="text"
             placeholder="Buscar cargas por identificador..."
             className="absolute inset-0 px-4 py-2 pl-10 text-sm bg-neutral-800/50 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-100"
           />
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
         </div>
         <button 
           onClick={handleAddLocation}
           className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-neutral-500 hover:text-indigo-400 transition-colors ml-2"
         >
           <Plus className="w-4 h-4" /> Novo Local
         </button>
       </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-100 tracking-tight">{activeLocation.name}</h2>
          <p className="text-sm text-neutral-500">Arraste as cargas para as baias abaixo.</p>
        </div>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-1.5 rounded-md text-sm transition-colors border border-neutral-700 shadow-sm"
        >
          <Settings className="w-4 h-4" />
          <span>Configurar Deck</span>
        </button>
      </div>

      <div className="flex-1 bg-[#101014] border border-neutral-800/50 rounded-xl p-6 relative flex flex-col items-center overflow-auto shadow-inner">
        <div className="w-full max-w-[800px] min-h-[800px] h-full bg-[#18181f] border border-neutral-800 rounded-t-[100px] rounded-b-xl relative flex flex-col p-6 shadow-2xl">
          
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-neutral-600 text-[10px] font-bold tracking-[0.3em] uppercase">Proa</div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-neutral-600 text-[10px] font-bold tracking-[0.3em] uppercase">Popa</div>
          <div className="absolute left-[-28px] top-1/2 -translate-y-1/2 -rotate-90 text-neutral-600 text-[10px] font-bold tracking-[0.3em] uppercase">Bombordo</div>
          <div className="absolute right-[-24px] top-1/2 -translate-y-1/2 rotate-90 text-neutral-600 text-[10px] font-bold tracking-[0.3em] uppercase">Boreste</div>

          <div className="flex-1 mt-6 mb-4 flex flex-col gap-3 relative z-10 w-full">
            {bays.map(bay => (
              <DroppableBay key={bay.id} bay={bay} activeLocation={activeLocation} />
            ))}
          </div>

        </div>
      </div>

      <DeckSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
