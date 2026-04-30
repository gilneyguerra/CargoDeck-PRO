import { Layers, Search, Flame, AlertOctagon, Boxes } from 'lucide-react';
import { MockBrowserFrame } from '../MockBrowserFrame';

const CARGOES = [
  { id: 'CONT-001', cat: 'CONTAINER', desc: 'Container 20"',  w: '24.0', dim: '6.1×2.4', color: 'blue',     hazardous: false },
  { id: 'BSK-002',  cat: 'BASKET',    desc: 'Cesta Equip.',   w: '12.5', dim: '3.2×2.1', color: 'emerald',  hazardous: false },
  { id: 'HZ-003',   cat: 'HAZARDOUS', desc: 'Químico Cat. 8', w: '3.8',  dim: '1.8×1.2', color: 'fuchsia',  hazardous: true  },
  { id: 'TUB-004',  cat: 'TUBULAR',   desc: 'Tubulares 12m',  w: '8.4',  dim: '12×0.6',  color: 'violet',   hazardous: false },
  { id: 'EQ-005',   cat: 'EQUIPMENT', desc: 'Motor 220V',     w: '6.2',  dim: '2.0×1.5', color: 'amber',    hazardous: false },
  { id: 'CONT-006', cat: 'CONTAINER', desc: 'Container 40"',  w: '28.5', dim: '12.2×2.4', color: 'blue',    hazardous: false },
];

const COLORS: Record<string, { text: string; bg: string; border: string }> = {
  blue:    { text: 'text-blue-300',     bg: 'bg-blue-500/10',     border: 'border-blue-400/30' },
  emerald: { text: 'text-emerald-300',  bg: 'bg-emerald-500/10',  border: 'border-emerald-400/30' },
  fuchsia: { text: 'text-fuchsia-300',  bg: 'bg-fuchsia-500/10',  border: 'border-fuchsia-400/30' },
  violet:  { text: 'text-violet-300',   bg: 'bg-violet-500/10',   border: 'border-violet-400/30' },
  amber:   { text: 'text-amber-300',    bg: 'bg-amber-500/10',    border: 'border-amber-400/30' },
};

export function MockCargoGrid() {
  return (
    <MockBrowserFrame title="Grid de Cargas" aspect="aspect-[16/10]">
      <div className="absolute inset-0 p-4 flex flex-col gap-3 text-white/90">
        {/* Header */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-action/20 border border-action/30 flex items-center justify-center">
            <Layers size={14} className="text-cyan-neon" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Filtros Dinâmicos</span>
          <div className="ml-auto flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10">
            <Search size={10} className="text-white/40" />
            <span className="text-[8px] text-white/40 font-mono">container…</span>
          </div>
        </div>

        {/* Filter tabs (Todas ativo) */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {[
            { label: 'Todas',       count: '12', isActive: true },
            { label: 'Contentores', count: '4' },
            { label: 'Cestas',      count: '3' },
            { label: 'Perigosas',   count: '1', hazardous: true },
            { label: 'Tubulares',   count: '2' },
          ].map((t) => (
            <span
              key={t.label}
              className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${
                t.isActive
                  ? 'border-action/40 bg-action/15 text-cyan-neon'
                  : t.hazardous
                  ? 'border-fuchsia-400/30 bg-fuchsia-500/5 text-fuchsia-300'
                  : 'border-white/10 bg-white/5 text-white/50'
              }`}
            >
              {t.label} · {t.count}
            </span>
          ))}
        </div>

        {/* Grid de cards */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2 content-start">
          {CARGOES.map((c) => {
            const colors = COLORS[c.color];
            return (
              <div
                key={c.id}
                className={`relative rounded-lg border-2 ${colors.border} ${colors.bg} p-2 flex flex-col gap-1`}
                style={c.hazardous ? { animation: 'pulse-hazard 2.4s ease-in-out infinite' } : undefined}
              >
                {c.hazardous && (
                  <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/40 flex items-center gap-1">
                    <AlertOctagon size={7} /> Perigosa
                  </div>
                )}
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-[7px] font-mono font-black ${colors.text} truncate`}>{c.id}</span>
                  <span className={`text-[6px] font-black uppercase ${colors.text}`}>{c.cat}</span>
                </div>
                <div className={`h-7 rounded ${c.hazardous ? 'bg-fuchsia-500/5' : 'bg-white/5'} border border-white/5`} />
                <div className="flex items-center justify-between text-[7px]">
                  <span className="text-white/60 font-medium truncate">{c.desc}</span>
                  <span className={`${colors.text} font-mono shrink-0`}>{c.w}t</span>
                </div>
                <span className="text-[6px] text-white/40 font-mono">{c.dim} m</span>
              </div>
            );
          })}
        </div>

        {/* Footer counter */}
        <div className="shrink-0 flex items-center justify-between text-[8px] text-white/40 font-mono">
          <span className="flex items-center gap-1.5">
            <Boxes size={9} />
            6 de 12 visíveis
          </span>
          <span className="flex items-center gap-1.5 text-fuchsia-300">
            <Flame size={9} />
            1 perigosa identificada
          </span>
        </div>
      </div>
    </MockBrowserFrame>
  );
}
