import { UploadCloud, FileType, AlertCircle, Trash2, Plus, Edit } from 'lucide-react';
import { useCargoStore } from '@/features/cargoStore';
import { useManifestUpload } from '@/features/useManifestUpload';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Cargo } from '@/domain/Cargo';
import { ManualCargoModal } from './ManualCargoModal';
import { EditCargoModal } from './EditCargoModal';
import { CargoPreview } from './CargoPreview';
import { getCargoFontSize, getCargoIconSize } from '@/lib/scaling';
import DraggableCargo from './DraggableCargo';

export type CargoFilter = 'ALL' | 'GENERAL' | 'CONTAINER' | 'HAZARDOUS' | 'HEAVY' | 'FRAGILE' | 'OTHER';

export function Sidebar() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { unallocatedCargoes, manifestsLoaded, searchTerm, editingCargo, setEditingCargo } = useCargoStore();
    const { isProcessing, progressText, progressPercent, error, handleFileUpload } = useManifestUpload();
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileUpload(file);
            e.target.value = ''; // Reset to allow re-upload of the same file
        }
    };

    return (
    <aside className="w-80 border-r border-neutral-800 bg-[#16161a] flex flex-col shrink-0 h-full">
        <div className="p-4 border-b border-neutral-800 bg-neutral-900/40">
        <h2 className="text-sm font-semibold text-neutral-200 mb-3 tracking-wide">MANIFESTO</h2>
        
        <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
        
         <button 
           onClick={() => fileInputRef.current?.click()}
           disabled={isProcessing}
           className={isProcessing 
             ? "w-full border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center gap-2 transition-colors border-neutral-700 bg-neutral-800/50 text-neutral-500 cursor-not-allowed"
             : "w-full border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center gap-2 transition-colors border-neutral-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-neutral-400"
           }
         >
           {isProcessing ? (
             <div className="flex flex-col items-center justify-center gap-3 w-full animate-pulse transition-all px-2">
               <FileType className="h-6 w-6 text-indigo-400" />
               <div className="w-full bg-neutral-950 rounded-full h-2 border border-neutral-700/50 overflow-hidden relative">
                 <div className="bg-indigo-500 h-2 transition-all duration-300" style={{ width: `${progressPercent || 0}%` }}></div>
               </div>
               <div className="flex justify-between w-full text-[8px] font-mono text-neutral-400">
                 <span className="text-indigo-300">{progressText || 'Inicializando...'}</span>
                 <span>{progressPercent || 0}%</span>
               </div>
               <div className="flex gap-1 mt-1">
                 <span className={`text-[7px] px-1.5 py-0.5 rounded ${progressPercent >= 10 ? 'bg-green-900/30 text-green-400' : 'bg-neutral-800 text-neutral-600'}`}>✓ PDF</span>
                 <span className={`text-[7px] px-1.5 py-0.5 rounded ${progressPercent >= 30 ? 'bg-amber-900/30 text-amber-400' : 'bg-neutral-800 text-neutral-600'}`}>OCR</span>
                 <span className={`text-[7px] px-1.5 py-0.5 rounded ${progressPercent >= 95 ? 'bg-blue-900/30 text-blue-400' : 'bg-neutral-800 text-neutral-600'}`}>Parse</span>
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
            <span>{error}</span>
          </div>
        )}
      </div>
      
      <div className="px-2 py-2 border-b border-neutral-800 bg-neutral-900/20">
        <div className="flex flex-wrap gap-1">
          {filterButtons.map(btn => (
            <button
              key={btn.key}
              onClick={() => setCategoryFilter(btn.key)}
              className={cn(
                "px-2 py-1 text-[9px] font-bold tracking-wider rounded transition-all",
                categoryFilter === btn.key 
                  ? "bg-indigo-600 text-white border border-indigo-500" 
                  : "bg-neutral-800 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700 border border-transparent"
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 flex flex-col gap-3 relative">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold tracking-widest text-neutral-400 uppercase">Não Alocadas</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md font-medium">
              {categoryFilter === 'ALL' 
                ? unallocatedCargoes.length 
                : unallocatedCargoes.filter(c => c.category === categoryFilter).length}
            </span>
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="text-neutral-400 hover:text-indigo-400 transition-colors"
              title="Adicionar carga manual"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

         {!manifestsLoaded && !isProcessing && (
            <div className="text-sm text-neutral-600 text-center mt-10 p-4 border border-dashed border-neutral-800 rounded-lg">
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
