import { CheckSquare, Square, ArrowRight, Ship, Boxes, Trash2 } from 'lucide-react';
import { MockBrowserFrame } from '../MockBrowserFrame';

const ITEMS = [
  { id: 'CONT-001', desc: 'Container 20"',   w: '24.0', selectedAt: 1.5 },
  { id: 'BSK-002',  desc: 'Cesta Equip.',    w: '12.5', selectedAt: 2.2 },
  { id: 'TUB-004',  desc: 'Tubulares 12m',   w: '8.4',  selectedAt: 2.9 },
  { id: 'EQ-005',   desc: 'Motor 220V',      w: '6.2',  selectedAt: -1 },
  { id: 'CONT-006', desc: 'Container 40"',   w: '28.5', selectedAt: -1 },
];

export function MockBatchMove() {
  return (
    <MockBrowserFrame title="Movimentação em Lote" aspect="aspect-[16/10]">
      <div className="absolute inset-0 p-4 flex flex-col gap-3 text-white/90">
        {/* Header */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-action/20 border border-action/30 flex items-center justify-center">
            <Boxes size={14} className="text-cyan-neon" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Inventário · 5 cargas</span>
        </div>

        {/* Action bar — slides in quando há seleção */}
        <div
          className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-action/15 border-2 border-action/40 opacity-0"
          style={{
            animation: 'action-bar-slide-in 0.6s ease-out forwards',
            animationDelay: '3.2s',
            animationIterationCount: 'infinite',
            animationDuration: '8s',
          }}
        >
          <CheckSquare size={12} className="text-cyan-neon" />
          <span className="text-[9px] font-black uppercase tracking-widest text-white">
            <span className="text-cyan-neon font-mono">3</span> selecionadas · <span className="text-emerald-300 font-mono">44.9 t</span>
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500 text-white">
              <ArrowRight size={9} />
              <span className="text-[8px] font-black uppercase tracking-widest">Mover</span>
            </span>
            <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/60">
              <Trash2 size={9} />
              <span className="text-[8px] font-black uppercase tracking-widest hidden sm:inline">Excluir</span>
            </span>
          </div>
        </div>

        {/* Lista de items com checkbox sequencial */}
        <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
          {ITEMS.map((item, i) => {
            const isSelected = item.selectedAt > 0;
            return (
              <div
                key={item.id}
                className="relative flex items-center gap-2 px-2 py-1.5 rounded-md bg-white/5 border border-white/10"
                style={
                  isSelected
                    ? {
                        animation: 'row-select 8s ease-in-out infinite',
                        animationDelay: `${item.selectedAt - 1.5}s`,
                      }
                    : undefined
                }
              >
                {isSelected ? (
                  <span
                    className="opacity-0"
                    style={{
                      animation: 'check-pop 8s ease-out infinite',
                      animationDelay: `${item.selectedAt - 1.5}s`,
                    }}
                  >
                    <CheckSquare size={12} className="text-cyan-neon" />
                  </span>
                ) : (
                  <Square size={12} className="text-white/30" />
                )}
                <span className="text-[8px] font-mono font-black text-white/70 w-16 truncate">{item.id}</span>
                <span className="text-[8px] text-white/60 flex-1 truncate">{item.desc}</span>
                <span className="text-[8px] font-mono text-cyan-neon shrink-0">{item.w} t</span>
              </div>
            );
          })}
        </div>

        {/* Destination indicator */}
        <div
          className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-400/30 opacity-0"
          style={{
            animation: 'destination-in 1s ease-out forwards',
            animationDelay: '5s',
            animationIterationCount: 'infinite',
            animationDuration: '8s',
          }}
        >
          <ArrowRight size={11} className="text-emerald-300" />
          <Ship size={11} className="text-emerald-300" />
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-200">
            Destino: Convés Principal · Baia 02 · Bombordo
          </span>
        </div>
      </div>
    </MockBrowserFrame>
  );
}
