import { UploadCloud, FileType, AlertCircle, Trash2, Plus, MoveRight } from 'lucide-react';
import { BatchMoveModal } from './BatchMoveModal';
import { useCargoStore } from '@/features/cargoStore';
import { usePDFUpload } from '@/hooks/usePDFUpload';
import { useRef, useState, useMemo } from 'react';

import { cn } from '@/lib/utils';
import type { Cargo, CargoCategory } from '@/domain/Cargo';
import type { CargoItem } from '@/services/pdfExtractor';
import { ManualCargoModal } from './ManualCargoModal';
import { EditCargoModal } from './EditCargoModal';
import DraggableCargo from './DraggableCargo';
import { BackloadResolutionModal } from './BackloadResolutionModal';

// ─── Helpers para mapeamento de itens extraídos do PDF ───────────────────────

/**
 * Detecta a categoria da carga com base no tipo detectado e no peso.
 */
function detectCategory(item: CargoItem): CargoCategory {
    const tipo = (item.tipoDetectado ?? '').toUpperCase();
    if (tipo === 'CONTAINER') return 'CONTAINER';
    if (tipo === 'TUBULAR') return 'OTHER';
    if (tipo === 'BASKET') return 'BASKET';
    if (tipo === 'EQUIPMENT') return 'EQUIPMENT';
    if (item.weight > 20) return 'HEAVY';
    return 'GENERAL';
}

/**
 * Escolhe o formato visual da carga com base no tipo.
 */
function detectFormat(item: CargoItem): Cargo['format'] {
    const tipo = (item.tipoDetectado ?? '').toUpperCase();
    if (tipo === 'TUBULAR') return 'Tubular';
    if (item.length && item.width && Math.abs(item.length - item.width) < 0.5) return 'Quadrado';
    return 'Retangular';
}

/**
 * Retorna uma cor hexadecimal baseada na categoria/tipo da carga.
 */
function getCategoryColor(tipoDetectado?: string): string {
    const tipo = (tipoDetectado ?? '').toUpperCase();
    if (tipo === 'CONTAINER') return '#f97316'; // laranja
    if (tipo === 'TUBULAR')   return '#a855f7'; // roxo
    if (tipo === 'BASKET')    return '#22c55e'; // verde
    if (tipo === 'EQUIPMENT') return '#eab308'; // amarelo
    return '#3b82f6'; // azul (padrão)
}

export type CargoFilter = 'ALL' | 'GENERAL' | 'CONTAINER' | 'HAZARDOUS' | 'HEAVY' | 'FRAGILE' | 'OTHER';

export function Sidebar() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { unallocatedCargoes, manifestsLoaded, searchTerm, editingCargo, setEditingCargo, clearUnallocatedCargoes } = useCargoStore();
    const { loading: isProcessing, progress: progressPercent, error, upload, reset, isOCR } = usePDFUpload();
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [isBackloadModalOpen, setIsBackloadModalOpen] = useState(false);
    const [pendingBackloads, setPendingBackloads] = useState<Cargo[]>([]);
    const [destinationFilter, setDestinationFilter] = useState<string>('TODOS');
    const [selectedCargoIds, setSelectedCargoIds] = useState<Set<string>>(new Set());
    const [isBatchMoveOpen, setIsBatchMoveOpen] = useState(false);

    // Mapeamento dinâmico dos destinos baseados no estoque atual de cargas não alocadas
    const memoDestinations = useMemo(() => {
        return Array.from(new Set(unallocatedCargoes.map(c => c.destinoCarga).filter(Boolean))).sort() as string[];
    }, [unallocatedCargoes]);

    const hasUnidentified = useMemo(() => unallocatedCargoes.some(c => !c.destinoCarga), [unallocatedCargoes]);
    
    const filterButtons = useMemo(() => [
        { key: 'TODOS', label: 'TODOS' },
        ...(hasUnidentified ? [{ key: 'S/D', label: 'S/D' }] : []),
        ...memoDestinations.map(dest => ({ key: dest, label: dest }))
    ], [hasUnidentified, memoDestinations]);


    const visibleUnallocated = useMemo(() => {
        return unallocatedCargoes.filter(cargo => {
            const matchesSearch = !searchTerm || 
                                 (cargo.identifier || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 (cargo.description || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            const cargoDestination = cargo.destinoCarga;
            let matchesFilter = false;
            if (destinationFilter === 'TODOS') matchesFilter = true;
            else if (destinationFilter === 'S/D') matchesFilter = !cargoDestination;
            else matchesFilter = cargoDestination === destinationFilter;
            
            return matchesSearch && matchesFilter;
        });
    }, [unallocatedCargoes, searchTerm, destinationFilter]);

    const unallocatedCount = visibleUnallocated.length;
    const allVisibleSelected = unallocatedCount > 0 && selectedCargoIds.size === unallocatedCount;

    const handleEditCargo = (cargo: Cargo) => setEditingCargo(cargo);


    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            reset();
            const extractedItems = await upload(file);
            if (extractedItems) {
                const mappedCargoes: Cargo[] = extractedItems.map((item: CargoItem) => {
                    // Dimensões: usa valores reais do manifesto ou defaults razoáveis
                    const lengthMeters = item.length && item.length > 0 ? item.length : 6.0;
                    const widthMeters  = item.width  && item.width  > 0 ? item.width  : 2.4;
                    const heightMeters = item.height && item.height > 0 ? item.height : 2.6;

                    return {
                        id: item.id,
                        description: item.description,
                        identifier: item.identifier,
                        weightTonnes: item.weight,
                        widthMeters,
                        lengthMeters,
                        heightMeters,
                        quantity: 1,
                        category: detectCategory(item),
                        status: 'UNALLOCATED' as const,
                        x: item.positionX,
                        y: item.positionY,
                        isRotated: item.rotation ? item.rotation > 0 : false,
                        isBackload: item.isBackload ?? false,
                        observations: item.isBackload ? 'BACKLOAD' : undefined,
                        color: getCategoryColor(item.tipoDetectado),
                        format: detectFormat(item),
                        // Dados do manifesto (Novo formato aninhado)
                        dimensoes: {
                            comprimento: lengthMeters,
                            largura: widthMeters,
                            altura: heightMeters,
                            unidade: 'm'
                        },
                        peso: {
                            valorOriginal: item.weightKg,
                            valorEmToneladas: item.weight,
                            unidade: 't'
                        },
                        tamanhoFisico: item.tamanhoFisico,
                        dataExtracao: item.dataExtracao || new Date().toISOString(),
                        fonteManifesto: file.name,
                        // Suporte legado (para compatibilidade com componentes existentes)
                        nomeEmbarcacao:    item.nomeEmbarcacao,
                        numeroAtendimento: item.numeroAtendimento,
                        origemCarga:       item.origemCarga,
                        destinoCarga:      item.destinoCarga,
                        roteiroPrevisto:   item.roteiroPrevisto,
                    };
                });
                
                // Separa cargas que são de Desembarque (Backload) para tratamento especial
                const loadingCargoes = mappedCargoes.filter(c => !c.isBackload);
                const backloadCargoes = mappedCargoes.filter(c => c.isBackload);

                if (backloadCargoes.length > 0) {
                    setPendingBackloads(backloadCargoes);
                    setIsBackloadModalOpen(true);
                }

                // Adiciona ao store apenas o que for carga chegando (Loading)
                if (loadingCargoes.length > 0) {
                    useCargoStore.getState().setExtractedCargoes(loadingCargoes);
                }
            }
            e.target.value = '';
        }
    };

    return (
    <aside className="w-80 border-r border-subtle bg-sidebar flex flex-col shrink-0 h-full shadow-lg z-20">
        {/* Manifest Import Section */}
        <div className="p-6 border-b border-subtle bg-header/30">
            <h2 className="text-[10px] font-black text-muted mb-4 tracking-[0.15em] uppercase">Manifest Management</h2>
            
            <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className={cn(
                    "w-full border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all duration-300",
                    isProcessing 
                        ? "border-subtle bg-main/50 cursor-not-allowed"
                        : "border-strong/50 hover:border-brand-primary/50 hover:bg-brand-primary/5 text-secondary hover:text-brand-primary"
                )}
            >
                {isProcessing ? (
                    <div className="flex flex-col items-center gap-3 w-full animate-in fade-in duration-500">
                        <FileType className="h-7 w-7 text-brand-primary animate-pulse" />
                        <div className="w-full bg-main rounded-full h-1.5 overflow-hidden shadow-inner">
                            <div className="bg-brand-primary h-full transition-all duration-300" style={{ width: `${progressPercent || 0}%` }}></div>
                        </div>
                        <div className="flex justify-between w-full text-[9px] font-bold text-muted uppercase tracking-widest">
                            <span>{isOCR ? 'RUNNING OCR' : 'EXTRACTING'}</span>
                            <span className="text-brand-primary">{progressPercent || 0}%</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <div className="p-3 bg-brand-primary/10 rounded-2xl mb-1">
                            <UploadCloud className="h-6 w-6 text-brand-primary" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest">Importar Manifesto</span>
                        <span className="text-[10px] font-medium text-muted">Apenas arquivos .PDF</span>
                    </div>
                )}
            </button>

            {error && (
                <div className="mt-4 text-[10px] font-bold text-status-error flex items-center gap-2 bg-status-error/10 p-3 rounded-xl border border-status-error/20 animate-in slide-in-from-top-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error.message}</span>
                </div>
            )}
        </div>
      
        {/* Destination Quick Filters */}
        <div className="px-4 py-4 border-b border-subtle bg-sidebar/50">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
                {filterButtons.map(btn => (
                    <button
                        key={btn.key}
                        onClick={() => setDestinationFilter(btn.key)}
                        className={cn(
                            "px-4 py-2 text-[10px] font-black tracking-widest rounded-xl transition-all border shrink-0 uppercase",
                            destinationFilter === btn.key 
                                ? "bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20" 
                                : "bg-header border-subtle text-muted hover:text-primary hover:border-strong cursor-pointer"
                        )}
                    >
                        {btn.label}
                    </button>
                ))}
            </div>
        </div>

        {/* List Header & Global Actions */}
        <div className="flex-1 overflow-auto p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <h2 className="text-[10px] font-black tracking-[0.2em] text-muted uppercase">Inventory</h2>
                    <span className="text-[11px] font-black bg-brand-primary text-white px-2.5 py-0.5 rounded-full shadow-md shadow-brand-primary/20">
                        {(() => {
                            const count = unallocatedCargoes.filter(c => {
                                if (destinationFilter === 'TODOS') return true;
                                if (destinationFilter === 'S/D') return !c.destinoCarga;
                                return c.destinoCarga === destinationFilter;
                            }).length;
                            return count;
                        })()}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <input 
                        title="Selecionar Visíveis"
                        type="checkbox" 
                        checked={allVisibleSelected}
                        disabled={visibleUnallocated.length === 0}
                        onChange={() => {
                            if (allVisibleSelected) setSelectedCargoIds(new Set());
                            else setSelectedCargoIds(new Set(visibleUnallocated.map(c => c.id)));
                        }}
                        className="w-4 h-4 rounded-md border-strong text-brand-primary focus:ring-brand-primary cursor-pointer disabled:opacity-30 mr-1"
                    />

                    {selectedCargoIds.size > 0 && (
                        <button
                            onClick={() => setIsBatchMoveOpen(true)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black text-white bg-brand-primary hover:brightness-110 shadow-lg shadow-brand-primary/20 transition-all"
                        >
                            <MoveRight className="w-3 h-3" />
                            {selectedCargoIds.size}
                        </button>
                    )}

                    <button
                        onClick={async () => {
                            const msg = selectedCargoIds.size > 0 
                                ? `Excluir ${selectedCargoIds.size} cargas selecionadas?` 
                                : `Excluir TODAS as ${unallocatedCargoes.length} não alocadas?`;
                            
                            if (window.confirm(msg)) {
                                if (selectedCargoIds.size > 0) {
                                    await useCargoStore.getState().deleteMultipleCargoes(Array.from(selectedCargoIds));
                                    setSelectedCargoIds(new Set());
                                } else {
                                    await clearUnallocatedCargoes();
                                }
                            }
                        }}
                        disabled={unallocatedCargoes.length === 0}
                        className={cn(
                            "p-2 rounded-xl transition-all",
                            selectedCargoIds.size > 0 
                                ? "bg-status-error text-white shadow-lg shadow-status-error/20" 
                                : "text-muted hover:text-status-error hover:bg-status-error/10 disabled:opacity-30"
                        )}
                        title="Excluir Cargas"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                        onClick={() => setIsManualModalOpen(true)}
                        className="p-2 text-muted hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all"
                        title="Nova Carga Manual"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

         {!manifestsLoaded && !isProcessing && (
            <div className="text-sm text-neutral-500 dark:text-neutral-600 text-center mt-10 p-4 border border-dashed border-neutral-400 dark:border-neutral-800 rounded-lg">
              Aguardando carga...
            </div>
          )}
         
        {unallocatedCargoes
          .filter(cargo => {
            const matchesSearch = (cargo.identifier || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 (cargo.description || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            const cargoDestination = cargo.destinoCarga;
            let matchesCategory = false;
            if (destinationFilter === 'TODOS') matchesCategory = true;
            else if (destinationFilter === 'S/D') matchesCategory = !cargoDestination;
            else matchesCategory = cargoDestination === destinationFilter;

            return matchesSearch && matchesCategory;
          })
          .map(cargo => (
            <DraggableCargo 
              key={cargo.id} 
              cargo={cargo} 
              isHighlight={searchTerm.length > 0 && 
                ((cargo.identifier || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                 (cargo.description || '').toLowerCase().includes(searchTerm.toLowerCase()))}
              selectable={true}
              isSelected={selectedCargoIds.has(cargo.id)}
              onToggleSelect={(id) => {
                  setSelectedCargoIds(prev => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      return next;
                  });
              }}
              onEdit={handleEditCargo}
            />
          ))}
      </div>

      <ManualCargoModal isOpen={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} />
      {editingCargo && <EditCargoModal isOpen={!!editingCargo} cargo={editingCargo} onClose={() => setEditingCargo(null)} />}
      
      <BackloadResolutionModal 
        isOpen={isBackloadModalOpen}
        onClose={() => setIsBackloadModalOpen(false)}
        extractedBackloads={pendingBackloads}
      />

      <BatchMoveModal
        isOpen={isBatchMoveOpen}
        selectedCount={selectedCargoIds.size}
        selectedCargoIds={Array.from(selectedCargoIds)}
        onClose={() => setIsBatchMoveOpen(false)}
        onSuccess={() => setSelectedCargoIds(new Set())}
      />
    </aside>
  );
}
