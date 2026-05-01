import { useEffect, useMemo, useState } from 'react';
import {
  Package, Plus, Search, CheckSquare, Square, Edit, Trash2,
  X, FolderOpen, FileDown, Inbox,
} from 'lucide-react';
import { useContainerStore } from '@/features/containerStore';
import { useNotificationStore } from '@/features/notificationStore';
import type { Container } from '@/domain/Container';
import { CONTAINER_TYPE_LABELS } from '@/domain/Container';
import { cn } from '@/lib/utils';

interface Props {
  /** Quando o usuário clica num card, abre o modal de inventário desse container. */
  onOpenInventory: (container: Container) => void;
  /** Acionado pelo botão "Novo Container". */
  onCreate: () => void;
  /** Acionado pelo botão de editar metadados num card. */
  onEdit: (container: Container) => void;
  /** Acionado quando o usuário pede para gerar PDF dos selecionados. */
  onExportSelected: (containers: Container[]) => void;
}

const TYPE_ACCENT: Record<Container['type'], { bg: string; text: string; border: string }> = {
  container: { bg: 'bg-blue-500/10',    text: 'text-blue-500',    border: 'border-blue-400/30' },
  cesta:     { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-400/30' },
  skid:      { bg: 'bg-violet-500/10',  text: 'text-violet-500',  border: 'border-violet-400/30' },
  caixa:     { bg: 'bg-amber-500/10',   text: 'text-amber-500',   border: 'border-amber-400/30' },
  outro:     { bg: 'bg-slate-500/10',   text: 'text-slate-500',   border: 'border-slate-400/30' },
};

/**
 * Lista de containers do usuário com seleção múltipla, busca, e ações de
 * criar/editar/excluir/abrir inventário/exportar PDF em lote.
 */
export function ContainerGrid({ onOpenInventory, onCreate, onEdit, onExportSelected }: Props) {
  const {
    containers, items, selectedContainerIds, loading, loaded,
    fetchAll, deleteContainer, toggleSelection, clearSelection, selectAll,
  } = useContainerStore();
  const { notify, ask } = useNotificationStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!loaded && !loading) fetchAll();
  }, [loaded, loading, fetchAll]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return containers;
    return containers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      CONTAINER_TYPE_LABELS[c.type].toLowerCase().includes(q)
    );
  }, [containers, search]);

  const itemCountByContainer = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) map.set(it.containerId, (map.get(it.containerId) ?? 0) + 1);
    return map;
  }, [items]);

  const totalValueByContainer = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) map.set(it.containerId, (map.get(it.containerId) ?? 0) + it.vlTotal);
    return map;
  }, [items]);

  const allSelected = filtered.length > 0 && filtered.every(c => selectedContainerIds.has(c.id));
  const selectionCount = selectedContainerIds.size;

  const handleDelete = async (c: Container) => {
    const ok = await ask(
      'Excluir container',
      `Excluir "${c.name}"? Todos os itens dentro dele também serão removidos. Esta ação não pode ser desfeita.`
    );
    if (!ok) return;
    await deleteContainer(c.id);
    notify(`Container "${c.name}" excluído.`, 'success');
  };

  const handleExport = () => {
    const list = containers.filter(c => selectedContainerIds.has(c.id));
    if (list.length === 0) {
      notify('Selecione ao menos 1 container para exportar.', 'warning');
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
              {containers.length} {containers.length === 1 ? 'unidade' : 'unidades'} · {items.length} {items.length === 1 ? 'item' : 'itens'} totais
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
              placeholder="Buscar por nome ou tipo…"
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

          <button
            onClick={onCreate}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-brand-primary text-white hover:brightness-110 transition-all min-h-[40px] shadow-md"
          >
            <Plus size={12} /> Novo Container
          </button>

          {selectionCount > 0 && (
            <div className="flex items-center gap-2 pl-2 ml-1 border-l-2 border-brand-primary/30 bg-main/40 rounded-r-xl py-1 pr-1 animate-in slide-in-from-right-2 fade-in duration-200">
              <button
                onClick={() => allSelected ? clearSelection() : selectAll()}
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
            <span className="text-[11px] font-mono text-muted">Carregando containers…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-sidebar border-2 border-subtle flex items-center justify-center mb-4">
              <Inbox size={32} className="text-muted opacity-50" />
            </div>
            {containers.length === 0 ? (
              <>
                <h3 className="text-base font-black text-primary uppercase tracking-widest mb-2">Nenhum container ainda</h3>
                <p className="text-[11px] text-secondary leading-relaxed mb-6">
                  Crie sua primeira unidade de transporte para começar a alocar cargas DANFE.
                </p>
                <button
                  onClick={onCreate}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-brand-primary text-white hover:brightness-110 transition-all shadow-md"
                >
                  <Plus size={14} /> Criar Primeiro Container
                </button>
              </>
            ) : (
              <>
                <h3 className="text-base font-black text-primary uppercase tracking-widest mb-2">Nenhum resultado</h3>
                <p className="text-[11px] text-secondary leading-relaxed">
                  Ajuste a busca para encontrar o container desejado.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(c => {
              const accent = TYPE_ACCENT[c.type];
              const itemCount = itemCountByContainer.get(c.id) ?? 0;
              const totalValue = totalValueByContainer.get(c.id) ?? 0;
              const selected = selectedContainerIds.has(c.id);
              return (
                <div
                  key={c.id}
                  onClick={() => toggleSelection(c.id)}
                  className={cn(
                    'group relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-3 hover:shadow-md active:scale-[0.99]',
                    selected ? 'border-brand-primary bg-brand-primary/5 shadow-md' : 'border-subtle bg-sidebar/40 hover:border-strong'
                  )}
                >
                  {/* Checkbox + ícone */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {selected ? (
                        <CheckSquare size={18} className="text-brand-primary shrink-0" />
                      ) : (
                        <Square size={18} className="text-muted/50 shrink-0" />
                      )}
                      <span className={cn(
                        'text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border',
                        accent.bg, accent.text, accent.border
                      )}>
                        {CONTAINER_TYPE_LABELS[c.type]}
                      </span>
                    </div>
                    <span className={cn(
                      'text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md',
                      c.status === 'Ativo' ? 'bg-status-success/10 text-status-success' : 'bg-muted/10 text-muted'
                    )}>
                      {c.status}
                    </span>
                  </div>

                  {/* Nome */}
                  <h4 className="text-sm font-black text-primary leading-tight line-clamp-2 min-h-[36px]" title={c.name}>
                    {c.name}
                  </h4>

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

                  {/* Ações: visível em mobile, hover/focus no desktop */}
                  <div className="flex items-center justify-between gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity -mt-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenInventory(c); }}
                      className="flex-1 min-h-[40px] p-1.5 rounded-md hover:bg-brand-primary/10 focus-visible:bg-brand-primary/10 text-muted hover:text-brand-primary focus-visible:text-brand-primary transition-all text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1 outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
                      aria-label={`Abrir inventário de ${c.name}`}
                    >
                      <FolderOpen size={11} /> Abrir
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(c); }}
                      className="min-h-[40px] p-1.5 rounded-md hover:bg-status-warning/10 focus-visible:bg-status-warning/10 text-muted hover:text-status-warning focus-visible:text-status-warning transition-all outline-none focus-visible:ring-2 focus-visible:ring-status-warning/40"
                      aria-label={`Editar ${c.name}`}
                    >
                      <Edit size={11} className="mx-auto" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(c); }}
                      className="min-h-[40px] p-1.5 rounded-md hover:bg-status-error/10 focus-visible:bg-status-error/10 text-muted hover:text-status-error focus-visible:text-status-error transition-all outline-none focus-visible:ring-2 focus-visible:ring-status-error/40"
                      aria-label={`Excluir ${c.name}`}
                    >
                      <Trash2 size={11} className="mx-auto" />
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
