import { useState, memo } from 'react';
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
import { metersToPixels } from '@/lib/scaling';


function LocationTab({ loc, isActive, onClick, onEdit, onDelete }: { loc: CargoLocation, isActive: boolean, onClick: () => void, onEdit: (loc: CargoLocation) => void, onDelete: (id: string) => void }) {
   const { setNodeRef } = useDroppable({
     id: `tab-${loc.id}`
   });

     return (
       <div className="relative flex items-center gap-1 group">
         <button
           ref={setNodeRef}
           onClick={onClick}
           className={cn(
             "px-5 py-2.5 text-[11px] font-black tracking-widest transition-all border rounded-xl flex items-center gap-3 uppercase",
             isActive 
               ? "bg-brand-primary text-white border-brand-primary shadow-xl shadow-brand-primary/20 scale-[1.02] z-10" 
               : "bg-header border-subtle text-muted hover:text-primary hover:border-strong bg-white/50 dark:bg-black/20"
           )}
         >
         <span>{loc.name}</span>
         {(() => {
           const totalCargoes = loc.bays.reduce((acc, bay) => acc + bay.allocatedCargoes.length, 0);
           return totalCargoes > 0 && (
             <span className={cn(
               "text-[9px] px-2 py-0.5 rounded-lg font-black",
               isActive ? "bg-white/20 text-white" : "bg-sidebar text-muted"
             )}>
               {totalCargoes}
             </span>
           );
         })()}
         </button>
         
         <div className="flex items-center absolute -top-2 -right-1 opacity-0 group-hover:opacity-100 transition-all z-20">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(loc); }}
              className="bg-brand-primary text-white p-1.5 rounded-lg shadow-lg hover:brightness-110"
              title="Editar"
            >
              <Edit className="w-3 h-3" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(loc.id); }}
              className="bg-status-error text-white p-1.5 rounded-lg shadow-lg hover:brightness-110 ml-1"
              title="Excluir"
            >
              <Trash2 className="w-3 h-3" />
            </button>
         </div>
       </div>
     );
 }

/**
 * DroppableBaySide - Um dos lados de uma baia (bombordo, centro ou boreste).
 */
const DroppableBaySide = memo(function DroppableBaySide({ bay, side, isLast, deckConfig, searchTerm, onEdit }: { bay: Bay, side: 'port'|'center'|'starboard', isLast: boolean, deckConfig: DeckConfig, searchTerm: string, onEdit: (cargo: Cargo) => void }) {
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

     return (
        <div 
          ref={setNodeRef}
          className={cn(
            "flex-1 min-h-[80px] flex flex-col items-start p-2 relative transition-colors",
            !isLast && "border-r border-dashed border-neutral-400 dark:border-neutral-700/50",
            isOver ? "bg-indigo-500/20" : ""
          )}
          style={{ minWidth: metersToPixels(sideWidth) }}
        >
      <div className="w-full flex justify-between items-center mb-2 px-1 border-b border-subtle/50 pb-2">
         <span className="text-secondary font-black text-[10px] tracking-[0.2em] uppercase">
           {side === 'port' ? 'BOMBORDO' : side === 'center' ? 'CENTRO' : 'BORESTE'}
         </span>
         <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-sidebar text-primary border border-subtle/50 uppercase tracking-tighter">
            {cargoes.length} ITENS
         </span>
     </div>
      
            <div className="flex flex-wrap gap-1 items-start content-start justify-center w-full relative">
              {cargoes.map(cargo => {
                const isMatch = searchTerm.length > 0 && 
                  (cargo.identifier.toLowerCase().includes(searchTerm.toLowerCase()) || 
                   cargo.description.toLowerCase().includes(searchTerm.toLowerCase()));
                const isDimmed = searchTerm.length > 0 && !isMatch;

                return (
                  <DraggableCargo 
                    key={cargo.id} 
                    cargo={cargo} 
                    isHighlight={isMatch}
                    isDimmed={isDimmed}
                    onEdit={onEdit}
                  />
                );
              })}
            </div>
    </div>
  );
});

/**
 * DroppableBay - Uma baia completa contendo os três lados.
 */
const DroppableBay = memo(function DroppableBay({ bay, activeLocation, searchTerm, onEdit }: { bay: Bay, activeLocation: CargoLocation, searchTerm: string, onEdit: (cargo: Cargo) => void }) {
return (
   <div 
     className={cn(
       "w-full border rounded-2xl relative flex flex-col items-center pt-12 pb-4 transition-all min-h-[120px] shadow-sm",
       "bg-header/50 dark:bg-black/20 border-subtle"
     )}
   >
      <div className="absolute top-3 left-4 flex items-center gap-2">
        <div className="bg-main text-primary text-[11px] font-mono font-black px-3 py-1.5 rounded-xl border border-strong shadow-md flex items-center gap-2 uppercase tracking-widest">
           <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
           Baia {String(bay.number).padStart(2, '0')}
        </div>
      </div>

      <div className="flex w-full mt-2 relative z-10 border-t border-dashed border-subtle/40">
          <DroppableBaySide bay={bay} side="port" isLast={false} deckConfig={activeLocation.config} searchTerm={searchTerm} onEdit={onEdit} />
          <DroppableBaySide bay={bay} side="center" isLast={false} deckConfig={activeLocation.config} searchTerm={searchTerm} onEdit={onEdit} />
          <DroppableBaySide bay={bay} side="starboard" isLast={true} deckConfig={activeLocation.config} searchTerm={searchTerm} onEdit={onEdit} />
        </div>
      </div>
    );
});

export function DeckArea() {
     const { locations, activeLocationId, setActiveLocation, addLocation, searchTerm, setSearchTerm, setEditingCargo, editLocation, deleteLocation } = useCargoStore();
    const activeLocation = locations.find(l => l.id === activeLocationId);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const handleAddLocation = () => {
        const name = prompt('Nome do novo local: (ex. Porão 1)');
        if (name) addLocation(name);
    };

    if (!activeLocation) return <div className="text-gray-700 dark:text-white p-6">Nenhum local ativo.</div>;
    const { bays } = activeLocation;

    return (
        <div className="flex flex-col h-full w-full">
             {/* Tabs / Sub-nav */}
              <div className="flex items-center gap-2 mb-8 bg-sidebar/50 p-2 rounded-2xl border border-subtle/50 w-full overflow-x-auto no-scrollbar shadow-inner">
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
                          if (window.confirm('Tem certeza que deseja excluir este local?')) {
                            deleteLocation(locId);
                          }
                        }}
                      />
                  ))}
                  <button 
                    onClick={handleAddLocation}
                    className="flex items-center gap-2 px-4 py-2 text-[10px] font-black text-muted hover:text-brand-primary uppercase tracking-widest transition-all rounded-xl hover:bg-white/50"
                  >
                    <Plus className="w-4 h-4" /> Novo Local
                  </button>
              </div>

            <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-primary tracking-tight uppercase tracking-tighter">{activeLocation.name}</h2>
                  <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mt-1">Gerenciamento de Alocações no Deck</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted group-focus-within:text-brand-primary transition-colors" />
                      <input
                        type="text"
                        placeholder="BUSCAR NO DECK..."
                        value={searchTerm}
                        onChange={(e) => {
                          const term = e.target.value;
                          setSearchTerm(term);
                        }}
                        className="w-80 pl-12 pr-4 py-4 text-[12px] font-black tracking-widest bg-main border-2 border-subtle rounded-[1.2rem] focus:outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary transition-all placeholder:text-muted placeholder:opacity-100 text-primary uppercase shadow-sm"
                      />
                    </div>
                    
                    <button 
                      onClick={() => setIsSettingsOpen(true)}
                      className="flex items-center gap-3 bg-header border border-subtle text-muted hover:text-brand-primary hover:border-brand-primary/50 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm hover:shadow-md"
                    >
                      <Settings className="w-4 h-4" />
                      CONFIGURAR DECK
                    </button>
                </div>
            </div>
            
            <div className="flex-1 bg-main border border-subtle rounded-[3rem] p-12 relative flex flex-col items-center overflow-auto shadow-inner shadow-black/5">
                <div className="w-fit min-w-full h-fit bg-sidebar/30 border border-subtle/50 rounded-t-[120px] rounded-b-[3rem] relative flex flex-col p-16 shadow-2xl">
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 text-muted text-[11px] font-mono font-black tracking-[1.2em] uppercase whitespace-nowrap">PROA</div>
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted text-[11px] font-mono font-black tracking-[1.2em] uppercase whitespace-nowrap">POPA</div>
                    <div className="absolute left-[-45px] top-1/2 -translate-y-1/2 -rotate-90 text-muted text-[11px] font-mono font-black tracking-[1.2em] uppercase whitespace-nowrap">BOMBORDO</div>
                    <div className="absolute right-[-45px] top-1/2 -translate-y-1/2 rotate-90 text-muted text-[11px] font-mono font-black tracking-[1.2em] uppercase whitespace-nowrap">BORESTE</div>
                    
                     <div className="flex-1 mt-8 mb-8 flex flex-col gap-6 relative z-10 w-full">
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
