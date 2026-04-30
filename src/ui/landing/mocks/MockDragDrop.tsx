import { Ship, MousePointer2 } from 'lucide-react';
import { MockBrowserFrame } from '../MockBrowserFrame';

const BAYS = [
  { num: 1, label: 'B01', occupancy: 30 },
  { num: 2, label: 'B02', occupancy: 0,  isTarget: true },
  { num: 3, label: 'B03', occupancy: 60 },
  { num: 4, label: 'B04', occupancy: 80 },
];

export function MockDragDrop() {
  return (
    <MockBrowserFrame title="Plano de Convés" aspect="aspect-[16/10]">
      <div className="absolute inset-0 p-4 flex flex-col gap-3 text-white/90">
        {/* Header */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-action/20 border border-action/30 flex items-center justify-center">
            <Ship size={14} className="text-cyan-neon" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Convés Principal</span>
          <span className="ml-auto text-[8px] font-mono text-white/40">arraste e solte</span>
        </div>

        {/* Layout: lista de cargas (esquerda) + plano de baias (direita) */}
        <div className="flex-1 grid grid-cols-[120px_1fr] gap-3 min-h-0">
          {/* Lista de cargas */}
          <div className="flex flex-col gap-1.5 overflow-hidden">
            <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Não alocadas</span>
            {[
              { id: 'CONT-001', w: '24t', isMoving: true },
              { id: 'BSK-002',  w: '12t' },
              { id: 'TUB-004',  w: '8t' },
              { id: 'EQ-005',   w: '6t' },
            ].map((c) => (
              <div
                key={c.id}
                className={`relative px-2 py-1.5 rounded-md border ${
                  c.isMoving
                    ? 'border-cyan-neon/60 bg-cyan-neon/5 shadow-[0_0_12px_rgba(0,217,255,0.3)]'
                    : 'border-white/10 bg-white/5'
                }`}
                style={c.isMoving ? { animation: 'card-source-pulse 6s ease-in-out infinite' } : undefined}
              >
                <div className="flex items-center justify-between text-[8px]">
                  <span className="font-mono font-black text-white/80">{c.id}</span>
                  <span className="font-mono text-cyan-neon">{c.w}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Plano de baias 2x2 */}
          <div className="grid grid-cols-2 gap-2">
            {BAYS.map((bay) => (
              <div
                key={bay.num}
                className={`relative rounded-lg border-2 flex flex-col items-center justify-center gap-1 p-2 ${
                  bay.isTarget
                    ? 'border-emerald-400/60 bg-emerald-500/5'
                    : 'border-white/10 bg-white/[0.03]'
                }`}
                style={bay.isTarget ? { animation: 'bay-glow 6s ease-in-out infinite' } : undefined}
              >
                <span className="text-[10px] font-mono font-black text-white/60">{bay.label}</span>
                {/* Ocupação bar */}
                <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full ${bay.occupancy > 70 ? 'bg-amber-400' : 'bg-cyan-neon/60'}`}
                    style={{ width: `${bay.occupancy}%` }}
                  />
                </div>
                <span className="text-[7px] text-white/40 font-mono">{bay.occupancy}%</span>
                {/* Side markers */}
                <div className="absolute inset-x-1 bottom-1 flex justify-between text-[6px] text-white/20 font-mono uppercase tracking-widest">
                  <span>BB</span>
                  <span>BE</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cursor + drag preview seguindo path */}
        <div
          className="absolute pointer-events-none z-30"
          style={{ animation: 'drag-cursor-flow 6s ease-in-out infinite' }}
        >
          <div className="relative flex items-center gap-1.5">
            <div className="px-2 py-1 rounded-md border border-cyan-neon/60 bg-[#0f172a]/95 shadow-[0_4px_12px_rgba(0,0,0,0.6)] flex items-center gap-1">
              <span className="text-[7px] font-mono font-black text-cyan-neon">CONT-001</span>
              <span className="text-[7px] font-mono text-white/60">24t</span>
            </div>
            <MousePointer2 size={14} className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
          </div>
        </div>
      </div>
    </MockBrowserFrame>
  );
}
