import { useDraggable } from '@dnd-kit/core';
import { createPortal } from 'react-dom';
import { useCargoStore } from '@/features/cargoStore';
import { useNotificationStore } from '@/features/notificationStore';
import { cn } from '@/lib/utils';
import type { Cargo } from '@/domain/Cargo';
import { getCargoFontSize } from '@/lib/scaling';
import { CargoPreview } from './CargoPreview';
import { Edit, Trash2, LogOut, MapPin } from 'lucide-react';
import { useDragStore } from '@/features/dragStore';
import { useEffect, useState, useRef, memo } from 'react';

/**
 * Determina se uma cor hexadecimal é "clara" para ajuste de contraste de texto.
 */
function isColorLight(hex: string): boolean {
  if (!hex || hex.length < 7) return false;
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.65;
  } catch (e) {
    return false;
  }
}

const DraggableCargo = memo(function DraggableCargo({ cargo, isHighlight, isDimmed, selectable, isSelected, onToggleSelect, onEdit }: { cargo: Cargo, isHighlight?: boolean, isDimmed?: boolean, selectable?: boolean, isSelected?: boolean, onToggleSelect?: (id: string) => void, onEdit: (cargo: Cargo) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: cargo.id,
  });
  const { deleteCargo } = useCargoStore();
  const ask = useNotificationStore(s => s.ask);
  const { isDragging: dragStoreIsDragging } = useDragStore();
  const [isRotated, setIsRotated] = useState(cargo.isRotated ?? false);
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipAlign, setTooltipAlign] = useState<'center' | 'left' | 'right'>('center');
  const [tooltipPlacement, setTooltipPlacement] = useState<'top' | 'bottom'>('bottom');
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsRotated(cargo.isRotated ?? false);
  }, [cargo.isRotated]);

  useEffect(() => {
    const isActive = dragStoreIsDragging || isHovered;
    if (!isActive || isDimmed) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [dragStoreIsDragging, isHovered, cargo.id, deleteCargo, isDimmed]);

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const handleDelete = async () => {
    const ok = await ask('Excluir Carga', `Tem certeza que deseja deletar a carga "${cargo.identifier}" definitivamente?`);
    if (ok) {
      await deleteCargo(cargo.id);
    }
  };

  const handleMouseEnter = () => {
    if (isDimmed) return;
    setIsHovered(true);
    if (containerRef.current) {
       const rect = containerRef.current.getBoundingClientRect();
       const screenWidth = window.innerWidth;
       const screenHeight = window.innerHeight;
       const tooltipWidth = 256;
       const tooltipHeight = 220; // Estimativa de altura máxima
       const halfTooltip = tooltipWidth / 2;

       const spaceBelow = screenHeight - rect.bottom;
       const placement = spaceBelow < tooltipHeight ? 'top' : 'bottom';
       setTooltipPlacement(placement);

       setTooltipPos({
          top: placement === 'bottom' ? rect.bottom + 8 : rect.top - 8,
          left: rect.left + (rect.width / 2)
       });

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
  const requiresWeightFix = cargo.weightTonnes === 0 || isNaN(cargo.weightTonnes);
  const isLightBackground = isColorLight(cargo.color || '#3b82f6');
  const textColorClass = isLightBackground ? "text-neutral-950" : "text-white/95";
  const isHazardous = cargo.isHazardous || cargo.category === 'HAZARDOUS';

  // Desabilita as interações de drag and drop na peça ofuscada
  const dndListeners = isDimmed || requiresWeightFix ? {} : listeners;

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        (containerRef as any).current = node;
      }}
      style={style}
      {...dndListeners}
      {...attributes}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative flex flex-col transition-all duration-300 select-none",
        cargo.status === 'ALLOCATED' ? "item" : "container-item",
        isDimmed ? "pointer-events-none opacity-20 grayscale brightness-50 contrast-50" : "cursor-grab",
        isDragging ? "opacity-50 shadow-none scale-95" : (requiresWeightFix || isDimmed ? "cursor-not-allowed opacity-80" : "active:cursor-grabbing hover:z-[1000]"),
        cargo.status === 'ALLOCATED'
          ? "p-0 rounded-sm shadow-high border border-black/20 dark:border-white/10 shadow-black/50 transition-all hover-glow cargo-hitbox"
          : "glass rounded-2xl p-4 gap-4 w-full shadow-medium hover:shadow-high hover:border-brand-primary active:scale-[0.98] transition-all",
        !isDimmed && cargo.status === 'UNALLOCATED' ? "hover:scale-[1.02]" : "",
        cargo.isBackload && cargo.status === 'UNALLOCATED' ? "border-status-warning/40 bg-status-warning/5" : "",
        isHighlight ? "ring-4 ring-status-warning shadow-glow z-50 transform scale-[1.05]" : "",
        requiresWeightFix ? "border-status-error bg-status-error/10" : "",
        // Borda roxa pulsante para cargas perigosas (alocadas e não alocadas)
        isHazardous && !isHighlight ? "ring-2 ring-purple-500 ring-offset-1 ring-offset-transparent animate-pulse shadow-[0_0_14px_rgba(168,85,247,0.5)]" : ""
      )}
    >
      {/* Tooltip Global (Hover) */}
      {isHovered && createPortal(
        <div 
          style={{ 
            position: 'fixed',
            top: `${tooltipPos.top}px`,
            left: `${tooltipPos.left}px`,
            transform: `translate(${tooltipAlign === 'center' ? '-50%' : tooltipAlign === 'right' ? '-100%' : '0'}, ${tooltipPlacement === 'top' ? '-100%' : '0'})`,
            zIndex: 1200
          }}
          className="w-72 p-5 bg-slate-950/80 backdrop-blur-xl text-white text-xs rounded-3xl shadow-high pointer-events-none flex flex-col gap-3 border border-white/20 animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="font-extrabold border-b border-white/10 pb-3 mb-1 truncate text-brand-primary uppercase tracking-[0.2em]">{cargo.identifier}</div>
          <div className="text-[11px] font-bold text-slate-300 leading-relaxed opacity-90">{cargo.description}</div>
          <div className="grid grid-cols-2 gap-4 mt-2 bg-white/5 p-3 rounded-2xl border border-white/5 shadow-inner">
            <div>
              <span className="text-slate-500 block text-[9px] font-black uppercase tracking-tighter">Dimensões</span>
              <span className="font-mono font-bold">{cargo.lengthMeters}x{cargo.widthMeters}{cargo.heightMeters ? `x${cargo.heightMeters}` : ''}m</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] font-black uppercase tracking-tighter">Peso Métrica</span>
              <span className="font-mono text-emerald-400 font-bold">{cargo.weightTonnes.toFixed(2)} t</span>
            </div>
          </div>
          {cargo.isBackload && (
            <div className="mt-1 flex items-center justify-center gap-2 px-2 py-1.5 bg-status-warning/20 text-status-warning rounded-xl border border-status-warning/30 font-black text-[9px] uppercase tracking-[0.1em]">
              <LogOut size={10} /> BACKLOAD / DESEMBARQUE
            </div>
          )}
        </div>,
        document.body
      )}

      {cargo.status === 'ALLOCATED' ? (
        <div className="relative w-full h-full flex flex-col items-center justify-center group overflow-visible">
          <div style={{ display: 'inline-block', transform: `rotate(${isRotated ? 90 : 0}deg)` }}>
            <CargoPreview format={cargo.format || 'Retangular'} length={cargo.lengthMeters} width={cargo.widthMeters} height={cargo.heightMeters || 1} color={cargo.color || '#4f46e5'} quantity={cargo.quantity} cargo={cargo} />
          </div>
        <div className="absolute inset-0 flex flex-col p-1.5 pointer-events-none overflow-hidden">
          {/* Identificador (Topo/Meio) */}
          <div className={cn(
            "flex-1 flex items-center justify-center font-black text-center leading-tight overflow-hidden break-words",
            textColorClass,
            !isLightBackground && "drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
          )} style={{ fontSize: `${Math.max(6, fontSize * 0.9)}px` }}>
            {cargo.identifier}
          </div>

          {/* Unidade de Destino (Badge) */}
          {cargo.destinoCarga && (
            <div 
              className={cn(
                "mt-auto px-1.5 py-1 rounded-md font-black tracking-tighter shadow-md text-center truncate",
                isLightBackground ? "bg-black/10 text-black/90" : "bg-white/30 text-black"
              )}
              style={{ fontSize: `${Math.max(6, fontSize * 0.8)}px` }}
            >
              {cargo.destinoCarga}
            </div>
          )}
        </div>

          <div className="absolute -top-4 -right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0 z-[1100]">
            <button
               onClick={(e) => { e.stopPropagation(); onEdit(cargo); }}
               className="bg-brand-primary text-white rounded-xl w-8 h-8 flex items-center justify-center hover:scale-110 active:scale-95 shadow-high ring-2 ring-white/50 transition-all hover:bg-brand-primary/90"
               title="Editar Carga"
            >
              <Edit size={14} />
            </button>
            <button
               onClick={(e) => { e.stopPropagation(); handleDelete(); }}
               className="bg-[#ef4444] text-white rounded-xl w-8 h-8 flex items-center justify-center hover:scale-110 active:scale-95 shadow-high ring-2 ring-white/50 transition-all hover:bg-[#dc2626]"
               title="Excluir Carga"
            >
               <Trash2 size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div 
           className={cn("flex flex-col gap-3 w-full", selectable && "cursor-pointer")}
           {...(selectable ? { onClick: (e) => { e.stopPropagation(); onToggleSelect?.(cargo.id); } } : {})}
        >
          {/* Header do Card */}
          <div className="flex items-start justify-between gap-2 border-b border-subtle pb-3 overflow-hidden">
             <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {selectable && (
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      readOnly
                      className="w-4 h-4 rounded-md border-strong text-brand-primary focus:ring-brand-primary cursor-pointer pointer-events-none"
                    />
                  )}
                  <span className="text-[10px] font-extrabold text-brand-primary uppercase tracking-[0.2em] mb-1.5 opacity-80">
                    {cargo.category || 'GENERAL CARGO'}
                  </span>
                </div>
                  <span className="font-extrabold text-base text-primary truncate block tracking-tight" title={cargo.identifier}>
                    {cargo.identifier}
                  </span>
             </div>
             <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(cargo); }}
                  className="p-2.5 text-muted hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all hover:scale-110 active:scale-95"
                  title="Editar Carga"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                  className="p-2.5 text-muted hover:text-[#ef4444] hover:bg-red-500/10 rounded-xl transition-all hover:scale-110 active:scale-95"
                  title="Excluir Carga"
                >
                  <Trash2 size={16} />
                </button>
             </div>
          </div>

          {/* Corpo do Card */}
          {/* Corpo do Card: Preview + Descrição */}
          <div className="flex gap-4 items-start">
             <div className="shrink-0 bg-main p-2 rounded-xl border border-subtle shadow-inner">
                <CargoPreview 
                  format={cargo.format || 'Retangular'} 
                  length={cargo.lengthMeters} 
                  width={cargo.widthMeters} 
                  height={cargo.heightMeters || 1} 
                  color={cargo.color || '#4f46e5'} 
                  quantity={cargo.quantity} 
                  cargo={cargo} 
                  dynamicScale={true} 
                />
             </div>
             <div className="flex-1 min-w-0">
                <p className="text-[11px] text-secondary font-medium leading-relaxed italic opacity-80 break-words line-clamp-3" title={cargo.description}>
                   {cargo.description || 'Sem descrição detalhada.'}
                </p>
             </div>
          </div>

          {/* Grade de Dados Estruturados (Estilo Tooltip) */}
          <div className="grid grid-cols-2 gap-2 mt-1 bg-main/50 p-2.5 rounded-xl border border-subtle/50">
             <div className="flex flex-col">
                <span className="text-muted text-[8px] font-black uppercase tracking-widest mb-0.5">Dimensões</span>
                <span className="font-mono text-[10px] font-bold text-primary">
                   {cargo.lengthMeters}x{cargo.widthMeters}{cargo.heightMeters ? `x${cargo.heightMeters}` : ''}m
                </span>
             </div>
             <div className="flex flex-col">
                <span className="text-muted text-[8px] font-black uppercase tracking-widest mb-0.5">Peso Métrica</span>
                <span className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                   {cargo.weightTonnes.toFixed(2)} t
                </span>
             </div>
          </div>

          {/* Rodapé: Logística e Badges */}
          <div className="flex flex-col gap-2 mt-1">
             {(cargo.origemCarga || cargo.destinoCarga) && (
               <div className="flex items-center gap-2 text-[9px] opacity-80">
                  <span className="text-muted font-bold uppercase tracking-tighter truncate max-w-[80px]">{cargo.origemCarga || 'ORIGEM'}</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-subtle to-transparent" />
                  <div className="flex items-center gap-1 bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded-full font-black border border-brand-primary/20 shrink-0">
                     <MapPin size={8} />
                     <span className="truncate max-w-[100px] uppercase tracking-tighter">{cargo.destinoCarga || '--'}</span>
                  </div>
               </div>
             )}
             
             {cargo.isBackload && (
                <div className="bg-status-warning/10 text-status-warning px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-status-warning/20 flex items-center justify-center gap-1.5 w-full">
                   <LogOut size={10} /> BACKLOAD / DESEMBARQUE
                </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
});

export default DraggableCargo;