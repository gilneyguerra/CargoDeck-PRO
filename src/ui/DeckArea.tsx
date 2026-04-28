import { useState, memo, useMemo } from 'react';
import { useCargoStore } from '@/features/cargoStore';
import { Settings, Plus, Search, Trash2, Edit, CheckCircle2, Scale } from 'lucide-react';
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
              "px-6 py-3 text-[11px] font-extrabold tracking-widest transition-all border rounded-2xl flex items-center gap-4 uppercase shadow-low hover:shadow-medium",
              isActive 
                ? "bg-brand-primary text-white border-brand-primary shadow-xl shadow-brand-primary/20 scale-[1.02] z-10" 
                : "bg-header/50 border-subtle text-primary hover:text-primary hover:border-strong bg-white/50 dark:bg-black/20"
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
                  isActive ? "bg-white/20 text-white" : "bg-sidebar text-primary"
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
          
          <div className="flex items-center gap-1.5 absolute -top-5 -right-3 opacity-0 group-hover:opacity-100 transition-all z-20 scale-[0.8] group-hover:scale-100 origin-bottom-left">
             <button 
               onClick={(e) => { e.stopPropagation(); onEdit(loc); }}
               className="bg-brand-primary text-white w-8 h-8 rounded-xl shadow-high border border-white/20 hover:scale-110 active:scale-95 transition-all hover:bg-brand-primary/90 flex items-center justify-center"
               title="Editar Local"
             >
               <Edit className="w-3.5 h-3.5" />
             </button>
             <button 
               onClick={(e) => { e.stopPropagation(); onDelete(loc.id); }}
               className="bg-[#ef4444] text-white w-8 h-8 rounded-xl shadow-high border border-white/20 hover:scale-110 active:scale-95 transition-all hover:bg-[#dc2626] flex items-center justify-center"
               title="Excluir Local"
             >
               <Trash2 className="w-3.5 h-3.5" />
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
         <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-sidebar text-primary border border-subtle uppercase">
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
       "baia w-full border rounded-[16px] relative flex flex-col items-center pt-14 pb-6 transition-all min-h-[140px] shadow-medium",
       "bg-white/50 dark:bg-black/20 border-subtle hover-glow group/bay overflow-hidden",
       "before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.05),transparent)] pointer-events-auto"
     )}
   >
      <div className="absolute inset-0 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] pointer-events-none" />
      <div className="absolute top-4 left-6 flex items-center gap-2 z-20">
        <div className="bg-brand-primary text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-low flex items-center gap-2 uppercase tracking-[0.2em] group-hover/bay:scale-110 transition-transform">
           <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
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

    const { totalPort, totalStarboard, totalTopHeavyMoment } = useMemo(() => {
        let port = 0;
        let starboard = 0;
        let topHeavy = 0;
        let weight = 0;

        locations.forEach(loc => {
            const elev = loc.config.elevationMeters !== undefined ? loc.config.elevationMeters : 30;
            loc.bays.forEach(bay => {
                bay.allocatedCargoes.forEach(c => {
                    const cargoWeight = c.weightTonnes * c.quantity;
                    weight += cargoWeight;
                    if (c.positionInBay === 'port') port += cargoWeight;
                    else if (c.positionInBay === 'starboard') starboard += cargoWeight;
                    const cargoHeight = c.heightMeters || 2.5; 
                    const centerOfGravityZ = elev + (cargoHeight / 2);
                    topHeavy += (cargoWeight * centerOfGravityZ);
                });
            });
        });

        return { 
            totalPort: port, 
            totalStarboard: starboard, 
            totalTopHeavyMoment: topHeavy, 
            currentTotalWeight: weight 
        };
    }, [locations]);

    const listDiff = Math.abs(totalPort - totalStarboard);
    const isListing = listDiff > 50; 
    const isTopHeavy = totalTopHeavyMoment > 100000;

    const handleAddLocation = () => {
        const name = prompt('Nome do novo local: (ex. Porão 1)');
        if (name) addLocation(name);
    };

    if (!activeLocation) return <div className="text-gray-700 dark:text-white p-6">Nenhum local ativo.</div>;
    const { bays } = activeLocation;

    return (
        <div className="flex flex-col h-full w-full">
             {/* Local Tabs */}
              <div className="flex items-center gap-2 mb-8 bg-sidebar/30 p-2 pt-6 rounded-2xl border border-subtle/40 w-full overflow-x-auto no-scrollbar">
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

            <div className="flex flex-wrap items-center justify-between gap-6 mb-8 px-2">
                <div className="flex items-center gap-8 flex-1 min-w-fit">
                    <div className="flex flex-col">
                      <h2 className="deck-title text-4xl font-extrabold text-primary tracking-tighter uppercase leading-none drop-shadow-sm">{activeLocation.name}</h2>
                      <p className="text-[11px] font-bold text-muted uppercase tracking-[0.4em] mt-3 opacity-80">Deck Allocation Management</p>
                    </div>

                    {/* Stability Info (Migrated from Header) */}
                    {(totalPort > 0 || totalStarboard > 0) && (
                        <div 
                          className="hidden md:flex items-center gap-8 px-6 bg-sidebar/20 border border-subtle rounded-2xl py-2 shadow-inner h-[60px]"
                          title="Indicador de Banda e Estabilidade Longitudinal/Transversal."
                        >
                          <div className="flex flex-col items-center gap-1 flex-1 min-w-[200px]">
                            <div className="flex justify-between w-full text-[9px] font-black tracking-[0.2em] uppercase">
                               <span className={cn("transition-colors", totalPort > totalStarboard + 50 ? "text-status-error" : "text-secondary")}>BOMBORDO</span>
                               <span className={cn("transition-colors", totalStarboard > totalPort + 50 ? "text-status-error" : "text-secondary")}>BORESTE</span>
                            </div>
                            <div className="flex items-center gap-3 w-full">
                              <span className="text-[11px] font-mono font-black text-primary tabular-nums w-10 text-right">{totalPort.toFixed(0)}<small className="opacity-50 ml-0.5">t</small></span>
                              <div className="flex-1 h-3 bg-main/40 border border-subtle rounded-full overflow-hidden flex shadow-inner p-0.5 relative">
                                <div className="flex-1 flex justify-end">
                                   <div className={cn(
                                     "h-full transition-all duration-700 rounded-l-sm",
                                     isListing && totalPort > totalStarboard ? "bg-status-error" : "bg-brand-primary"
                                   )}
                                   style={{ width: `${Math.min(100, (totalPort / (Math.max(totalPort, totalStarboard) || 1)) * 100)}%` }}></div>
                                </div>
                                <div className="w-px bg-border-strong mx-0.5 z-10 opacity-30" />
                                <div className="flex-1">
                                  <div className={cn(
                                     "h-full transition-all duration-700 rounded-r-sm",
                                     isListing && totalStarboard > totalPort ? "bg-status-error" : "bg-brand-primary"
                                   )}
                                   style={{ width: `${Math.min(100, (totalStarboard / (Math.max(totalPort, totalStarboard) || 1)) * 100)}%` }} />
                                </div>
                              </div>
                              <span className="text-[11px] font-mono font-black text-primary tabular-nums w-10">{totalStarboard.toFixed(0)}<small className="opacity-50 ml-0.5">t</small></span>
                            </div>
                          </div>

                          <div className="h-6 w-px bg-border-subtle opacity-30" />

                          <div className="flex flex-col items-center min-w-24">
                            <span className="text-[9px] text-secondary font-black tracking-[0.2em] uppercase mb-0.5 opacity-70">Stability</span>
                            <div className="flex items-center gap-1.5">
                               <div className={cn(
                                 "p-1 rounded-md transition-colors",
                                 isTopHeavy ? "bg-status-error/10 text-status-error" : "bg-status-success/10 text-status-success"
                               )}>
                                 <Scale size={12} />
                               </div>
                               <span className={cn(
                                 "text-sm font-black tracking-tighter tabular-nums",
                                 isTopHeavy ? "text-status-error" : "text-primary"
                               )}>
                                 {totalTopHeavyMoment.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-[9px] font-bold text-muted uppercase">tm</span>
                               </span>
                            </div>
                          </div>
                        </div>
                    )}
                </div>
                
                <div className="flex flex-wrap items-center gap-5 shrink-0">
                    {/* Contador de Resultados da Busca GLOBAL */}
                    {searchTerm && (
                      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                         <div className="bg-status-warning/10 border border-status-warning/30 px-5 py-2 rounded-[1.2rem] flex items-center gap-4 shadow-low h-[60px]">
                            <CheckCircle2 className="w-5 h-5 text-status-warning" />
                            <div className="flex flex-col items-start justify-center leading-none">
                              <span className="text-[10px] font-black text-status-warning uppercase tracking-widest mb-1">
                                 {globalSearchMatchCount} {globalSearchMatchCount === 1 ? 'ITEM ENCONTRADO' : 'ITENS ENCONTRADOS'}
                              </span>
                              <div className="flex items-center gap-2 opacity-70">
                                 <span className="text-[9px] font-bold text-status-warning uppercase">Deck: {globalSearchMatchCount - inventoryMatchCount}</span>
                                 <div className="w-1.5 h-1.5 rounded-full bg-status-warning/40" />
                                 <span className="text-[9px] font-bold text-status-warning uppercase">Inv: {inventoryMatchCount}</span>
                              </div>
                            </div>
                         </div>
                      </div>
                    )}

                    <div className="relative group">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted group-focus-within:text-brand-primary transition-all group-focus-within:rotate-12" />
                      <input
                        type="text"
                        placeholder="BUSCAR NO DECK..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-80 pl-14 pr-6 py-4.5 text-xs font-black tracking-[0.1em] bg-main border-2 border-subtle rounded-2xl focus:outline-none focus:border-brand-primary transition-all focus:ring-4 focus:ring-brand-primary/10 placeholder:text-black text-black uppercase shadow-low h-[60px]"
                      />
                    </div>
                    
                    <button 
                      onClick={() => setIsSettingsOpen(true)}
                      className="flex items-center gap-3 bg-header border border-subtle text-primary hover:text-brand-primary hover:border-brand-primary px-6 py-4 rounded-[1.2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-md active:scale-95 h-[60px]"
                    >
                      <Settings className="w-4 h-4" />
                      CONFIGURAR DECK
                    </button>
                </div>
            </div>
            
            <div className="flex-1 bg-main border border-subtle rounded-[3rem] p-16 relative flex flex-col items-center overflow-auto shadow-high deck-grid">
                <div className="w-fit min-w-full h-fit bg-sidebar/5 border border-subtle/30 rounded-t-[140px] rounded-b-[4rem] relative flex flex-col p-14 shadow-2xl glass">
                    {/* Orientações Globais */}
                    <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 text-primary text-[14px] font-black tracking-[1.5em] uppercase whitespace-nowrap pointer-events-none drop-shadow-sm">PROA</div>
                    <div className="absolute bottom-[-50px] left-1/2 -translate-x-1/2 text-primary text-[14px] font-black tracking-[1.5em] uppercase whitespace-nowrap pointer-events-none drop-shadow-sm">POPA</div>
                    <div className="absolute left-[-90px] top-1/2 -translate-y-1/2 -rotate-90 text-primary text-[14px] font-black tracking-[1.5em] uppercase whitespace-nowrap pointer-events-none drop-shadow-sm">BOMBORDO</div>
                    <div className="absolute right-[-90px] top-1/2 -translate-y-1/2 rotate-90 text-primary text-[14px] font-black tracking-[1.5em] uppercase whitespace-nowrap pointer-events-none drop-shadow-sm">BORESTE</div>
                    
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
