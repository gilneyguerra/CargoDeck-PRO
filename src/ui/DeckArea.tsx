import { useState, memo, useMemo } from 'react';
import { useCargoStore } from '@/features/cargoStore';
import { Settings, Plus, Search, Trash2, Edit, CheckCircle2 } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { Bay } from '@/domain/Bay';
import type { Cargo } from '@/domain/Cargo';
import type { CargoLocation } from '@/domain/Location';
import { DeckSettingsModal } from './DeckSettingsModal';
import type { DeckConfig } from '@/domain/DeckConfig';
import DraggableCargo from './DraggableCargo';
import { metersToPixels } from '@/lib/scaling';


interface LocationTabProps {
  loc: CargoLocation;
  isActive: boolean;
  onClick: () => void;
  onEdit: (loc: CargoLocation) => void;
  onDelete: (id: string) => void;
  matchCount: number;
  key?: string | number;
}

function LocationTab({ loc, isActive, onClick, onEdit, onDelete, matchCount }: LocationTabProps) {
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
                : "bg-header/50 border-subtle text-muted hover:text-primary hover:border-strong bg-white/50 dark:bg-black/20"
            )}
          >
          <div className="flex items-center gap-2">
            <span>{loc.name}</span>
            {matchCount > 0 && (
              <span className="flex h-2 w-2 rounded-full bg-status-warning animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {(() => {
              const totalCargoes = loc.bays.reduce((acc, bay) => acc + bay.allocatedCargoes.length, 0);
              return totalCargoes > 0 && (
                <span className={cn(
                  "text-[9px] px-2 py-0.5 rounded-lg font-black min-w-[20px] text-center",
                  isActive ? "bg-white/20 text-white" : "bg-sidebar text-muted"
                )}>
                  {totalCargoes}
                </span>
              );
            })()}
            {matchCount > 0 && (
              <span className={cn(
                "text-[9px] px-2 py-0.5 rounded-lg font-black min-w-[20px] text-center bg-status-warning text-white shadow-sm shadow-status-warning/30"
              )}>
                {matchCount}
              </span>
            )}
          </div>
          </button>
          
          <div className="flex items-center absolute -top-3 -right-2 opacity-0 group-hover:opacity-100 transition-all z-20 scale-90 group-hover:scale-100">
             <button 
               onClick={(e) => { e.stopPropagation(); onEdit(loc); }}
               className="bg-brand-primary text-white p-1.5 rounded-lg shadow-lg hover:brightness-110 border border-white/20"
               title="Editar Local"
             >
               <Edit className="w-3 h-3" />
             </button>
             <button 
               onClick={(e) => { e.stopPropagation(); onDelete(loc.id); }}
               className="bg-status-error text-white p-1.5 rounded-lg shadow-lg hover:brightness-110 ml-1 border border-white/20"
               title="Excluir Local"
             >
               <Trash2 className="w-3 h-3" />
             </button>
          </div>
        </div>
     );
 }

const DroppableBaySide = memo(function DroppableBaySide({ bay, side, isLast, deckConfig, searchTerm, onEdit }: { bay: Bay, side: 'port'|'center'|'starboard', isLast: boolean, deckConfig: DeckConfig, searchTerm: string, onEdit: (cargo: Cargo) => void }) {
    const { isOver, setNodeRef } = useDroppable({
      id: `${bay.id}-${side}`,
    });

    const cargoes = bay.allocatedCargoes.filter(c => c.positionInBay === side || (!c.positionInBay && side === 'center'));

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
            isOver ? "bg-indigo-500/10" : ""
          )}
          style={{ minWidth: metersToPixels(sideWidth) }}
        >
      {/* Rótulos internos removidos para evitar redundância com a orientação global */}
      <div className="w-full flex justify-end items-center mb-2 px-1 border-b border-subtle/50 pb-2">
         <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-sidebar text-primary border border-subtle uppercase">
            {cargoes.length} {cargoes.length === 1 ? 'ITEM' : 'ITENS'}
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

const DroppableBay = memo(function DroppableBay({ bay, activeLocation, searchTerm, onEdit }: { bay: Bay, activeLocation: CargoLocation, searchTerm: string, onEdit: (cargo: Cargo) => void }) {
return (
   <div 
     className={cn(
       "w-full border rounded-2xl relative flex flex-col items-center pt-12 pb-4 transition-all min-h-[120px] shadow-sm",
       "bg-header/40 dark:bg-black/10 border-subtle"
     )}
   >
      <div className="absolute top-3 left-4 flex items-center gap-2">
        <div className="bg-main text-primary text-[10px] font-mono font-black px-3 py-1 rounded-xl border border-subtle shadow-sm flex items-center gap-2 uppercase tracking-widest">
           <div className="w-1.5 h-1.5 rounded-full bg-brand-primary/40" />
           Baia {String(bay.number).padStart(2, '0')}
        </div>
      </div>

      <div className="flex w-full mt-2 relative z-10 border-t border-dashed border-subtle/30">
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

    // Auxiliar para contar matches por localização
    const getMatchesForLocation = (loc: CargoLocation) => {
        if (!searchTerm) return 0;
        const term = searchTerm.toLowerCase();
        let count = 0;
        loc.bays.forEach(bay => {
            bay.allocatedCargoes.forEach(cargo => {
                if (cargo.identifier.toLowerCase().includes(term) || 
                    cargo.description.toLowerCase().includes(term)) {
                    count++;
                }
            });
        });
        return count;
    };

    // Contagem de itens encontrados na pesquisa EM TODO O APP (Global: Deck + Inventário)
    const { globalSearchMatchCount, inventoryMatchCount } = useMemo(() => {
        if (!searchTerm) return { globalSearchMatchCount: 0, inventoryMatchCount: 0 };
        const term = searchTerm.toLowerCase();
        let deckCount = 0;
        
        locations.forEach(loc => {
            loc.bays.forEach(bay => {
                bay.allocatedCargoes.forEach(cargo => {
                    if (cargo.identifier.toLowerCase().includes(term) || 
                        cargo.description.toLowerCase().includes(term)) {
                        deckCount++;
                    }
                });
            });
        });

        const invCount = useCargoStore.getState().unallocatedCargoes.filter(c => 
            c.identifier.toLowerCase().includes(term) || 
            c.description.toLowerCase().includes(term)
        ).length;
        
        return { 
            globalSearchMatchCount: deckCount + invCount,
            inventoryMatchCount: invCount
        };
    }, [searchTerm, locations]);

    const handleAddLocation = () => {
        const name = prompt('Nome do novo local: (ex. Porão 1)');
        if (name) addLocation(name);
    };

    if (!activeLocation) return <div className="text-gray-700 dark:text-white p-6">Nenhum local ativo.</div>;
    const { bays } = activeLocation;

    return (
        <div className="flex flex-col h-full w-full">
             {/* Local Tabs */}
              <div className="flex items-center gap-2 mb-8 bg-sidebar/30 p-2 rounded-2xl border border-subtle/40 w-full overflow-x-auto no-scrollbar">
                  {locations.map(loc => (
                      <LocationTab 
                        key={loc.id} 
                        loc={loc} 
                        isActive={activeLocationId === loc.id} 
                        matchCount={getMatchesForLocation(loc)}
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
                    className="flex items-center gap-2 px-6 py-2.5 text-[10px] font-black text-muted hover:text-brand-primary border border-dashed border-subtle/60 rounded-xl hover:bg-brand-primary/5 hover:border-brand-primary/40 transition-all uppercase tracking-[0.2em] ml-2 shrink-0 shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> NOVO LOCAL
                  </button>
              </div>

            <div className="flex items-center justify-between mb-8 px-2">
                <div className="flex flex-col">
                  <h2 className="text-3xl font-black text-primary tracking-tighter uppercase leading-none">{activeLocation.name}</h2>
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mt-1.5">Gerenciamento de Alocações no Deck</p>
                </div>
                
                <div className="flex items-center gap-5">
                    {/* Contador de Resultados da Busca GLOBAL (Todas as abas) */}
                    {searchTerm && (
                      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                         <div className="bg-status-warning/10 border border-status-warning/30 px-4 py-2 rounded-xl flex items-center gap-3 shadow-sm">
                            <CheckCircle2 className="w-4 h-4 text-status-warning" />
                            <div className="flex flex-col items-start leading-none">
                              <span className="text-[10px] font-black text-status-warning uppercase tracking-widest mb-0.5">
                                 {globalSearchMatchCount} {globalSearchMatchCount === 1 ? 'ITEM ENCONTRADO' : 'ITENS ENCONTRADOS'}
                              </span>
                              <div className="flex items-center gap-1.5 opacity-70">
                                 <span className="text-[8px] font-bold text-status-warning uppercase">Deck: {globalSearchMatchCount - inventoryMatchCount}</span>
                                 <div className="w-1 h-1 rounded-full bg-status-warning/40" />
                                 <span className="text-[8px] font-bold text-status-warning uppercase">Inventário: {inventoryMatchCount}</span>
                              </div>
                            </div>
                         </div>
                      </div>
                    )}

                    <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted group-focus-within:text-brand-primary transition-colors" />
                      <input
                        type="text"
                        placeholder="BUSCAR NO DECK..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-80 pl-12 pr-4 py-4 text-[12px] font-black tracking-widest bg-main border-2 border-subtle rounded-[1.2rem] focus:outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary transition-all placeholder:text-primary placeholder:font-black text-primary uppercase shadow-sm"
                      />
                    </div>
                    
                    <button 
                      onClick={() => setIsSettingsOpen(true)}
                      className="flex items-center gap-3 bg-header border border-strong text-primary hover:text-brand-primary hover:border-brand-primary px-6 py-4 rounded-[1.2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-md active:scale-95"
                    >
                      <Settings className="w-4 h-4" />
                      CONFIGURAR DECK
                    </button>
                </div>
            </div>
            
            <div className="flex-1 bg-main border border-subtle rounded-[3rem] p-24 relative flex flex-col items-center overflow-auto shadow-inner">
                <div className="w-fit min-w-full h-fit bg-sidebar/10 border border-subtle/50 rounded-t-[140px] rounded-b-[4rem] relative flex flex-col p-20 shadow-2xl">
                    {/* Orientações Globais - Movidas para posições mais externas e com fonte preta conforme solicitado */}
                    <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 text-primary text-[14px] font-black tracking-[1.5em] uppercase whitespace-nowrap pointer-events-none">PROA</div>
                    <div className="absolute bottom-[-50px] left-1/2 -translate-x-1/2 text-primary text-[14px] font-black tracking-[1.5em] uppercase whitespace-nowrap pointer-events-none">POPA</div>
                    <div className="absolute left-[-70px] top-1/2 -translate-y-1/2 -rotate-90 text-primary text-[14px] font-black tracking-[1.5em] uppercase whitespace-nowrap pointer-events-none">BOMBORDO</div>
                    <div className="absolute right-[-70px] top-1/2 -translate-y-1/2 rotate-90 text-primary text-[14px] font-black tracking-[1.5em] uppercase whitespace-nowrap pointer-events-none">BORESTE</div>
                    
                     <div className="flex-1 flex flex-col gap-8 relative z-10 w-full py-4">
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
