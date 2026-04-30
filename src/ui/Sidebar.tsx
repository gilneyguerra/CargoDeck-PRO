import {
  LayoutGrid, Package, Anchor, Box, Flame, Truck, Layers, Flag, ArrowRight
} from 'lucide-react';
import { useCargoStore } from '@/features/cargoStore';
import { useMemo } from 'react';

export default function Sidebar() {
  const {
    unallocatedCargoes, setViewMode, locations
  } = useCargoStore();

  // ─── Resumo Estatístico ────────────────────────────────────────────────────

  const stats = useMemo(() => {
    // Cargas a bordo (alocadas) — fonte exclusiva para o breakdown por categoria
    const allocatedCargoes = locations.flatMap(loc => loc.bays.flatMap(b => b.allocatedCargoes));

    const total = unallocatedCargoes.length;
    const totalWeight = unallocatedCargoes.reduce((s, c) => s + (c.weightTonnes || 0), 0);

    // Breakdown por categoria considera APENAS cargas alocadas (a bordo)
    const byCategory = allocatedCargoes.reduce((acc, c) => {
      const key = c.category || 'GENERAL';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const containers = allocatedCargoes.filter(c => c.category === 'CONTAINER').length;
    const loose = allocatedCargoes.length - containers;
    const urgent = allocatedCargoes.filter(c => c.priority === 'urgent').length;
    const high = allocatedCargoes.filter(c => c.priority === 'high').length;
    const hazardous = allocatedCargoes.filter(c => c.isHazardous || c.category === 'HAZARDOUS').length;

    const allocated = allocatedCargoes.length;

    return { total, totalWeight, byCategory, containers, loose, urgent, high, hazardous, allocated };
  }, [unallocatedCargoes, locations]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <aside className="w-[360px] border-r-[3px] border-brand-primary bg-sidebar flex flex-col shrink-0 h-full shadow-high z-20 font-sans">
      {/* Botão de navegação principal — destaque visual proeminente */}
      <div className="p-3 border-b border-subtle bg-header/20">
        <button
          onClick={() => setViewMode('modal-generation')}
          title="Abrir Módulo de Geração Modal de Transporte"
          className="nav-cta relative w-full px-4 py-4 flex items-center justify-center gap-3 bg-gradient-to-br from-brand-primary to-indigo-600 text-white rounded-2xl transition-all duration-300 group cursor-pointer min-h-[48px] shadow-lg shadow-brand-primary/30 hover:shadow-xl hover:shadow-brand-primary/50 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] overflow-hidden"
        >
          {/* Anel pulsante de fundo */}
          <span className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-brand-primary/40 animate-ping opacity-30" />
          {/* Brilho que atravessa no hover */}
          <span className="pointer-events-none absolute inset-y-0 -left-full w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 group-hover:left-full transition-all duration-700" />

          <span className="relative flex items-center justify-center w-7 h-7 rounded-xl bg-white/15 group-hover:bg-white/25 group-hover:rotate-3 transition-all">
            <LayoutGrid className="w-4 h-4" />
          </span>
          <span className="relative text-[11px] font-black uppercase tracking-[0.18em]">GERAÇÃO MODAL</span>
          <ArrowRight className="relative w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </button>
        <p className="text-[9px] font-bold text-secondary uppercase tracking-[0.2em] text-center opacity-60 mt-2">
          módulo de transporte ↗
        </p>
      </div>

      {/* Resumo Estatístico */}
      <div className="p-5 border-b border-subtle flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
            <Package size={16} className="text-brand-primary" />
          </div>
          <div>
            <h3 className="text-[11px] font-black text-primary uppercase tracking-widest leading-none">Resumo de Carga</h3>
            <p className="text-[9px] font-bold text-secondary opacity-70 mt-0.5">Inventário ativo</p>
          </div>
        </div>

        {/* Cards de números principais */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-main border border-subtle rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-[9px] font-black text-muted uppercase tracking-widest mb-1.5">
              <Box size={10} /> Não Alocadas
            </div>
            <p className="text-xl font-mono font-black text-brand-primary leading-none">{stats.total}</p>
            <p className="text-[10px] font-mono font-black text-secondary mt-1">{stats.totalWeight.toFixed(1)} t</p>
          </div>
          <div className="bg-main border border-subtle rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-[9px] font-black text-muted uppercase tracking-widest mb-1.5">
              <Anchor size={10} /> Alocadas
            </div>
            <p className="text-xl font-mono font-black text-status-success leading-none">{stats.allocated}</p>
            <p className="text-[10px] font-mono font-black text-secondary mt-1">a bordo</p>
          </div>
        </div>

        {/* Breakdown soltas/contentores — refletindo carga A BORDO */}
        {stats.allocated > 0 && (
          <div className="bg-main border border-subtle rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1.5">
                <Layers size={10} className="text-muted" />
                <span className="font-black text-secondary uppercase tracking-widest">Soltas (a bordo)</span>
              </div>
              <span className="font-mono font-black text-primary">{stats.loose}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1.5">
                <Package size={10} className="text-muted" />
                <span className="font-black text-secondary uppercase tracking-widest">Contentores (a bordo)</span>
              </div>
              <span className="font-mono font-black text-primary">{stats.containers}</span>
            </div>
          </div>
        )}

        {/* Prioridade / Hazardous a bordo */}
        {(stats.urgent > 0 || stats.high > 0 || stats.hazardous > 0) && (
          <div className="bg-status-warning/5 border border-status-warning/30 rounded-xl p-3 space-y-2">
            {stats.hazardous > 0 && (
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <Flame size={10} className="text-purple-500" />
                  <span className="font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">Perigosas (a bordo)</span>
                </div>
                <span className="font-mono font-black text-purple-600 dark:text-purple-400">{stats.hazardous}</span>
              </div>
            )}
            {stats.urgent > 0 && (
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <Flame size={10} className="text-status-error" />
                  <span className="font-black text-status-error uppercase tracking-widest">Urgentes</span>
                </div>
                <span className="font-mono font-black text-status-error">{stats.urgent}</span>
              </div>
            )}
            {stats.high > 0 && (
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <Flag size={10} className="text-status-warning" />
                  <span className="font-black text-status-warning uppercase tracking-widest">Alta Prioridade</span>
                </div>
                <span className="font-mono font-black text-status-warning">{stats.high}</span>
              </div>
            )}
          </div>
        )}

        {/* Filtros dinâmicos de categorias — apenas cargas alocadas a bordo */}
        {Object.keys(stats.byCategory).length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[9px] font-black text-muted uppercase tracking-widest">
              Categorias a bordo · {Object.keys(stats.byCategory).length} tipo(s)
            </p>
            {Object.entries(stats.byCategory)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between text-[10px] bg-main/40 rounded-lg px-2 py-1.5 border border-subtle/50">
                  <span className="font-black text-secondary uppercase tracking-widest truncate">{cat}</span>
                  <span className="font-mono font-black text-primary">{count}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Mensagem informativa */}
      <div className="flex-1 p-5 flex flex-col items-center justify-center text-center overflow-y-auto no-scrollbar">
        <div className="w-14 h-14 rounded-full bg-main border-2 border-subtle flex items-center justify-center mb-3 opacity-50">
          <Truck size={20} className="text-secondary" />
        </div>
        <p className="text-[10px] text-muted leading-relaxed max-w-[240px]">
          Importação de manifestos (PDF/IA/Excel), gerenciamento e movimentação em lote ficam na página dedicada de
          <span className="text-brand-primary font-black"> Geração Modal de Transporte</span>.
        </p>
      </div>

    </aside>
  );
}
