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
  };

  return (
    <aside className="w-80 border-r border-neutral-800 bg-[#16161a] flex flex-col shrink-0 h-full">
        <div className="p-4 border-b border-neutral-800 bg-neutral-900/40">
        <h2 className="text-sm font-semibold text-neutral-200 mb-3 tracking-wide">MANIFESTO</h2>
        
        <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className={cn(
            "w-full border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center gap-2 transition-colors",
            isProcessing ? "border-neutral-700 bg-neutral-800/50 text-neutral-500 cursor-not-allowed" : "border-neutral-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-neutral-400"
          )}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center gap-3 w-full animate-pulse transition-all px-2">
              <FileType className="h-6 w-6 text-indigo-400" />
              <div className="w-full bg-neutral-950 rounded-full h-1.5 border border-neutral-700/50 overflow-hidden relative">
                <div className="bg-indigo-500 h-1.5 transition-all duration-300" style={{ width: `${progressPercent || 0}%` }}></div>
              </div>
              <span className="text-[9px] text-indigo-300 text-center uppercase tracking-widest font-semibold">{progressText || 'Extraindo dados...'}</span>
            </div>
          ) : (
            <>
              <UploadCloud className="h-6 w-6" />
              <span className="text-sm font-medium">Importar PDF</span>
            </>
          )}
        </button>

        {error && (
          <div className="mt-3 text-xs text-red-400 flex items-center gap-1.5 bg-red-400/10 p-2 rounded">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-auto p-4 flex flex-col gap-3 relative">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold tracking-widest text-neutral-400 uppercase">Não Alocadas</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md font-medium">
              {unallocatedCargoes.length}
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
            .filter(cargo =>
              cargo.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
              cargo.description.toLowerCase().includes(searchTerm.toLowerCase())
            )
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
