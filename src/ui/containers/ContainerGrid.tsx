import { useEffect, useMemo, useState } from 'react';
import {
  Package, Search, CheckSquare, Square, X, FolderOpen, FileDown, Inbox,
} from 'lucide-react';
import { useCargoStore } from '@/features/cargoStore';
import { useContainerStore } from '@/features/containerStore';
import type { Cargo } from '@/domain/Cargo';
import { cn } from '@/lib/utils';

interface Props {
  /** Quando o usuário clica num card, abre o inventário DANFE da carga. */
  onOpenInventory: (cargo: Cargo) => void;
  /** Acionado quando o usuário pede para gerar PDF dos selecionados. */
  onExportSelected: (cargos: Cargo[]) => void;
}

/**
 * Lista de cargas do tipo CONTENTOR (cargoStore.category === 'CONTAINER').
 * Esta página é leitura + ponte para o inventário DANFE — não cria nem
 * exclui contentores. Toda criação/edição/exclusão de cargas-CONTENTOR
 * acontece na página de Geração Modal de Transporte.
 */
export function ContainerGrid({ onOpenInventory, onExportSelected }: Props) {
  const unallocated = useCargoStore(s => s.unallocatedCargoes);
  const locations = useCargoStore(s => s.locations);
  const { items, fetchAll, loaded, loading } = useContainerStore();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loaded && !loading) fetchAll();
  }, [loaded, loading, fetchAll]);

  // União de cargas do tipo CONTENTOR (não alocadas + alocadas em qualquer baia).
  const cargoContainers = useMemo<Cargo[]>(() => {
    const all: Cargo[] = [];
    for (const c of unallocated) {
      if (c.category === 'CONTAINER') all.push(c);
    }
    for (const loc of locations) {
      for (const bay of loc.bays) {
        for (const c of bay.allocatedCargoes) {
          if (c.category === 'CONTAINER') all.push(c);
        }
      }
    }
    return all;
  }, [unallocated, locations]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cargoContainers;
    return cargoContainers.filter(c =>
      (c.identifier ?? '').toLowerCase().includes(q) ||
      (c.description ?? '').toLowerCase().includes(q)
    );
  }, [cargoContainers, search]);

  const itemCountByCargo = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) map.set(it.containerId, (map.get(it.containerId) ?? 0) + 1);
    return map;
  }, [items]);

  const totalValueByCargo = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) map.set(it.containerId, (map.get(it.containerId) ?? 0) + it.vlTotal);
    return map;
  }, [items]);

  const allSelected = filtered.length > 0 && filtered.every(c => selectedIds.has(c.id));
  const selectionCount = selectedIds.size;

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());
  const selectAllVisible = () => setSelectedIds(new Set(filtered.map(c => c.id)));

  const totalItemsTotal = items.length;

  const handleExport = () => {
    const list = cargoContainers.filter(c => selectedIds.has(c.id));
    if (list.length === 0) {
      // Reusa o componente de notificação global no chamador (ModalGenerationPage)
      // através do callback. Aqui só validamos seleção mínima.
      onExportSelected(list);
      return;
    }
    const haveAnyItems = list.some(c => (itemCountByCargo.get(c.id) ?? 0) > 0);
    if (!haveAnyItems) {
      onExportSelected([]); // sinaliza ao chamador para emitir warning
      return;
    }
    onExportSelected(list);
  };

  return (
    <div className="flex-1 flex flex-col bg-main overflow-hidden">
      {/* Toolbar */}
      <div className="px-6 py-4 border-b-2 border-subtle bg-sidebar/50 shrink-0 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
            <Package size={20} className="text-brand-primary" />
          </div>
          <div>
            <h1 className="text-base font-montserrat font-black text-primary tracking-tighter uppercase leading-none">
              Contentores
            </h1>
            <p className="text-[10px] font-mono text-muted mt-1">
              {cargoContainers.length} {cargoContainers.length === 1 ? 'carga' : 'cargas'} CONTENTOR · {totalItemsTotal} {totalItemsTotal === 1 ? 'item DANFE' : 'itens DANFE'} totais
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
          <div className="relative w-[200px] sm:w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por ID ou descrição…"
              className="w-full bg-main border-2 border-subtle rounded-xl pl-9 pr-9 py-2.5 text-xs font-bold text-primary outline-none focus:border-brand-primary transition-all min-h-[40px]"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-sidebar text-muted hover:text-primary"
                aria-label="Limpar busca"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {selectionCount > 0 && (
            <div className="flex items-center gap-2 pl-2 ml-1 border-l-2 border-brand-primary/30 bg-main/40 rounded-r-xl py-1 pr-1 animate-in slide-in-from-right-2 fade-in duration-200">
              <button
                onClick={() => allSelected ? clearSelection() : selectAllVisible()}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-secondary hover:text-brand-primary hover:bg-sidebar transition-all min-h-[36px]"
              >
                {allSelected ? <CheckSquare size={12} /> : <Square size={12} />}
                {allSelected ? 'Desmarcar' : 'Tudo'}
              </button>
              <span className="text-[10px] font-mono font-black text-brand-primary px-2">{selectionCount}</span>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-status-success text-white hover:brightness-110 active:scale-95 transition-all shadow-md min-h-[36px]"
              >
                <FileDown size={12} /> Gerar PDF
              </button>
              <button
                onClick={clearSelection}
                className="p-2 rounded-lg text-muted hover:text-primary hover:bg-sidebar transition-all min-h-[36px]"
                aria-label="Limpar seleção"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading && !loaded ? (
          <div className="h-full flex items-center justify-center">
            <span className="text-[11px] font-mono text-muted">Carregando inventário DANFE…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-sidebar border-2 border-subtle flex items-center justify-center mb-4">
              <Inbox size={32} className="text-muted opacity-50" />
            </div>
            {cargoContainers.length === 0 ? (
              <>
                <h3 className="text-base font-black text-primary uppercase tracking-widest mb-2">Nenhum cargo CONTENTOR</h3>
                <p className="text-[11px] text-secondary leading-relaxed">
                  Volte para a página de Geração Modal de Transporte e crie cargas
                  do tipo <strong>CONTENTOR</strong> via Excel, Manual ou IA. Elas aparecerão
                  aqui automaticamente para receber inventário DANFE.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-base font-black text-primary uppercase tracking-widest mb-2">Nenhum resultado</h3>
                <p className="text-[11px] text-secondary leading-relaxed">
                  Ajuste a busca para encontrar o contentor desejado.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(c => {
              const itemCount = itemCountByCargo.get(c.id) ?? 0;
              const totalValue = totalValueByCargo.get(c.id) ?? 0;
              const selected = selectedIds.has(c.id);
              const filled = itemCount > 0;
              return (
                <div
                  key={c.id}
                  onClick={() => toggleSelection(c.id)}
                  className={cn(
                    'group relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-3 hover:shadow-md active:scale-[0.99]',
                    selected ? 'border-brand-primary bg-brand-primary/5 shadow-md' : 'border-subtle bg-sidebar/40 hover:border-strong'
                  )}
                >
                  {/* Topo: checkbox + tag de carga */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {selected ? (
                        <CheckSquare size={18} className="text-brand-primary shrink-0" />
                      ) : (
                        <Square size={18} className="text-muted/50 shrink-0" />
                      )}
                      <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border bg-blue-500/10 text-blue-500 border-blue-400/30">
                        Contentor
                      </span>
                    </div>
                    <span className={cn(
                      'text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md',
                      filled
                        ? 'bg-status-success/10 text-status-success'
                        : 'bg-status-warning/10 text-status-warning'
                    )}>
                      {filled ? 'Preenchido' : 'Vazio'}
                    </span>
                  </div>

                  {/* Identificador + descrição */}
                  <div className="flex flex-col gap-1">
                    <h4 className="text-sm font-black text-primary leading-tight line-clamp-1" title={c.identifier}>
                      {c.identifier || '— sem ID —'}
                    </h4>
                    <p className="text-[10px] font-mono text-secondary leading-tight line-clamp-2 min-h-[24px]" title={c.description}>
                      {c.description || '— sem descrição —'}
                    </p>
                  </div>

                  {/* Métricas */}
                  <div className="flex items-center justify-between text-[10px] font-mono pt-2 border-t border-subtle/40">
                    <span className="text-secondary">
                      <span className="text-brand-primary font-black">{itemCount}</span>
                      <span className="text-muted"> {itemCount === 1 ? 'item' : 'itens'}</span>
                    </span>
                    {totalValue > 0 && (
                      <span className="text-status-success font-black truncate max-w-[120px]" title={`R$ ${totalValue.toFixed(2)}`}>
                        R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>

                  {/* Ação principal: abrir inventário DANFE */}
                  <div className="flex items-center justify-stretch gap-1 -mt-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenInventory(c); }}
                      className="flex-1 min-h-[40px] p-1.5 rounded-md hover:bg-brand-primary/10 focus-visible:bg-brand-primary/10 text-muted hover:text-brand-primary focus-visible:text-brand-primary transition-all text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1 outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
                      aria-label={`Abrir inventário DANFE de ${c.identifier}`}
                    >
                      <FolderOpen size={11} /> Alocar / Desalocar Itens
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
