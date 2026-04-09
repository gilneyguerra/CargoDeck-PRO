import { useDraggable } from '@dnd-kit/core';
// import { useDragRotation } from '@/hooks/useDragRotation';
import { useCargoStore } from '@/features/cargoStore';
import { cn } from '@/lib/utils';
import type { Cargo } from '@/domain/Cargo';
import { getCargoFontSize, getCargoIconSize } from '@/lib/scaling';
import { CargoPreview } from './CargoPreview';
import { Edit, Trash2, LogOut, MapPin } from 'lucide-react';
import { useDragStore } from '@/features/dragStore';
import { useEffect, useState, useRef } from 'react';

/**
 * Determina se uma cor hexadecimal é "clara" para ajuste de contraste de texto.
 */
function isColorLight(hex: string): boolean {
  if (!hex || hex.length < 7) return false;
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    // Fórmula de luminância padrão
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.65; // Ajustamos o threshold para ser conservador
  } catch (e) {
    return false;
  }
}

function DraggableCargo({ cargo, isHighlight, onEdit }: { cargo: Cargo, isHighlight?: boolean, onEdit: (cargo: Cargo) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: cargo.id,
  });
  const { deleteCargo } = useCargoStore();
  const { isDragging: dragStoreIsDragging } = useDragStore();
  const [isRotated, setIsRotated] = useState(cargo.isRotated ?? false);
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipAlign, setTooltipAlign] = useState<'center' | 'left' | 'right'>('center');
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle global shortcuts (R and Delete) when active (hovering or dragging)
  useEffect(() => {
    setIsRotated(cargo.isRotated ?? false);
  }, [cargo.isRotated]);

  useEffect(() => {
    const isActive = dragStoreIsDragging || isHovered;
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora atalhos de teclado se o usuário estiver focando num campo de texto
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setIsRotated(prev => {
           const next = !prev;
           useCargoStore.getState().updateCargo(cargo.id, { isRotated: next });
           return next;
        });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteCargo(cargo.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dragStoreIsDragging, isHovered, cargo.id, deleteCargo]);

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const handleDelete = async () => {
    if (window.confirm(`Você tem certeza que deseja deletar a carga "${cargo.identifier}" definitivamente?`)) {
      await deleteCargo(cargo.id);
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (containerRef.current) {
       const rect = containerRef.current.getBoundingClientRect();
       const screenWidth = window.innerWidth;
       const tooltipWidth = 256; // w-64 em pixels
       const halfTooltip = tooltipWidth / 2;

       if (rect.left < halfTooltip) {
          setTooltipAlign('left');
       } else if (screenWidth - rect.right < halfTooltip) {
          setTooltipAlign('right');
       } else {
          setTooltipAlign('center');
       }
    }
  };

  const fontSize = getCargoFontSize(cargo);
  const buttonSize = getCargoIconSize(cargo);
  const requiresWeightFix = cargo.weightTonnes === 0 || isNaN(cargo.weightTonnes);
  
  const isLightBackground = isColorLight(cargo.color || '#3b82f6');
  const textColorClass = isLightBackground ? "text-neutral-950" : "text-white/95";

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        (containerRef as any).current = node;
      }}
      style={style}
      {...(requiresWeightFix ? {} : listeners)}
      {...attributes}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative flex flex-col transition-colors cursor-grab select-none",
        isDragging ? "opacity-50 shadow-none scale-95" : (requiresWeightFix ? "cursor-not-allowed opacity-80" : "active:cursor-grabbing hover:z-[1000]"),
        cargo.status === 'ALLOCATED' 
          ? "p-0 rounded-sm hover:-translate-y-0.5 transition-transform shadow-md"
          : "border border-neutral-400 dark:border-neutral-700 rounded p-2 gap-1 bg-neutral-100 dark:bg-neutral-900 hover:border-indigo-500/50",
        cargo.isBackload && cargo.status === 'UNALLOCATED' ? "border-amber-500/60 bg-amber-500/5 dark:bg-amber-900/10" : "",
        isHighlight ? "bg-yellow-200/50 dark:bg-yellow-900/50 border-yellow-500 dark:border-yellow-400" : "",
        requiresWeightFix ? "border-red-500 dark:border-red-500 bg-red-100 dark:bg-red-900/30" : ""
      )}
    >
      {/* Tooltip Global (Hover) - Posicionado abaixo (top-full) para evitar corte no topo do deck */}
      <div className={cn(
        "absolute top-full mt-2 w-64 p-3 bg-gray-900/95 dark:bg-neutral-900/95 backdrop-blur-sm text-white dark:text-neutral-100 text-xs font-sans rounded-lg shadow-2xl shadow-black/80 opacity-0 group-hover:opacity-100 transition-opacity z-[2000] pointer-events-none flex flex-col gap-1 border border-neutral-700/50",
        tooltipAlign === 'center' && "left-1/2 -translate-x-1/2",
        tooltipAlign === 'left' && "left-0 -translate-x-0",
        tooltipAlign === 'right' && "right-0 left-auto translate-x-0"
      )}>
         <div className="font-bold border-b border-neutral-700/50 pb-1 mb-1 truncate text-center text-indigo-400">{cargo.identifier}</div>
         <div className="text-[10px] break-words line-clamp-2 text-neutral-300">{cargo.description}</div>
         <div className="grid grid-cols-2 gap-2 mt-1 bg-black/30 p-1.5 rounded">
            <div>
               <span className="text-neutral-500 block text-[9px]">Dimensões</span>
               <span className="font-mono">{cargo.lengthMeters}x{cargo.widthMeters}{cargo.heightMeters ? `x${cargo.heightMeters}` : ''}m</span>
            </div>
            <div>
               <span className="text-neutral-500 block text-[9px]">Peso</span>
               <span className="font-mono text-emerald-400 font-bold">{cargo.weightTonnes.toFixed(2)} t</span>
            </div>
         </div>
         {cargo.isBackload && (
            <div className="mt-1 flex items-center gap-1.5 px-2 py-1 bg-amber-500/20 text-amber-400 rounded border border-amber-500/30 font-bold text-[9px] uppercase tracking-wider">
               <LogOut size={10} /> DESEMBARQUE / BACKLOAD
            </div>
         )}
         {(cargo.origemCarga || cargo.destinoCarga) && (
            <div className="text-[10px] text-neutral-400 mt-1">
               <span className="text-neutral-500">Rota:</span> {cargo.origemCarga ?? '?'} → {cargo.destinoCarga ?? '?'}
            </div>
         )}
      </div>

      {cargo.status === 'ALLOCATED' ? (
        <div className="relative w-full h-full flex flex-col items-center justify-center group overflow-visible">
             {/* We rotate the cargo preview if isRotated is true */}
             <div style={{ display: 'inline-block', transform: `rotate(${isRotated ? 90 : 0}deg)` }}>
               <CargoPreview format={cargo.format || 'Retangular'} length={cargo.lengthMeters} width={cargo.widthMeters} height={cargo.heightMeters || 1} color={cargo.color || '#3b82f6'} quantity={cargo.quantity} cargo={cargo} />
             </div>
             <span className={cn(
                "absolute inset-0 flex items-center justify-center font-bold text-center leading-none pointer-events-none",
                textColorClass,
                !isLightBackground && "drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]"
             )} style={{ fontSize: `${Math.max(8, fontSize * 0.9)}px` }}>
                {cargo.quantity > 1 ? `${cargo.quantity}x ` : ''}{cargo.identifier}
             </span>

             {/* Destino Badge (Deck) */}
             {cargo.destinoCarga && (
               <div 
                 className={cn(
                   "absolute bottom-0 right-0 px-1 py-0.5 rounded-tl-sm font-black tracking-tighter shadow-sm z-20 pointer-events-none",
                   isLightBackground ? "bg-black/10 text-black/60" : "bg-white/20 text-white/80"
                 )}
                 style={{ fontSize: `${Math.max(6, fontSize * 0.7)}px` }}
               >
                 {cargo.destinoCarga}
               </div>
             )}

             {/* Action Buttons Container */}
             <div className="absolute -top-3 -right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
               {cargo.isBackload && (
                 <div className="bg-amber-500 text-white p-1 rounded-full shadow-sm">
                   <LogOut size={10} />
                 </div>
               )}
               <button
                  onClick={(e) => { e.stopPropagation(); onEdit(cargo); }}
                  className="bg-blue-600/90 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-blue-500 drop-shadow-md border border-white/20"
                  title="Editar Carga"
               >
                 <Edit size={buttonSize * 0.6} />
               </button>
               <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                  className="bg-red-600/90 text-white rounded-full w-6 h-6 flex flex-col items-center justify-center text-[11px] hover:bg-red-500 drop-shadow-md border border-white/20"
                  title="Remover Definitivamente"
               >
                  ✕
               </button>
             </div>
        </div>
      ) : (
        <>
          {requiresWeightFix && (
             <div className="w-full text-center text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 p-1 mb-1 rounded flex items-center justify-center gap-1 animate-pulse border border-red-500/30">
               PESO AUSENTE! CLIQUE PARA EDITAR
             </div>
          )}
          {/* We rotate the cargo preview if isRotated is true */}
          <div style={{ display: 'inline-block', transform: `rotate(${isRotated ? 90 : 0}deg)` }}>
            <CargoPreview format={cargo.format || 'Retangular'} length={cargo.lengthMeters} width={cargo.widthMeters} height={cargo.heightMeters || 1} color={cargo.color || '#3b82f6'} quantity={cargo.quantity} cargo={cargo} />
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 text-center" style={{ fontSize: `${fontSize * 0.8}px` }}>{cargo.quantity} x {cargo.weightTonnes.toFixed(1)} t</div>
          <div className="flex items-start justify-between">
            <div className="flex flex-col items-start gap-1.5 overflow-hidden">
              {/* Identificador no formato CATEGORIA: CÓDIGO */}
              <span className="font-bold text-gray-900 dark:text-neutral-100 leading-tight pr-2 tracking-wide truncate w-full" style={{ fontSize: `${fontSize * 0.9}px` }}>
                {cargo.category !== 'GENERAL' ? `${cargo.category}: ` : ''}{cargo.identifier}
              </span>
              <span className="font-medium text-gray-700 dark:text-neutral-300 leading-tight pr-2 truncate w-full" style={{ fontSize: `${fontSize}px` }}>{cargo.description}</span>
              {/* Origem → Destino com destaque */}
              {(cargo.origemCarga || cargo.destinoCarga) && (
                <div className="flex items-center gap-1.5 mt-1">
                   <span className="text-[9px] text-neutral-400 dark:text-neutral-500 uppercase">{cargo.origemCarga || '???'}</span>
                   <span className="text-neutral-300 dark:text-neutral-700">→</span>
                   <span className="flex items-center gap-0.5 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/30 text-[10px] font-bold">
                      <MapPin size={10} className="shrink-0" />
                      {cargo.destinoCarga || '--'}
                   </span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0 mt-1">
              {cargo.isBackload && (
                <span className="bg-amber-500 text-white px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 uppercase">
                  <LogOut size={8} /> Backload
                </span>
              )}
            </div>
            <div className="flex items-end gap-1 shrink-0 mt-1">
              <button
                onClick={() => onEdit(cargo)}
                className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-500 transition-colors p-1 rounded hover:bg-blue-900/20"
                title="Editar carga"
                style={{ width: `${buttonSize}px`, height: `${buttonSize}px` }}
              >
                <Edit style={{ width: `${buttonSize * 0.7}px`, height: `${buttonSize * 0.7}px` }} />
              </button>
              <button
                onClick={handleDelete}
                className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-500 transition-colors p-1 rounded hover:bg-red-900/20"
                title="Excluir carga"
                style={{ width: `${buttonSize}px`, height: `${buttonSize}px` }}
              >
                <Trash2 style={{ width: `${buttonSize * 0.7}px`, height: `${buttonSize * 0.7}px` }} />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-neutral-600 dark:text-neutral-400 mt-1" style={{ fontSize: `${fontSize * 0.8}px` }}>
            <span className="bg-neutral-300 dark:bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-400 dark:border-neutral-800">{cargo.weightTonnes.toFixed(1)} t</span>
            <span className="bg-neutral-300 dark:bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-400 dark:border-neutral-800">{cargo.lengthMeters}x{cargo.widthMeters} m</span>
            <span className="bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-300 dark:border-indigo-500/20">{cargo.category}</span>
          </div>
        </>
      )}
    </div>
  );
}

export default DraggableCargo;