import { useState } from 'react';
import { useCargoStore } from '@/features/cargoStore';
import { Settings, Plus, Search, Trash2, Edit } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { Bay } from '@/domain/Bay';
import type { Cargo } from '@/domain/Cargo';
import type { CargoLocation } from '@/domain/Location';
import { DeckSettingsModal } from './DeckSettingsModal';
import type { DeckConfig } from '@/domain/DeckConfig';
import DraggableCargo from './DraggableCargo';


function LocationTab({ loc, isActive, onClick, onEdit, onDelete }: { loc: CargoLocation, isActive: boolean, onClick: () => void, onEdit: (loc: CargoLocation) => void, onDelete: (id: string) => void }) {
   const { setNodeRef } = useDroppable({
     id: `tab-${loc.id}`
   });

   const tabWeight = loc.bays.reduce((acc, bay) => acc + bay.currentWeightTonnes, 0);

    return (
      <div className="relative flex items-center gap-1">
        <button
          ref={setNodeRef}
          onClick={onClick}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-b-2 mb-[-1px] flex items-center gap-2 flex-1",
            isActive 
              ? "border-indigo-500 text-indigo-700 dark:text-indigo-300 bg-indigo-500/20 rounded-t-md font-bold" 
              : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200"
          )}
        >
          <span>{loc.name}</span>
          {tabWeight > 0 && (
             <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-bold tracking-wide",
                isActive ? "bg-indigo-500/30 text-indigo-800 dark:text-indigo-200" : "bg-neutral-300 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-500"
             )}>
               {tabWeight.toFixed(1)} t
             </span>
          )}
        </button>
        
        {/* Edit button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onEdit(loc);
          }}
          className="text-neutral-500 dark:text-neutral-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors p-1 rounded hover:bg-blue-900/20"
          title="Editar local"
        >
          <Edit className="w-4 h-4" />
        </button>
        
        {/* Delete button - only show if more than one location exists */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(loc.id);
          }}
          className="text-neutral-500 dark:text-neutral-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 rounded hover:bg-red-900/20"
          title="Excluir local"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
 }

function DroppableBaySide({ bay, side, isLast, deckConfig, searchTerm, onEdit }: { bay: Bay, side: 'port'|'center'|'starboard', isLast: boolean, deckConfig: DeckConfig, searchTerm: string, onEdit: (cargo: Cargo) => void }) {
    const { isOver, setNodeRef } = useDroppable({
      id: `${bay.id}-${side}`,
    });

    const cargoes = bay.allocatedCargoes.filter(c => c.positionInBay === side || (!c.positionInBay && side === 'center'));

    // Calculate dimensions based on deck config
    const sideWidth = side === 'port' 
      ? (deckConfig.portWidthMeters || 5) 
      : side === 'center' 
        ? (deckConfig.centerWidthMeters || 5) 
        : (deckConfig.starboardWidthMeters || 5);

    const bayLength = deckConfig.bayLengthMeters !== undefined 
       ? deckConfig.bayLengthMeters 
       : (deckConfig.numberOfBays > 0 ? (deckConfig.lengthMeters / deckConfig.numberOfBays) : 0);

    const maxArea = sideWidth * bayLength;
    const currentOccupiedArea = cargoes.reduce((acc, c) => acc + (c.widthMeters * c.lengthMeters * c.quantity), 0);
    const isOverArea = maxArea > 0 && currentOccupiedArea > maxArea;

     return (
       <div 
         ref={setNodeRef}
         className={cn(
           "flex-1 min-h-[80px] flex flex-col items-start p-2 relative transition-colors",
           !isLast && "border-r border-dashed border-neutral-400 dark:border-neutral-700/50",
           isOver ? "bg-indigo-500/20" : "",
           isOverArea && !isOver ? "bg-red-950/20" : ""
         )}
       >
      <div className="w-full flex justify-between items-center mb-2 px-1 border-b border-neutral-300 dark:border-neutral-800/50 pb-1">
         <span className="opacity-40 font-bold text-[9px] tracking-widest">{side === 'port' ? 'BOMBORDO' : side === 'center' ? 'CENTRO' : 'BORESTE'}</span>
         <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded", isOverArea ? "bg-red-500/20 text-red-400" : "bg-black/30 dark:bg-black/30 text-neutral-600 dark:text-neutral-500")}>
            {currentOccupiedArea.toFixed(1)} / {maxArea.toFixed(1)} m²
         </span>
     </div>
      
            <div className="flex flex-wrap gap-2 items-start content-start justify-center w-full">
              {cargoes.map(cargo => (
                <DraggableCargo 
                  key={cargo.id} 
                  cargo={cargo} 
                  isHighlight={searchTerm.length > 0 && 
                    (cargo.identifier.toLowerCase().includes(searchTerm.toLowerCase()) || 
                     cargo.description.toLowerCase().includes(searchTerm.toLowerCase()))}
                  onEdit={onEdit}
                />
              ))}
            </div>
    </div>
  );
}

function DroppableBay({ bay, activeLocation, searchTerm, onEdit }: { bay: Bay, activeLocation: CargoLocation, searchTerm: string, onEdit: (cargo: Cargo) => void }) {
    const percentOccupied = bay.maxAreaSqMeters ? (bay.currentOccupiedArea / bay.maxAreaSqMeters) * 100 : 0;
    const isOverArea = percentOccupied > 100;

return (
  <div 
    className={cn(
      "w-full border-2 rounded-md relative flex flex-col items-center pt-8 transition-colors min-h-[80px]",
      "bg-neutral-200 dark:bg-[#1f1f26] border-dashed border-neutral-400 dark:border-[#2d2d38]"
    )}
  >
      <div className="absolute top-2 left-2 flex items-center gap-2">
        <span className="bg-black/30 dark:bg-black/40 text-neutral-600 dark:text-neutral-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-neutral-400 dark:border-neutral-800/50">
          Baia {String(bay.number).padStart(2, '0')}
        </span>
      </div>

      <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
        <span className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded",
          bay.currentWeightTonnes > bay.maxWeightTonnes ? "bg-red-500/20 text-red-500" : "bg-neutral-300 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-400"
        )}>
          {bay.currentWeightTonnes.toFixed(1)} / {bay.maxWeightTonnes}t
        </span>
        <span className={cn(
          "text-[9px] font-bold px-1.5 py-0.5 rounded",
          isOverArea ? "bg-red-500/20 text-red-500" : "bg-neutral-300/50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-500"
        )}>
          {bay.currentOccupiedArea.toFixed(1)} / {bay.maxAreaSqMeters.toFixed(1)} m²
        </span>
      </div>

      <div className="flex w-full mt-2 relative z-10 border-t border-dashed border-neutral-400 dark:border-neutral-700/50">
          <DroppableBaySide bay={bay} side="port" isLast={false} deckConfig={activeLocation.config} searchTerm={searchTerm} onEdit={onEdit} />
          <DroppableBaySide bay={bay} side="center" isLast={false} deckConfig={activeLocation.config} searchTerm={searchTerm} onEdit={onEdit} />
          <DroppableBaySide bay={bay} side="starboard" isLast={true} deckConfig={activeLocation.config} searchTerm={searchTerm} onEdit={onEdit} />
        </div>
      </div>
    );
 }

export function DeckArea() {
     const { locations, activeLocationId, setActiveLocation, addLocation, searchTerm, setSearchTerm, unallocatedCargoes, getAllCargo, setEditingCargo, editLocation, deleteLocation } = useCargoStore();
    const activeLocation = locations.find(l => l.id === activeLocationId);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [searchMessage, setSearchMessage] = useState('');

    const handleAddLocation = () => {
        const name = prompt('Nome do novo local: (ex. Porão 1)');
        if (name) addLocation(name);
    };

    if (!activeLocation) return <div className="text-gray-700 dark:text-white p-6">Nenhum local ativo.</div>;
    const { bays } = activeLocation;

    return (
        <div className="flex flex-col h-full w-full">
             {/* Tabs / Sub-nav */}
             <div className="flex items-center gap-1 mb-4 border-b border-neutral-300 dark:border-neutral-800 pb-2 overflow-x-auto shrink-0 scrollbar-hide">
                 {locations.map(loc => (
                     <LocationTab 
                       key={loc.id} 
                       loc={loc} 
                       isActive={activeLocationId === loc.id} 
                       onClick={() => setActiveLocation(loc.id)}
                       onEdit={(editLoc) => {
                         const name = prompt('Editar nome do local:', editLoc.name);
                         if (name !== null && name.trim() !== '') {
                           editLocation(editLoc.id, { name: name.trim() });
                         }
                       }}
                       onDelete={(locId) => {
                         if (window.confirm('Tem certeza que deseja excluir este local? Todas as cargas nesse local serão removidas.')) {
                           deleteLocation(locId);
                         }
                       }}
                     />
                 ))}
                 <button 
                   onClick={handleAddLocation}
                   className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-neutral-500 dark:text-neutral-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors ml-2"
                 >
                   <Plus className="w-4 h-4" /> Novo Local
                 </button>
             </div>

            <div className="flex items-center justify-between mb-4 relative">
                <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-neutral-100 tracking-tight">{activeLocation.name}</h2>
                <p className="text-sm text-neutral-500">Arraste as cargas para as baias abaixo.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative flex flex-row items-center gap-2">
                      <input
                        type="text"
                      placeholder="Buscar cargas por identificador..."
                      value={searchTerm}
                      onChange={(e) => {
                        const term = e.target.value;
                        setSearchTerm(term);
                        if (term.trim()) {
                          const allCargo = getAllCargo();
                          const matchingCargos = allCargo.filter(c => 
                            c.identifier.toLowerCase().includes(term.toLowerCase()) || 
                            c.description.toLowerCase().includes(term.toLowerCase())
                          );
                          if (matchingCargos.length > 0) {
                            // Switch to location of first matching cargo
                            const firstCargo = matchingCargos[0];
                            let locId: string | null = null;
                            if (unallocatedCargoes.some(c => c.id === firstCargo.id)) {
                              // No switch
                            } else {
                              for (const loc of locations) {
                                if (loc.bays.some(bay => bay.allocatedCargoes.some(c => c.id === firstCargo.id))) {
                                  locId = loc.id;
                                  break;
                                }
                              }
                            }
                            if (locId && locId !== activeLocationId) {
                              setActiveLocation(locId);
                            }
                            setSearchMessage(`Encontradas ${matchingCargos.length} carga(s)`);
                          } else {
                            setSearchMessage('Carga não encontrada à bordo.');
                          }
                        } else {
                          setSearchMessage('');
                        }
                      }}
                      className="flex-1 min-w-0 px-4 py-2 pl-10 text-sm bg-neutral-200 dark:bg-neutral-800/50 border border-neutral-400 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-neutral-100"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                      {searchMessage && (
                        <div className="text-sm font-medium text-yellow-700 bg-yellow-100 border-yellow-300 dark:text-yellow-400 dark:bg-yellow-400/10 border dark:border-yellow-400/20 px-2 py-1 rounded whitespace-nowrap flex-shrink-0">
                          {searchMessage}
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => setIsSettingsOpen(true)}
                      className="flex items-center gap-2 bg-neutral-300 dark:bg-neutral-800 hover:bg-neutral-400 dark:hover:bg-neutral-700 text-gray-700 dark:text-neutral-300 px-3 py-1.5 rounded-md text-sm transition-colors border border-neutral-400 dark:border-neutral-700 shadow-sm"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Configurar Deck</span>
                    </button>
                </div>
            </div>
            
            <div className="flex-1 bg-neutral-300 dark:bg-[#101014] border border-neutral-400 dark:border-neutral-800/50 rounded-xl p-4 sm:p-6 relative flex flex-col items-center overflow-auto shadow-inner">
                <div className="w-full max-w-[800px] sm:max-w-full md:max-w-[1000px] lg:max-w-[1200px] min-h-[600px] sm:min-h-[800px] h-full bg-neutral-200 dark:bg-[#18181f] border border-neutral-400 dark:border-neutral-800 rounded-t-[50px] sm:rounded-t-[100px] rounded-b-xl relative flex flex-col p-4 sm:p-6 shadow-2xl">
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 text-neutral-500 dark:text-neutral-600 text-[10px] font-bold tracking-[0.3em] uppercase">Proa</div>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-neutral-500 dark:text-neutral-600 text-[10px] font-bold tracking-[0.3em] uppercase">Popa</div>
                    <div className="absolute left-[-28px] top-1/2 -translate-y-1/2 -rotate-90 text-neutral-500 dark:text-neutral-600 text-[10px] font-bold tracking-[0.3em] uppercase">Bombordo</div>
                    <div className="absolute right-[-24px] top-1/2 -translate-y-1/2 rotate-90 text-neutral-500 dark:text-neutral-600 text-[10px] font-bold tracking-[0.3em] uppercase">Boreste</div>
                    
                     <div className="flex-1 mt-6 mb-4 flex flex-col gap-3 relative z-10 w-full overflow-auto">
                         {bays.map(bay => (
                             <DroppableBay key={bay.id} bay={bay} activeLocation={activeLocation} searchTerm={searchTerm} onEdit={setEditingCargo} />
                         ))}
                     </div>
                </div>
            </div>
            
            <DeckSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
}
