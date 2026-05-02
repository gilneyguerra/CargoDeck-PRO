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

  // Para a barra de Bombordo vs Boreste (variant horizontal), escala
  // proporcional dentro do par lateral.
  const maxSide = Math.max(totalPort, totalStarboard, 1);
  const portRatio = (totalPort / maxSide) * 100;
  const starboardRatio = (totalStarboard / maxSide) * 100;

  // Para a barra integrada 3-segmentos (variant compact), cada segmento ocupa
  // sua fatia proporcional ao peso total. Soma = 100% (visualização de
  // distribuição). Vazios encolhem; lados/centro mais pesados crescem.
  const totalAll = totalPort + totalCenter + totalStarboard || 1;
  const portPct = (totalPort / totalAll) * 100;
  const centerPct = (totalCenter / totalAll) * 100;
  const starboardPct = (totalStarboard / totalAll) * 100;

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
                <div className={cn('h-full transition-[width,background-color] duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] rounded-l-sm', isListing && totalPort > totalStarboard ? 'bg-status-error' : 'bg-brand-primary')} style={{ width: `${portRatio}%` }} />
              </div>
              <div className="w-px bg-border-strong mx-0.5 z-10 opacity-30" />
              <div className="flex-1">
                <div className={cn('h-full transition-[width,background-color] duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] rounded-r-sm', isListing && totalStarboard > totalPort ? 'bg-status-error' : 'bg-brand-primary')} style={{ width: `${starboardRatio}%` }} />
              </div>
            </div>
            <span className="text-[11px] font-mono font-black text-primary tabular-nums w-10">{totalStarboard.toFixed(0)}<small className="opacity-50 ml-0.5">t</small></span>
          </div>
        </div>
      </div>
    );
  }

  // Layout COMPACT — sidebar 360px, barra integrada 3-segmentos
  // (Bombordo | Centro | Boreste) com cada segmento dimensionado pela fração
  // do peso total. Cores distintas para leitura imediata; bombordo e boreste
  // ficam vermelhos quando há banda lateral > 50t.
  const portColor = isListing && totalPort > totalStarboard ? 'bg-status-error' : 'bg-sky-500';
  const starboardColor = isListing && totalStarboard > totalPort ? 'bg-status-error' : 'bg-violet-500';
  const portLabel = cn('transition-colors', isListing && totalPort > totalStarboard ? 'text-status-error' : 'text-sky-500');
  const starboardLabel = cn('transition-colors', isListing && totalStarboard > totalPort ? 'text-status-error' : 'text-violet-500');

  return (
    <div
      className="bg-sidebar/40 border-2 border-subtle rounded-xl px-4 py-3 shadow-inner space-y-2.5"
      title="Divisão de Pesos por Bordo (Bombordo / Centro / Boreste)"
    >
      {/* Header centralizado */}
      <div className="flex items-center justify-center gap-2">
        <Scale size={11} className="text-status-success" />
        <span className="text-[9px] font-black text-muted uppercase tracking-widest">Divisão de Pesos</span>
      </div>

      {/* Labels (bombordo | centro | boreste) — alinhadas em 3 colunas iguais */}
      <div className="grid grid-cols-3 gap-1 text-[9px] font-black tracking-[0.15em] uppercase">
        <span className={cn('text-left', portLabel)}>Bombordo</span>
        <span className="text-center text-emerald-500">Centro</span>
        <span className={cn('text-right', starboardLabel)}>Boreste</span>
      </div>

      {/* Valores numéricos — mesma grid, alinhados sob a label correspondente */}
      <div className="grid grid-cols-3 gap-1 text-[12px] font-black tabular-nums text-primary">
        <span className="text-left">{totalPort.toFixed(0)}<small className="opacity-60 ml-0.5">t</small></span>
        <span className="text-center">{totalCenter.toFixed(0)}<small className="opacity-60 ml-0.5">t</small></span>
        <span className="text-right">{totalStarboard.toFixed(0)}<small className="opacity-60 ml-0.5">t</small></span>
      </div>

      {/* Barra integrada 3-segmentos — soma = 100% do peso total */}
      <div className="h-3 bg-main/40 border border-subtle rounded-full overflow-hidden flex shadow-inner">
        {totalPort > 0 && (
          <div
            className={cn('h-full transition-[width,background-color] duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]', portColor)}
            style={{ width: `${portPct}%` }}
            title={`Bombordo: ${totalPort.toFixed(1)} t (${portPct.toFixed(0)}%)`}
          />
        )}
        {totalCenter > 0 && (
          <div
            className="h-full transition-[width] duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] bg-emerald-500"
            style={{ width: `${centerPct}%` }}
            title={`Centro: ${totalCenter.toFixed(1)} t (${centerPct.toFixed(0)}%)`}
          />
        )}
        {totalStarboard > 0 && (
          <div
            className={cn('h-full transition-[width,background-color] duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]', starboardColor)}
            style={{ width: `${starboardPct}%` }}
            title={`Boreste: ${totalStarboard.toFixed(1)} t (${starboardPct.toFixed(0)}%)`}
          />
        )}
      </div>

      {/* Total + flag de banda */}
      <div className="flex items-center justify-between text-[11px] tabular-nums pt-1">
        <span className="text-muted">
          Total: <span className="text-primary font-black">{totalAll.toFixed(0)}t</span>
        </span>
        {isListing && (
          <span className="text-[10px] text-status-error font-black uppercase tracking-widest animate-pulse">
            ⚠ Banda &gt; 50t
          </span>
        )}
      </div>
    </div>
  );
}
