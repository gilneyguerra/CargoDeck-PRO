import { useState, useEffect, useRef, memo, useMemo } from 'react';
import { useCargoStore } from '@/features/cargoStore';
import { useNotificationStore } from '@/features/notificationStore';
import { Settings, Plus, Search, Trash2, Edit, CheckCircle2, Users, GripVertical } from 'lucide-react';
import {
  useDroppable, useDndMonitor,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, horizontalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import type { Bay } from '@/domain/Bay';
import type { Cargo } from '@/domain/Cargo';
import type { CargoLocation } from '@/domain/Location';
import { DeckSettingsModal } from './DeckSettingsModal';
import { GroupMoveModal } from './GroupMoveModal';
import { DeckSkeleton } from './Skeleton';
import type { DeckConfig } from '@/domain/DeckConfig';
import DraggableCargo from './DraggableCargo';
import { metersToPixels } from '@/lib/scaling';
import { VesselIdentificationButton } from './VesselIdentificationButton';
import { DeckActionToolbar } from './DeckActionToolbar';


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
   // Drop target — recebe cargas arrastadas (DndContext global do App.tsx
   // gerencia o drag de cargas). Mantém o comportamento de "drop carga
   // aqui para alocar nesta área".
   const { setNodeRef: setDroppableRef } = useDroppable({
     id: `tab-${loc.id}`
   });
   // Sortable handle — reorder horizontal das tabs. Usa prefix 'sort-'
   // pra evitar colisão com o drop target 'tab-${loc.id}' do useDroppable
   // acima. Sem o prefix, ambos drop targets registravam IDs distintos
   // mas no MESMO node DOM, e o collision detection do dnd-kit retornava
   // o último registrado (loc.id sem prefix) — o handleDragOver global
   // procura prefix 'tab-' e falhava → arrastar carga sobre tab parou
   // de mudar a tab ativa.
   const {
     setNodeRef: setSortableRef,
     attributes, listeners, transform, transition, isDragging,
   } = useSortable({ id: 'sort-' + loc.id });

   // Combina as duas refs no mesmo elemento — dnd-kit suporta esse padrão.
   const setRefs = (el: HTMLElement | null) => {
     setDroppableRef(el);
     setSortableRef(el);
   };

   const sortableStyle: React.CSSProperties = {
     transform: CSS.Transform.toString(transform),
     transition,
     opacity: isDragging ? 0.4 : 1,
     zIndex: isDragging ? 20 : undefined,
   };

     return (
        <div className="relative flex items-center gap-1 group">
          <button
            ref={setRefs}
            onClick={onClick}
            style={sortableStyle}
            {...attributes}
            {...listeners}
            className={cn(
              "px-6 py-3 text-[11px] font-extrabold tracking-widest transition-[background-color,border-color,color,box-shadow] duration-200 border rounded-2xl flex items-center gap-4 uppercase shadow-low hover:shadow-medium cursor-grab active:cursor-grabbing touch-none",
              isActive
                ? "bg-brand-primary text-white border-brand-primary shadow-xl shadow-brand-primary/20 z-10"
                : "bg-header/50 border-subtle text-primary hover:text-primary hover:border-strong bg-white/50 dark:bg-black/20"
            )}
          >
          {/* Drag handle visual (ícone de pegada) — pista visual de que a
              tab é arrastável. Aparece sutilmente, fica no canto esquerdo
              do label. */}
          <GripVertical size={12} className={cn('shrink-0 opacity-50 group-hover:opacity-100 transition-opacity', isActive ? 'text-white/70' : 'text-muted')} />
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
                  "inline-flex items-center justify-center min-w-[24px] h-[24px] px-1.5 rounded-full text-[10px] font-mono font-black tabular-nums shadow-sm",
                  // Cores theme-aware: tab inativa usa bg-sidebar+text-primary que muda
                  // automaticamente entre light/dark. Tab ativa (gradient) usa branco
                  // semitransparente que contrasta nos dois modos.
                  isActive ? "bg-white/25 text-white shadow-white/20" : "bg-sidebar text-primary border border-subtle/60"
                )}>
                  {totalCargoes}
                </span>
              );
            })()}
            {matchCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[24px] h-[24px] px-1.5 rounded-full text-[10px] font-mono font-black tabular-nums bg-status-warning text-white shadow-sm shadow-status-warning/30 ring-2 ring-status-warning/20 animate-pulse">
                {matchCount}
              </span>
            )}
          </div>
          </button>
          
          <div className="flex items-center gap-1.5 absolute -top-5 -right-3 opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-200 z-20 scale-[0.8] group-hover:scale-100 origin-bottom-left">
             <button 
               onClick={(e) => { e.stopPropagation(); onEdit(loc); }}
               className="bg-brand-primary text-white w-8 h-8 rounded-xl shadow-high border border-white/20 hover:scale-110 active:scale-95 transition-[background-color,transform,box-shadow] duration-200 hover:bg-brand-primary/90 flex items-center justify-center"
               title="Editar Local"
             >
               <Edit className="w-3.5 h-3.5" />
             </button>
             <button 
               onClick={(e) => { e.stopPropagation(); onDelete(loc.id); }}
               className="bg-[#ef4444] text-white w-8 h-8 rounded-xl shadow-high border border-white/20 hover:scale-110 active:scale-95 transition-[background-color,transform,box-shadow] duration-200 hover:bg-[#dc2626] flex items-center justify-center"
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
       "baia w-full border rounded-[16px] relative flex flex-col items-center pt-14 pb-6 transition-[background-color,border-color,box-shadow] duration-200 min-h-[140px] shadow-medium",
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

/** Limite de localizações além do qual a UX em viewports estreitos
 *  começa a degradar (scroll horizontal vira a única forma de ver tudo).
 *  Notificação one-shot avisa o operador. */
const MAX_RESPONSIVE_LOCATIONS = 6;

export function DeckArea() {
     // Selectors granulares: cada campo só dispara re-render quando seu próprio
     // valor muda. Antes, qualquer mudança no store (ex.: toggle de seleção em
     // /modais via tab pendurada, tick de auto-save) re-renderizava DeckArea
     // inteiro — incluindo todas as DroppableBay e LocationTab. Em conveses
     // com 50+ cargas isso era o maior dreno de fluidez.
     const locations = useCargoStore(s => s.locations);
     const activeLocationId = useCargoStore(s => s.activeLocationId);
     const searchTerm = useCargoStore(s => s.searchTerm);
     const setActiveLocation = useCargoStore(s => s.setActiveLocation);
     const addLocation = useCargoStore(s => s.addLocation);
     const setSearchTerm = useCargoStore(s => s.setSearchTerm);
     const setEditingCargo = useCargoStore(s => s.setEditingCargo);
     const editLocation = useCargoStore(s => s.editLocation);
     const deleteLocation = useCargoStore(s => s.deleteLocation);
     const reorderLocations = useCargoStore(s => s.reorderLocations);
     // Gating do skeleton de hidratação (ver bloco "if (showSkeleton)" abaixo).
     const isHydratedFromCloud = useCargoStore(s => s.isHydratedFromCloud);
     const unallocatedCargoes = useCargoStore(s => s.unallocatedCargoes);
     const ask = useNotificationStore(s => s.ask);
     const notify = useNotificationStore(s => s.notify);
     const askInput = useNotificationStore(s => s.askInput);
    const activeLocation = locations.find(l => l.id === activeLocationId);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [showGroupMoveModal, setShowGroupMoveModal] = useState(false);

    // ─── Drag-and-drop para reordenar tabs de localização ────────────────
    // Antes tínhamos um DndContext aninhado, mas conflitava com o DndContext
    // global do App.tsx (que gerencia drag de cargas para baias). Agora
    // usamos useDndMonitor — escuta os eventos do contexto global e reage
    // SOMENTE quando o drag é de uma tab (active.id === alguma location.id).
    // SortableContext continua envolvendo as tabs e dá horizontal-strategy.
    useDndMonitor({
      onDragEnd: (e: DragEndEvent) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;
        // IDs do useSortable agora têm prefix 'sort-' — decodifica antes
        // de procurar a location correspondente.
        const oldIdx = locations.findIndex(l => 'sort-' + l.id === active.id);
        const newIdx = locations.findIndex(l => 'sort-' + l.id === over.id);
        // Só reage se ambos active e over forem sortable IDs de locations;
        // qualquer outro drag (cargas, etc.) é ignorado por esse listener.
        if (oldIdx < 0 || newIdx < 0) return;
        const reordered = arrayMove(locations, oldIdx, newIdx);
        reorderLocations(reordered.map(l => l.id));
      },
    });

    // Notificação one-shot quando excede o limite responsivo.
    const locationsOverflowNotifiedRef = useRef(false);
    useEffect(() => {
      if (locations.length > MAX_RESPONSIVE_LOCATIONS && !locationsOverflowNotifiedRef.current) {
        notify(
          `${locations.length} localizações criadas — limite recomendado é ${MAX_RESPONSIVE_LOCATIONS}. Use scroll horizontal nas abas ou consolide em menos áreas para preservar a fluidez.`,
          'warning',
        );
        locationsOverflowNotifiedRef.current = true;
      }
    }, [locations.length, notify]);

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

    // askInput já está destructured no topo do component (linha 218).

    const handleAddLocation = async () => {
        const name = await askInput({
            title: 'Nova Aba de Carga',
            message: 'Identifique o novo local de armazenamento (convés, pátio, porão, etc.).',
            placeholder: 'Ex.: Porão 1',
            confirmLabel: 'Criar',
            required: true,
        });
        if (name) addLocation(name);
    };

    // Skeleton só aparece se ESTAMOS hidratando E não temos dados locais
    // (cache do localStorage). Operadores reincidentes veem o convés direto.
    // No primeiro login (cache vazio + load do Supabase em curso) o skeleton
    // mascara o "Nenhum local ativo" temporário e dá feedback de progresso.
    const allBaysEmpty = locations.every(loc => loc.bays.every(b => b.allocatedCargoes.length === 0));
    if (!isHydratedFromCloud && unallocatedCargoes.length === 0 && allBaysEmpty) {
        return <DeckSkeleton />;
    }

    if (!activeLocation) return <div className="text-primary dark:text-white p-6">Nenhum local ativo.</div>;
    const { bays } = activeLocation;

    return (
        <div className="flex flex-col h-full w-full">
             {/* Local Tabs — drag-and-drop horizontal para reordenar
                  (estilo planilha Excel). DndContext aninhado, separado do
                  drag global de cargas (App.tsx). Mask gradient nas bordas
                  laterais sinaliza scroll quando há muitas tabs. */}
              <div
                className="flex items-center gap-3 mb-10 bg-sidebar/40 p-3 px-4 rounded-3xl border border-subtle/50 w-full overflow-x-auto no-scrollbar shadow-inner [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]"
                title="Arraste as abas para reordenar"
              >
                  <SortableContext
                    items={locations.map(l => 'sort-' + l.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    {locations.map(loc => (
                        <LocationTab
                          key={loc.id}
                          loc={loc}
                          isActive={activeLocationId === loc.id}
                          matchCount={getMatchesForLocation(loc)}
                          onClick={() => setActiveLocation(loc.id)}
                          onEdit={async (editLoc) => {
                            const name = await askInput({
                              title: 'Editar Aba de Carga',
                              message: 'Atualize o nome do local de armazenamento.',
                              placeholder: 'Nome do local',
                              defaultValue: editLoc.name,
                              confirmLabel: 'Salvar',
                              required: true,
                            });
                            if (name && name.trim() !== '') {
                              editLocation(editLoc.id, { name: name.trim() });
                            }
                          }}
                          onDelete={async (locId) => {
                            const ok = await ask('Excluir Local', 'Tem certeza que deseja excluir este local? Todas as suas cargas alocadas serão movidas para o estoque.');
                            if (ok) {
                              deleteLocation(locId);
                            }
                          }}
                        />
                    ))}
                  </SortableContext>
                  <button
                    onClick={handleAddLocation}
                    className="flex items-center gap-2 px-6 py-2.5 text-[10px] font-black text-muted hover:text-brand-primary border border-dashed border-subtle/60 rounded-xl hover:bg-brand-primary/5 hover:border-brand-primary/40 transition-[background-color,border-color,color] duration-200 uppercase tracking-[0.2em] ml-2 shrink-0 shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> NOVO LOCAL
                  </button>
              </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 mb-6 px-2">
                <div className="flex items-center gap-4 flex-1 min-w-fit flex-wrap">
                    <h2 className="deck-title text-2xl lg:text-3xl xl:text-4xl font-extrabold text-primary tracking-tighter uppercase leading-none drop-shadow-sm">{activeLocation.name}</h2>

                    <VesselIdentificationButton variant="deck" />
                    {/* Indicador de Estabilidade migrado para Sidebar (StabilityIndicator) */}
                </div>
                
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Contador de Resultados da Busca GLOBAL */}
                    {searchTerm && (
                      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300 h-12 px-4 bg-status-warning/10 border border-status-warning/30 rounded-xl shadow-low">
                        <CheckCircle2 className="w-4 h-4 text-status-warning shrink-0" />
                        <div className="flex flex-col items-start justify-center leading-none">
                          <span className="text-[10px] font-black text-status-warning uppercase tracking-widest">
                            {globalSearchMatchCount} {globalSearchMatchCount === 1 ? 'ITEM' : 'ITENS'}
                          </span>
                          <span className="text-[8px] font-bold text-status-warning uppercase opacity-70 mt-0.5">
                            Deck {globalSearchMatchCount - inventoryMatchCount} · Inv {inventoryMatchCount}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="relative group">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted group-focus-within:text-brand-primary transition-[color,transform] duration-200 group-focus-within:rotate-12" />
                      <input
                        type="text"
                        placeholder="BUSCAR NO DECK..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-52 xl:w-64 pl-10 pr-3 text-[11px] font-black tracking-[0.1em] bg-main border-2 border-subtle rounded-xl focus:outline-none focus:border-brand-primary transition-[background-color,border-color,box-shadow] duration-200 focus:ring-2 focus:ring-brand-primary/20 placeholder:text-muted/60 text-primary uppercase shadow-low h-12"
                      />
                    </div>

                    <button
                      onClick={() => setShowGroupMoveModal(true)}
                      title="Movimentar Cargas em Grupo"
                      className="flex items-center gap-2 bg-[#1A237E] hover:brightness-110 text-white px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] transition-[filter,transform,box-shadow] duration-200 shadow-md hover:shadow-lg active:scale-95 h-12 shrink-0"
                    >
                      <Users className="w-4 h-4" />
                      <span className="hidden 2xl:inline">MOVER EM GRUPO</span>
                      <span className="2xl:hidden">GRUPO</span>
                    </button>

                    <button
                      onClick={() => setIsSettingsOpen(true)}
                      className="flex items-center gap-2 bg-header border-2 border-subtle text-primary hover:text-brand-primary hover:border-brand-primary hover:bg-brand-primary/5 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] transition-[background-color,border-color,color,transform,box-shadow] duration-200 shadow-sm hover:shadow-md active:scale-95 h-12"
                      title="Configurar Deck"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="hidden 2xl:inline">CONFIGURAR DECK</span>
                      <span className="2xl:hidden">CONFIG</span>
                    </button>

                    {/* Separador visual entre controles do deck e ações de manifesto */}
                    <div className="h-10 w-px bg-border-subtle hidden sm:block mx-1" />

                    {/* Ações operacionais movidas do Header global */}
                    <DeckActionToolbar />
                </div>
            </div>
            
            <div className="flex-1 bg-main border border-subtle rounded-[3rem] p-5 relative flex flex-col items-center overflow-auto shadow-high deck-grid">
                <div className="w-fit min-w-full h-fit bg-sidebar/5 border border-subtle/30 rounded-t-[140px] rounded-b-[4rem] relative flex flex-col p-14 shadow-2xl glass">
                    {/* Orientações Globais */}
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 text-primary text-[14px] font-black tracking-[1.5em] uppercase whitespace-nowrap pointer-events-none drop-shadow-sm">PROA</div>
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-primary text-[14px] font-black tracking-[1.5em] uppercase whitespace-nowrap pointer-events-none drop-shadow-sm">POPA</div>
                    <div className="absolute left-[-90px] top-1/2 -translate-y-1/2 -rotate-90 text-primary text-[14px] font-black tracking-[1.5em] uppercase whitespace-nowrap pointer-events-none drop-shadow-sm">BOMBORDO</div>
                    <div className="absolute right-[-90px] top-1/2 -translate-y-1/2 rotate-90 text-primary text-[14px] font-black tracking-[1.5em] uppercase whitespace-nowrap pointer-events-none drop-shadow-sm">BORESTE</div>
                    
                     <div className="flex-1 flex flex-col gap-8 relative z-10 w-full py-4">
                         {bays.map(bay => (
                             <DroppableBay key={bay.id} bay={bay} activeLocation={activeLocation} searchTerm={searchTerm} onEdit={setEditingCargo} />
                         ))}
                     </div>
                </div>
            </div>
            
            <GroupMoveModal isOpen={showGroupMoveModal} onClose={() => setShowGroupMoveModal(false)} />
            <DeckSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
}
