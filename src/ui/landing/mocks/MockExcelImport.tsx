import { Search, Plus, Table2, Sparkles, Boxes } from 'lucide-react';
import { MockBrowserFrame } from '../MockBrowserFrame';
import { AnimatedCursor } from '../AnimatedCursor';

const SAMPLE_CARGOES = [
  { id: 'CONT-2024-001', desc: 'Container 20" Standard', cat: 'CONTAINER', weight: '24.0 t', color: 'text-blue-300', bg: 'bg-blue-500/10', border: 'border-blue-400/30' },
  { id: 'BSK-7812',     desc: 'Cesta de Equipamentos',   cat: 'BASKET',    weight: '12.5 t', color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-400/30' },
  { id: 'TUB-44A',      desc: 'Tubulares 12m',           cat: 'TUBULAR',   weight: '8.4 t',  color: 'text-violet-300', bg: 'bg-violet-500/10', border: 'border-violet-400/30' },
  { id: 'EQ-MTR-09',    desc: 'Motor Hidráulico 220V',   cat: 'EQUIPMENT', weight: '6.2 t',  color: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-400/30' },
  { id: 'HZ-CHM-003',   desc: 'Químico - Categoria 8',   cat: 'HAZARDOUS', weight: '3.8 t',  color: 'text-fuchsia-300', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-400/30' },
];

export function MockExcelImport() {
  return (
    <MockBrowserFrame title="Geração Modal" aspect="aspect-[16/10]">
      <div className="absolute inset-0 p-4 flex flex-col gap-3 text-white/90">
        {/* Toolbar superior */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-action/20 border border-action/30 flex items-center justify-center">
            <Boxes size={14} className="text-cyan-neon" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Inventário</span>

          <div className="ml-auto flex items-center gap-1.5">
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10">
              <Search size={10} className="text-white/40" />
              <span className="text-[8px] text-white/40 font-mono">Buscar…</span>
            </div>
            {/* Botão Excel destacado — target do cursor */}
            <div
              className="relative flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-500/15 border border-emerald-400/40 ring-2 ring-emerald-400/0"
              style={{ animation: 'excel-btn-pulse 8s ease-in-out infinite' }}
            >
              <Table2 size={10} className="text-emerald-300" />
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-200">Excel</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-action text-white">
              <Plus size={10} />
              <span className="text-[9px] font-black uppercase tracking-widest">Manual</span>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-action/15 border border-action/30 text-cyan-neon">Todas · 12</span>
          <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-white/50">Contentores · 4</span>
          <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-white/50">Cestas · 3</span>
          <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-white/50 hidden sm:inline-block">Tubulares · 2</span>
        </div>

        {/* Grid de cargas — aparecem em sequência */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2 content-start overflow-hidden">
          {SAMPLE_CARGOES.map((c, i) => (
            <div
              key={c.id}
              className={`rounded-lg border ${c.border} ${c.bg} p-2 flex flex-col gap-1 opacity-0`}
              style={{
                animation: `card-row-in 0.6s ease-out forwards`,
                animationDelay: `${2.2 + i * 0.35}s`,
                animationIterationCount: 'infinite',
                animationDuration: '8s',
              }}
            >
              <div className="flex items-center justify-between gap-1">
                <span className={`text-[7px] font-mono font-black ${c.color} truncate`}>{c.id}</span>
                <span className={`text-[6px] font-black uppercase tracking-widest ${c.color} px-1 py-0.5 rounded ${c.bg} border ${c.border}`}>
                  {c.cat}
                </span>
              </div>
              <div className="h-6 rounded bg-white/5 border border-white/10" />
              <div className="flex items-center justify-between text-[7px]">
                <span className="text-white/60 font-medium truncate">{c.desc}</span>
                <span className="text-cyan-neon font-mono shrink-0">{c.weight}</span>
              </div>
            </div>
          ))}
          <div
            className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] flex items-center justify-center text-[8px] text-white/30 font-medium opacity-0"
            style={{
              animation: 'card-row-in 0.6s ease-out forwards',
              animationDelay: '4.4s',
              animationIterationCount: 'infinite',
              animationDuration: '8s',
            }}
          >
            +7 mais…
          </div>
        </div>

        {/* Banner IA aparece ao final */}
        <div
          className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-action/20 border border-action/40 opacity-0"
          style={{
            animation: 'banner-in 1s ease-out forwards',
            animationDelay: '5s',
            animationIterationCount: 'infinite',
            animationDuration: '8s',
          }}
        >
          <Sparkles size={10} className="text-cyan-neon shrink-0" />
          <span className="text-[9px] font-black uppercase tracking-widest text-white">
            12 cargas extraídas via IA · 84.2 t
          </span>
          <span className="ml-auto text-[8px] text-emerald-300 font-mono">✓ 100%</span>
        </div>

        {/* Cursor animado */}
        <AnimatedCursor animation="cursor-excel-flow" duration={8} className="top-0 left-0" />
      </div>
    </MockBrowserFrame>
  );
}
