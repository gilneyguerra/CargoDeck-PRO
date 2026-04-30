import { useMemo } from 'react';
import { Scale } from 'lucide-react';
import { useCargoStore } from '@/features/cargoStore';
import { cn } from '@/lib/utils';

interface StabilityIndicatorProps {
  /** 'horizontal' = layout original (h-16 px-8); 'compact' = empilhado para sidebar */
  variant?: 'horizontal' | 'compact';
}

/**
 * Indicador de Divisão de Pesos por bordo: Bombordo / Centro / Boreste.
 * Calcula a partir do estado global (locations / bays / allocatedCargoes).
 */
export function StabilityIndicator({ variant = 'compact' }: StabilityIndicatorProps) {
  const locations = useCargoStore(s => s.locations);

  const { totalPort, totalCenter, totalStarboard, isListing } = useMemo(() => {
    let port = 0;
    let center = 0;
    let starboard = 0;

    locations.forEach(loc => {
      loc.bays.forEach(bay => {
        bay.allocatedCargoes.forEach(c => {
          const cargoWeight = c.weightTonnes * c.quantity;
          if (c.positionInBay === 'port') port += cargoWeight;
          else if (c.positionInBay === 'starboard') starboard += cargoWeight;
          else if (c.positionInBay === 'center') center += cargoWeight;
        });
      });
    });

    const listDiff = Math.abs(port - starboard);
    return {
      totalPort: port,
      totalCenter: center,
      totalStarboard: starboard,
      isListing: listDiff > 50,
    };
  }, [locations]);

  const hasData = totalPort > 0 || totalCenter > 0 || totalStarboard > 0;
  if (!hasData) return null;

  // Para a barra de Bombordo vs Boreste, escala proporcional dentro do par lateral
  const maxSide = Math.max(totalPort, totalStarboard, 1);
  const portRatio = (totalPort / maxSide) * 100;
  const starboardRatio = (totalStarboard / maxSide) * 100;
  // Para a barra de Centro, escala em relação ao maior peso entre os 3 (mais informativo)
  const maxAll = Math.max(totalPort, totalCenter, totalStarboard, 1);
  const centerRatio = (totalCenter / maxAll) * 100;

  if (variant === 'horizontal') {
    return (
      <div
        className="flex items-center gap-8 px-8 bg-sidebar/20 border border-subtle/60 rounded-2xl py-2 shadow-inner h-16"
        title="Divisão de Pesos por Bordo (Bombordo / Centro / Boreste)"
      >
        <div className="flex flex-col items-center gap-1 flex-1 min-w-[200px]">
          <div className="flex justify-between w-full text-[9px] font-black tracking-[0.2em] uppercase">
            <span className={cn('transition-colors', totalPort > totalStarboard + 50 ? 'text-status-error' : 'text-secondary')}>BOMBORDO</span>
            <span className={cn('transition-colors', totalStarboard > totalPort + 50 ? 'text-status-error' : 'text-secondary')}>BORESTE</span>
          </div>
          <div className="flex items-center gap-3 w-full">
            <span className="text-[11px] font-mono font-black text-primary tabular-nums w-10 text-right">{totalPort.toFixed(0)}<small className="opacity-50 ml-0.5">t</small></span>
            <div className="flex-1 h-3 bg-main/40 border border-subtle rounded-full overflow-hidden flex shadow-inner p-0.5 relative">
              <div className="flex-1 flex justify-end">
                <div className={cn('h-full transition-all duration-700 rounded-l-sm', isListing && totalPort > totalStarboard ? 'bg-status-error' : 'bg-brand-primary')} style={{ width: `${portRatio}%` }} />
              </div>
              <div className="w-px bg-border-strong mx-0.5 z-10 opacity-30" />
              <div className="flex-1">
                <div className={cn('h-full transition-all duration-700 rounded-r-sm', isListing && totalStarboard > totalPort ? 'bg-status-error' : 'bg-brand-primary')} style={{ width: `${starboardRatio}%` }} />
              </div>
            </div>
            <span className="text-[11px] font-mono font-black text-primary tabular-nums w-10">{totalStarboard.toFixed(0)}<small className="opacity-50 ml-0.5">t</small></span>
          </div>
        </div>
      </div>
    );
  }

  // Layout COMPACT — sidebar 360px, com 3 barras (Bombordo / Centro / Boreste)
  return (
    <div
      className="bg-sidebar/40 border-2 border-subtle rounded-xl px-4 py-3 shadow-inner space-y-3"
      title="Divisão de Pesos por Bordo (Bombordo / Centro / Boreste)"
    >
      {/* Header centralizado */}
      <div className="flex items-center justify-center gap-2">
        <Scale size={11} className="text-status-success" />
        <span className="text-[9px] font-black text-muted uppercase tracking-widest">Divisão de Pesos</span>
      </div>

      {/* Bombordo / Boreste — barra par lateral */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[9px] font-black tracking-[0.2em] uppercase">
          <span className={cn('transition-colors', totalPort > totalStarboard + 50 ? 'text-status-error' : 'text-secondary')}>BOMBORDO</span>
          <span className={cn('transition-colors', totalStarboard > totalPort + 50 ? 'text-status-error' : 'text-secondary')}>BORESTE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-black text-primary tabular-nums w-9 text-right">
            {totalPort.toFixed(0)}<small className="opacity-50 ml-0.5">t</small>
          </span>
          <div className="flex-1 h-2.5 bg-main/40 border border-subtle rounded-full overflow-hidden flex shadow-inner p-0.5 relative">
            <div className="flex-1 flex justify-end">
              <div className={cn('h-full transition-all duration-700 rounded-l-sm', isListing && totalPort > totalStarboard ? 'bg-status-error' : 'bg-brand-primary')} style={{ width: `${portRatio}%` }} />
            </div>
            <div className="w-px bg-border-strong mx-0.5 z-10 opacity-30" />
            <div className="flex-1">
              <div className={cn('h-full transition-all duration-700 rounded-r-sm', isListing && totalStarboard > totalPort ? 'bg-status-error' : 'bg-brand-primary')} style={{ width: `${starboardRatio}%` }} />
            </div>
          </div>
          <span className="text-[10px] font-mono font-black text-primary tabular-nums w-9">
            {totalStarboard.toFixed(0)}<small className="opacity-50 ml-0.5">t</small>
          </span>
        </div>
      </div>

      {/* Centro — barra de centralizadas */}
      <div className="space-y-1.5">
        <div className="flex justify-center text-[9px] font-black tracking-[0.2em] uppercase">
          <span className="text-secondary">CENTRO</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Espaço fantasma para alinhar com a barra de cima */}
          <span className="text-[10px] font-mono font-black text-muted/30 tabular-nums w-9 text-right select-none">·</span>
          <div className="flex-1 h-2.5 bg-main/40 border border-subtle rounded-full overflow-hidden shadow-inner p-0.5 relative">
            <div className="h-full transition-all duration-700 rounded-sm bg-emerald-500" style={{ width: `${centerRatio}%` }} />
          </div>
          <span className="text-[10px] font-mono font-black text-primary tabular-nums w-9">
            {totalCenter.toFixed(0)}<small className="opacity-50 ml-0.5">t</small>
          </span>
        </div>
      </div>

      {/* Status flag */}
      {isListing && (
        <div className="flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest text-status-error bg-status-error/5 border border-status-error/30 rounded-md py-1 animate-pulse">
          <span>BANDA &gt; 50t</span>
        </div>
      )}
    </div>
  );
}
