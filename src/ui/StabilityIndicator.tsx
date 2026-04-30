import { useMemo } from 'react';
import { Scale } from 'lucide-react';
import { useCargoStore } from '@/features/cargoStore';
import { cn } from '@/lib/utils';

interface StabilityIndicatorProps {
  /** 'horizontal' = layout original (h-16 px-8); 'compact' = empilhado para sidebar */
  variant?: 'horizontal' | 'compact';
}

/**
 * Indicador de Banda (Bombordo / Boreste) e Estabilidade Longitudinal/Transversal.
 * Calcula a partir do estado global (locations / bays / allocatedCargoes).
 * Movido do header do DeckArea para o Sidebar (variant='compact').
 */
export function StabilityIndicator({ variant = 'compact' }: StabilityIndicatorProps) {
  const locations = useCargoStore(s => s.locations);

  const { totalPort, totalStarboard, totalTopHeavyMoment, isListing, isTopHeavy } = useMemo(() => {
    let port = 0;
    let starboard = 0;
    let topHeavy = 0;

    locations.forEach(loc => {
      const elev = loc.config.elevationMeters !== undefined ? loc.config.elevationMeters : 30;
      loc.bays.forEach(bay => {
        bay.allocatedCargoes.forEach(c => {
          const cargoWeight = c.weightTonnes * c.quantity;
          if (c.positionInBay === 'port') port += cargoWeight;
          else if (c.positionInBay === 'starboard') starboard += cargoWeight;
          const cargoHeight = c.heightMeters || 2.5;
          const centerOfGravityZ = elev + (cargoHeight / 2);
          topHeavy += (cargoWeight * centerOfGravityZ);
        });
      });
    });

    const listDiff = Math.abs(port - starboard);
    return {
      totalPort: port,
      totalStarboard: starboard,
      totalTopHeavyMoment: topHeavy,
      isListing: listDiff > 50,
      isTopHeavy: topHeavy > 100000,
    };
  }, [locations]);

  const hasData = totalPort > 0 || totalStarboard > 0;
  if (!hasData) return null;

  const portRatio = (totalPort / (Math.max(totalPort, totalStarboard) || 1)) * 100;
  const starboardRatio = (totalStarboard / (Math.max(totalPort, totalStarboard) || 1)) * 100;

  if (variant === 'horizontal') {
    return (
      <div
        className="flex items-center gap-8 px-8 bg-sidebar/20 border border-subtle/60 rounded-2xl py-2 shadow-inner h-16"
        title="Indicador de Banda e Estabilidade Longitudinal/Transversal."
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
        <div className="h-6 w-px bg-border-subtle opacity-30" />
        <div className="flex flex-col items-center min-w-24">
          <span className="text-[9px] text-secondary font-black tracking-[0.2em] uppercase mb-0.5 opacity-70">Stability</span>
          <div className="flex items-center gap-1.5">
            <div className={cn('p-1 rounded-md transition-colors', isTopHeavy ? 'bg-status-error/10 text-status-error' : 'bg-status-success/10 text-status-success')}>
              <Scale size={12} />
            </div>
            <span className={cn('text-sm font-black tracking-tighter tabular-nums', isTopHeavy ? 'text-status-error' : 'text-primary')}>
              {totalTopHeavyMoment.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-[9px] font-bold text-muted uppercase">tm</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Layout COMPACT — empilhado, ideal para sidebar 360px
  return (
    <div
      className="bg-sidebar/40 border-2 border-subtle rounded-xl px-4 py-3 shadow-inner space-y-3"
      title="Indicador de Banda e Estabilidade Longitudinal/Transversal."
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black text-muted uppercase tracking-widest">Estabilidade</span>
        <div className="flex items-center gap-1.5">
          <div className={cn('p-1 rounded-md transition-colors', isTopHeavy ? 'bg-status-error/10 text-status-error' : 'bg-status-success/10 text-status-success')}>
            <Scale size={11} />
          </div>
          <span className={cn('text-[11px] font-black tracking-tighter tabular-nums', isTopHeavy ? 'text-status-error' : 'text-primary')}>
            {totalTopHeavyMoment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            <span className="text-[8px] font-bold text-muted uppercase ml-0.5">tm</span>
          </span>
        </div>
      </div>

      {/* Bombordo / Boreste labels */}
      <div className="flex justify-between text-[9px] font-black tracking-[0.2em] uppercase">
        <span className={cn('transition-colors', totalPort > totalStarboard + 50 ? 'text-status-error' : 'text-secondary')}>BOMBORDO</span>
        <span className={cn('transition-colors', totalStarboard > totalPort + 50 ? 'text-status-error' : 'text-secondary')}>BORESTE</span>
      </div>

      {/* Barra de banda */}
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

      {/* Status flag */}
      {(isListing || isTopHeavy) && (
        <div className="flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest text-status-error bg-status-error/5 border border-status-error/30 rounded-md py-1 animate-pulse">
          {isListing && <span>BANDA &gt; 50t</span>}
          {isListing && isTopHeavy && <span className="opacity-50">·</span>}
          {isTopHeavy && <span>TOP-HEAVY</span>}
        </div>
      )}
    </div>
  );
}
