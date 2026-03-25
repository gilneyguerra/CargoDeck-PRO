import { UploadCloud, FileType, AlertCircle } from 'lucide-react';
import { useCargoStore } from '@/features/cargoStore';
import { useManifestUpload } from '@/features/useManifestUpload';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { useDraggable } from '@dnd-kit/core';
import type { Cargo } from '@/domain/Cargo';

function DraggableCargo({ cargo }: { cargo: Cargo }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: cargo.id,
  });
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className={cn(
        "bg-neutral-800 border border-neutral-700 rounded p-3 flex flex-col gap-2 transition-colors cursor-grab select-none",
        isDragging ? "opacity-50" : "hover:border-indigo-500/50 active:cursor-grabbing"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col items-start gap-1.5">
          <span className="text-sm font-medium text-neutral-200 leading-tight pr-2">{cargo.description}</span>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0 mt-1">
          {cargo.observations === 'BACKLOAD' && (
            <span className="text-[9px] bg-amber-500/20 text-amber-500 px-1 py-0.5 rounded uppercase font-bold tracking-wider">Backload</span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-neutral-400 mt-1">
        <span className="bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">{cargo.weightTonnes.toFixed(1)} t</span>
        <span className="bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">{cargo.lengthMeters}x{cargo.widthMeters} m</span>
        <span className="bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20">{cargo.category}</span>
      </div>
    </div>
  )
}

export function Sidebar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { unallocatedCargoes, manifestsLoaded } = useCargoStore();
  const { isProcessing, progressText, progressPercent, error, handleFileUpload } = useManifestUpload();

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
          <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md font-medium">
            {unallocatedCargoes.length}
          </span>
        </div>

        {!manifestsLoaded && !isProcessing && (
           <div className="text-sm text-neutral-600 text-center mt-10 p-4 border border-dashed border-neutral-800 rounded-lg">
             Aguardando carga...
           </div>
        )}

        {unallocatedCargoes.map(cargo => (
          <DraggableCargo key={cargo.id} cargo={cargo} />
        ))}
      </div>
    </aside>
  );
}
