import { UploadCloud, FileType, AlertCircle, Trash2, Plus } from 'lucide-react';
import { useCargoStore } from '@/features/cargoStore';
import { usePDFUpload } from '@/hooks/usePDFUpload';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Cargo, CargoCategory } from '@/domain/Cargo';
import type { CargoItem } from '@/services/pdfExtractor';
import { ManualCargoModal } from './ManualCargoModal';
import { EditCargoModal } from './EditCargoModal';
import DraggableCargo from './DraggableCargo';

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
    const [categoryFilter, setCategoryFilter] = useState<CargoFilter>('ALL');

    const filterButtons: { key: CargoFilter; label: string; color: string }[] = [
        { key: 'ALL', label: 'TODOS', color: 'text-neutral-400' },
        { key: 'GENERAL', label: 'GERAL', color: 'text-blue-400' },
        { key: 'CONTAINER', label: 'CONTÊINER', color: 'text-orange-400' },
        { key: 'HEAVY', label: 'PESADO', color: 'text-red-400' },
        { key: 'HAZARDOUS', label: 'PERIGOSO', color: 'text-yellow-400' },
        { key: 'FRAGILE', label: 'FRÁGIL', color: 'text-purple-400' },
    ];

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
                        // Usa o código identificador real (ex: "MLTU 280189-9"), não o ID interno
                        identifier: item.identifier,
                        // Peso já vem em toneladas do extrator (foi convertido de KG)
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
                        // Dados do manifesto
                        nomeEmbarcacao:    item.nomeEmbarcacao,
                        numeroAtendimento: item.numeroAtendimento,
                        origemCarga:       item.origemCarga,
                        destinoCarga:      item.destinoCarga,
                        roteiroPrevisto:   item.roteiroPrevisto,
                    };
                });
                useCargoStore.getState().setExtractedCargoes(mappedCargoes);
            }
            e.target.value = '';
        }
    };

    return (
    <aside className="w-80 border-r border-neutral-300 dark:border-neutral-800 bg-neutral-100 dark:bg-[#16161a] flex flex-col shrink-0 h-full">
        <div className="p-4 border-b border-neutral-300 dark:border-neutral-800 bg-neutral-200/50 dark:bg-neutral-900/40">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-neutral-200 mb-3 tracking-wide">MANIFESTO</h2>
        
        <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
        
         <button 
           onClick={() => fileInputRef.current?.click()}
           disabled={isProcessing}
            className={isProcessing 
              ? "w-full border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center gap-2 transition-colors border-neutral-400 dark:border-neutral-700 bg-neutral-300 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-500 cursor-not-allowed"
              : "w-full border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center gap-2 transition-colors border-neutral-400 dark:border-neutral-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-neutral-700 dark:text-neutral-400"
            }
         >
           {isProcessing ? (
             <div className="flex flex-col items-center justify-center gap-3 w-full animate-pulse transition-all px-2">
               <FileType className="h-6 w-6 text-indigo-400" />
                <div className="w-full bg-neutral-300 dark:bg-neutral-950 rounded-full h-2 border border-neutral-400 dark:border-neutral-700/50 overflow-hidden relative">
                  <div className="bg-indigo-500 h-2 transition-all duration-300" style={{ width: `${progressPercent || 0}%` }}></div>
                </div>
                <div className="flex justify-between w-full text-[8px] font-mono text-neutral-600 dark:text-neutral-400">
                  <span className="text-indigo-600 dark:text-indigo-300">
                    {isOCR ? 'Processando OCR...' : progressPercent < 30 ? 'Lendo PDF...' : progressPercent < 95 ? 'Extraindo texto...' : 'Finalizando...'}
                  </span>
                  <span>{progressPercent || 0}%</span>
                </div>
                <div className="flex gap-1 mt-1">
                  <span className={`text-[7px] px-1.5 py-0.5 rounded ${progressPercent >= 10 ? 'bg-green-800/30 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-neutral-300 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-600'}`}>✓ PDF</span>
                  <span className={`text-[7px] px-1.5 py-0.5 rounded ${isOCR && progressPercent >= 30 ? 'bg-amber-800/30 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : progressPercent >= 30 && !isOCR ? 'bg-green-800/30 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-neutral-300 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-600'}`}>
                    {isOCR && progressPercent >= 30 ? '✓ OCR' : progressPercent >= 30 && !isOCR ? '✓ Texto' : 'OCR'}
                  </span>
                  <span className={`text-[7px] px-1.5 py-0.5 rounded ${progressPercent >= 95 ? 'bg-blue-800/30 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-neutral-300 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-600'}`}>Parse</span>
                </div>
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center gap-3 w-full">
               <UploadCloud className="h-6 w-6" />
               <span className="text-sm font-medium">Importar PDF</span>
             </div>
           )}
         </button>

        {error && (
          <div className="mt-3 text-xs text-red-400 flex items-center gap-1.5 bg-red-400/10 p-2 rounded">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error.message}</span>
          </div>
        )}
      </div>
      
      <div className="px-2 py-2 border-b border-neutral-300 dark:border-neutral-800 bg-neutral-200/30 dark:bg-neutral-900/20">
        <div className="flex flex-wrap gap-1">
          {filterButtons.map(btn => (
            <button
              key={btn.key}
              onClick={() => setCategoryFilter(btn.key)}
              className={cn(
                "px-2 py-1 text-[9px] font-bold tracking-wider rounded transition-all",
                categoryFilter === btn.key 
                  ? "bg-indigo-600 text-white border border-indigo-500" 
                  : "bg-neutral-300 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-neutral-300 hover:bg-neutral-400 dark:hover:bg-neutral-700 border border-transparent"
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 flex flex-col gap-3 relative">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold tracking-widest text-neutral-600 dark:text-neutral-400 uppercase">Não Alocadas</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md font-medium">
              {categoryFilter === 'ALL' 
                ? unallocatedCargoes.length 
                : unallocatedCargoes.filter(c => c.category === categoryFilter).length}
            </span>
            <button
              onClick={async () => {
                if (window.confirm(`Tem certeza que deseja excluir ${unallocatedCargoes.length} carga(s) não alocada(s)?`)) {
                  await clearUnallocatedCargoes();
                }
              }}
              disabled={unallocatedCargoes.length === 0}
              className="text-neutral-600 dark:text-neutral-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Excluir todas as cargas não alocadas"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="text-neutral-600 dark:text-neutral-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
              title="Adicionar carga manual"
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
    const matchesSearch = cargo.identifier.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         cargo.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || cargo.category === categoryFilter;
    return matchesSearch && matchesCategory;
  })
  .map(cargo => (
    <DraggableCargo 
      key={cargo.id} 
      cargo={cargo} 
      isHighlight={searchTerm.length > 0 && 
        (cargo.identifier.toLowerCase().includes(searchTerm.toLowerCase()) || 
         cargo.description.toLowerCase().includes(searchTerm.toLowerCase()))}
      onEdit={handleEditCargo}
    />
  ))}
      </div>

      <ManualCargoModal isOpen={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} />
      <EditCargoModal isOpen={!!editingCargo} cargo={editingCargo} onClose={() => setEditingCargo(null)} />
    </aside>
  );
}
