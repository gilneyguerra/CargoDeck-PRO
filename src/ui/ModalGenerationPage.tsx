import { useState, useMemo, useDeferredValue, useEffect } from 'react';
import {
  ArrowLeft, Search, Table2, Plus,
  ArrowRight, CheckSquare, Square, Trash2, Package, X,
  Boxes, Flame, Layers, Flag, Zap, Sparkles, LayoutGrid, Users
} from 'lucide-react';
import { useCargoStore } from '@/features/cargoStore';
import { useNotificationStore } from '@/features/notificationStore';
import { CargoEditorModal } from './CargoEditorModal';
import { ManualCargoModal } from './ManualCargoModal';
import { AllocateCargoModal } from './AllocateCargoModal';
import { PriorityModal } from './PriorityModal';
import { CargoAssistant } from './CargoAssistant';
import { GroupMoveModal } from './GroupMoveModal';
import type { Cargo, CargoCategory } from '@/domain/Cargo';
import { cn } from '@/lib/utils';

// ─── Filtros ──────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'loose' | 'containers' | 'priority';

const TAB_OPTIONS: { value: FilterTab; label: string; icon: typeof Boxes }[] = [
  { value: 'all',        label: 'Todas',                icon: Layers },
  { value: 'loose',      label: 'Cargas Soltas',        icon: Boxes },
  { value: 'containers', label: 'Contentores / Módulos', icon: Package },
  { value: 'priority',   label: 'Prioridade Máxima',     icon: Flame },
];

const CONTAINER_CATEGORIES: CargoCategory[] = ['CONTAINER'];

const FILTER_STORAGE_KEY = 'cargodeck-modal-generation-filter';

// ─── CargoGridCard ─────────────────────────────────────────────────────────────

interface CargoGridCardProps {
  cargo: Cargo;
  selected: boolean;
  onToggle: (id: string) => void;
  onEdit: (cargo: Cargo) => void;
  onDelete: (cargo: Cargo) => void;
}

function CargoGridCard({ cargo, selected, onToggle, onEdit, onDelete }: CargoGridCardProps) {
  const ratio = (cargo.lengthMeters || 1) / (cargo.widthMeters || 1);
  const baseSize = 80;
  const visualWidth = ratio >= 1 ? baseSize : Math.max(20, baseSize * ratio);
  const visualHeight = ratio >= 1 ? Math.max(20, baseSize / ratio) : baseSize;
  const isUrgent = cargo.priority === 'urgent';
  const isHigh = cargo.priority === 'high';

  return (
    <div
      onClick={() => onToggle(cargo.id)}
      className={cn(
        'group relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-3 hover:shadow-md active:scale-[0.98]',
        selected
          ? 'border-brand-primary bg-brand-primary/5 shadow-md'
          : isUrgent
          ? 'animate-pulse'
          : 'border-subtle bg-sidebar/40 hover:border-strong'
      )}
      style={isUrgent && !selected ? { borderColor: '#B71C1C', backgroundColor: '#B71C1C10', boxShadow: '0 0 0 1px #B71C1C40, 0 0 12px #B71C1C30' } : undefined}
    >
      {/* Badge de prioridade */}
      {isUrgent && (
        <div className="absolute -top-2 -right-2 bg-[#B71C1C] text-white px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1">
          <Zap size={9} /> Urgente
        </div>
      )}
      {isHigh && (
        <div className="absolute -top-2 -right-2 bg-status-warning text-white px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest shadow-md flex items-center gap-1">
          <Flag size={9} /> Alta
        </div>
      )}

      {/* Header: checkbox + identifier */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {selected ? (
            <CheckSquare size={18} className="text-brand-primary shrink-0" />
          ) : (
            <Square size={18} className="text-muted/50 shrink-0" />
          )}
          <span className="text-[10px] font-mono font-black text-secondary truncate max-w-[100px]" title={cargo.identifier}>
            {cargo.identifier}
          </span>
        </div>
        <span
          className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md shrink-0"
          style={{ backgroundColor: `${cargo.color || '#3b82f6'}20`, color: cargo.color || '#3b82f6' }}
        >
          {cargo.category}
        </span>
      </div>

      {/* Visual proporcional */}
      <div className="flex items-center justify-center bg-main rounded-xl border border-subtle/40 h-[120px] relative overflow-hidden">
        <div
          className="border-2 rounded shadow-md flex items-center justify-center transition-all"
          style={{
            width: `${visualWidth}px`,
            height: `${visualHeight}px`,
            backgroundColor: `${cargo.color || '#3b82f6'}40`,
            borderColor: cargo.color || '#3b82f6',
          }}
        >
          <span className="text-[8px] font-mono font-black text-primary px-1 truncate">
            {cargo.lengthMeters?.toFixed(1)}×{cargo.widthMeters?.toFixed(1)}m
          </span>
        </div>
      </div>

      {/* Descrição */}
      <h4 className="text-[11px] font-black text-primary leading-tight line-clamp-2 min-h-[28px]" title={cargo.description}>
        {cargo.description}
      </h4>

      {/* Métricas */}
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest pt-2 border-t border-subtle/40">
        <span className="text-secondary">
          <span className="font-mono text-brand-primary">{cargo.weightTonnes.toFixed(2)}</span>
          <span className="text-muted"> t</span>
        </span>
        {cargo.destinoCarga && (
          <span className="text-status-success/80 font-mono truncate max-w-[80px]" title={cargo.destinoCarga}>
            → {cargo.destinoCarga}
          </span>
        )}
      </div>

      {/* Ações (hover) */}
      <div className="flex items-center justify-between gap-1 opacity-0 group-hover:opacity-100 transition-opacity -mt-1">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(cargo); }}
          className="flex-1 p-1.5 rounded-md hover:bg-brand-primary/10 text-muted hover:text-brand-primary transition-all text-[9px] font-black uppercase tracking-widest"
          title="Editar"
        >
          Editar
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(cargo); }}
          className="flex-1 p-1.5 rounded-md hover:bg-status-error/10 text-muted hover:text-status-error transition-all"
          title="Excluir"
        >
          <Trash2 size={12} className="mx-auto" />
        </button>
      </div>
    </div>
  );
}

// ─── Página Principal ──────────────────────────────────────────────────────────

export function ModalGenerationPage() {
  const {
    unallocatedCargoes, selectedCargos,
    toggleCargoSelection, selectMultipleCargos, clearCargoSelection,
    setViewMode, setEditingCargo, deleteCargo, deleteMultipleCargoes,
    clearUnallocatedCargoes
  } = useCargoStore();
  const { notify, ask } = useNotificationStore();

  // Modais
  const [showEditor, setShowEditor] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showAllocate, setShowAllocate] = useState(false);
  const [showPriority, setShowPriority] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showGroupMove, setShowGroupMove] = useState(false);

  // Filtro persistido
  const [filterTab, setFilterTab] = useState<FilterTab>(() => {
    try {
      const v = localStorage.getItem(FILTER_STORAGE_KEY);
      if (v === 'all' || v === 'loose' || v === 'containers' || v === 'priority') return v;
    } catch { /* noop */ }
    return 'all';
  });

  useEffect(() => {
    try { localStorage.setItem(FILTER_STORAGE_KEY, filterTab); } catch { /* noop */ }
  }, [filterTab]);

  // Busca com debounce via useDeferredValue
  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);

  // Filtragem completa
  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return unallocatedCargoes.filter(c => {
      // Tab filter
      if (filterTab === 'loose' && CONTAINER_CATEGORIES.includes(c.category)) return false;
      if (filterTab === 'containers' && !CONTAINER_CATEGORIES.includes(c.category)) return false;
      if (filterTab === 'priority' && c.priority !== 'urgent') return false;

      // Busca: ID, descrição, manifesto (numeroAtendimento ou observations)
      if (!q) return true;
      const haystack = [
        c.identifier, c.description, c.category,
        c.destinoCarga, c.origemCarga,
        c.numeroAtendimento, c.observations,
        c.nomeEmbarcacao,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [unallocatedCargoes, deferredSearch, filterTab]);

  // Métricas
  const selectedIds = useMemo(() => Array.from(selectedCargos), [selectedCargos]);
  const selectedCount = selectedIds.length;
  const selectedWeight = useMemo(
    () => unallocatedCargoes.filter(c => selectedCargos.has(c.id)).reduce((s, c) => s + (c.weightTonnes || 0), 0),
    [unallocatedCargoes, selectedCargos]
  );

  const allFilteredSelected = filtered.length > 0 && filtered.every(c => selectedCargos.has(c.id));

  // Contadores por tab
  const tabCounts = useMemo(() => ({
    all: unallocatedCargoes.length,
    loose: unallocatedCargoes.filter(c => !CONTAINER_CATEGORIES.includes(c.category)).length,
    containers: unallocatedCargoes.filter(c => CONTAINER_CATEGORIES.includes(c.category)).length,
    priority: unallocatedCargoes.filter(c => c.priority === 'urgent').length,
  }), [unallocatedCargoes]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleBack = () => {
    clearCargoSelection();
    setViewMode('deck');
  };

  const handleSelectAll = () => {
    if (allFilteredSelected) clearCargoSelection();
    else selectMultipleCargos(filtered.map(c => c.id));
  };

  const handleEdit = (cargo: Cargo) => setEditingCargo(cargo);

  const handleDelete = async (cargo: Cargo) => {
    const ok = await ask('Excluir Carga', `Excluir "${cargo.identifier}" definitivamente?`);
    if (ok) {
      await deleteCargo(cargo.id);
      notify('Carga excluída.', 'success');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedCount === 0) return;
    const ok = await ask(
      'Excluir Cargas Selecionadas',
      `Excluir permanentemente ${selectedCount} carga(s)? Esta ação não pode ser desfeita.`
    );
    if (!ok) return;
    await deleteMultipleCargoes(selectedIds);
    notify(`${selectedCount} carga(s) excluída(s).`, 'success');
    clearCargoSelection();
  };

  const handleClearProcessed = async () => {
    const ok = await ask(
      'Limpar Cargas Processadas',
      `Remover todas as ${unallocatedCargoes.length} carga(s) do grid? As cargas alocadas em conveses não serão afetadas.`
    );
    if (!ok) return;
    await clearUnallocatedCargoes();
    notify('Grid limpo.', 'success');
    clearCargoSelection();
  };

  const handleAllocate = () => {
    if (selectedCount === 0) {
      notify('Selecione pelo menos uma carga.', 'warning');
      return;
    }
    setShowAllocate(true);
  };

  const handleGroupContainer = () => {
    if (selectedCount < 2) {
      notify('Selecione pelo menos 2 cargas para agrupar em um contentor.', 'warning');
      return;
    }
    notify('Agrupamento em contentor — funcionalidade em planejamento.', 'info');
  };

  const handleChangePriority = () => {
    if (selectedCount === 0) {
      notify('Selecione ao menos uma carga.', 'warning');
      return;
    }
    setShowPriority(true);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col bg-main overflow-hidden relative">
      {/* Toolbar Header */}
      <div className="px-6 py-4 border-b-2 border-subtle bg-sidebar/50 shrink-0 flex items-center gap-3 flex-wrap">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black text-secondary hover:text-primary hover:bg-main border-2 border-transparent hover:border-subtle uppercase tracking-widest transition-all min-h-[40px]"
        >
          <ArrowLeft size={14} />
          Deck
        </button>

        <div className="h-8 w-px bg-subtle" />

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
            <Boxes size={20} className="text-brand-primary" />
          </div>
          <div>
            <h1 className="text-base font-montserrat font-black text-primary tracking-tighter uppercase leading-none">Geração Modal de Transporte</h1>
            <p className="text-[9px] font-black text-secondary uppercase tracking-[0.3em] opacity-80 mt-1">
              {filtered.length} de {unallocatedCargoes.length} carga(s) · /geracao-modal
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
          {/* Busca */}
          <div className="relative w-[200px] sm:w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar ID, descrição, manifesto…"
              className="w-full bg-main border-2 border-subtle rounded-xl pl-9 pr-9 py-2.5 text-xs font-bold text-primary outline-none focus:border-brand-primary transition-all min-h-[40px]"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-sidebar text-muted hover:text-primary"
                title="Limpar busca"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Botões padrão de import / criação */}
          <button
            onClick={() => setShowEditor(true)}
            title="Editor em Grade (Excel/CSV)"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-main border-2 border-subtle hover:border-brand-primary/40 text-secondary hover:text-brand-primary transition-all min-h-[40px]"
          >
            <Table2 size={12} /> Excel
          </button>
          <button
            onClick={() => setShowManual(true)}
            title="Nova carga manual"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-brand-primary text-white hover:brightness-110 transition-all min-h-[40px] shadow-md"
          >
            <Plus size={12} /> Manual
          </button>

          {/* Toggle do Assistente IA */}
          <button
            onClick={() => setShowAssistant(s => !s)}
            title="Assistente de Carga (IA)"
            className={cn(
              'relative flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all min-h-[40px]',
              showAssistant
                ? 'bg-brand-primary text-white border-brand-primary shadow-md'
                : 'bg-main border-subtle hover:border-brand-primary/40 text-secondary hover:text-brand-primary'
            )}
          >
            <Sparkles size={12} className={showAssistant ? '' : 'group-hover:rotate-12'} />
            IA
            <span className={cn(
              'absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-main',
              showAssistant ? 'bg-status-warning' : 'bg-status-success'
            )} />
          </button>

          {/* Gerenciar (vindo da sidebar) — re-aciona view atual; útil como atalho de scroll-to-top */}
          <button
            onClick={() => setViewMode('modal-generation')}
            title="Gerenciar Cargas"
            disabled={unallocatedCargoes.length === 0}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-brand-primary/10 border-2 border-brand-primary/30 text-brand-primary hover:bg-brand-primary/15 transition-all min-h-[40px] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <LayoutGrid size={12} />
            Gerenciar
          </button>

          {/* Mover em Grupo (vindo da sidebar) */}
          <button
            onClick={() => setShowGroupMove(true)}
            title="Movimentar Cargas em Grupo (Alocadas + Não Alocadas)"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white bg-[#1A237E] hover:brightness-110 shadow-md transition-all min-h-[40px]"
          >
            <Users size={12} />
            Grupo
          </button>

          {/* Action Bar inline — aparece quando há seleção */}
          {selectedCount > 0 && (
            <div className="flex items-center gap-2 pl-2 ml-1 border-l-2 border-brand-primary/30 bg-main/40 rounded-r-xl py-1 pr-1 animate-in slide-in-from-right-2 fade-in duration-200">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-secondary hover:text-brand-primary hover:bg-sidebar transition-all min-h-[36px]"
                title={allFilteredSelected ? 'Desmarcar tudo' : 'Selecionar tudo'}
              >
                {allFilteredSelected ? <CheckSquare size={12} /> : <Square size={12} />}
                {allFilteredSelected ? 'Desmarcar' : 'Tudo'}
              </button>

              <div className="flex items-center gap-2 px-2 text-[10px] font-black uppercase tracking-widest">
                <span className="text-brand-primary font-mono">{selectedCount}</span>
                <span className="text-muted">·</span>
                <span className="text-status-success font-mono">{selectedWeight.toFixed(2)} t</span>
              </div>

              <button
                onClick={handleAllocate}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-status-success text-white hover:brightness-110 active:scale-95 transition-all shadow-md min-h-[36px]"
                title="Mover para Convés"
              >
                <ArrowRight size={12} />
                Mover
              </button>
              <button
                onClick={handleGroupContainer}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-main border-2 border-subtle hover:border-brand-primary/50 text-secondary hover:text-brand-primary transition-all min-h-[36px]"
                title="Agrupar em Contentor"
              >
                <Boxes size={12} />
                Agrupar
              </button>
              <button
                onClick={handleChangePriority}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-main border-2 border-subtle hover:border-status-warning/50 text-secondary hover:text-status-warning transition-all min-h-[36px]"
                title="Alterar Prioridade"
              >
                <Flag size={12} />
                Prior.
              </button>
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-main border-2 border-subtle hover:border-status-error/50 text-secondary hover:text-status-error transition-all min-h-[36px]"
                title="Excluir Selecionadas"
              >
                <Trash2 size={12} />
                Excluir
              </button>

              <button
                onClick={clearCargoSelection}
                className="p-2 rounded-lg text-muted hover:text-primary hover:bg-sidebar transition-all min-h-[36px]"
                title="Limpar seleção"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs de Filtragem */}
      <div className="px-6 py-3 border-b-2 border-subtle bg-main shrink-0 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {TAB_OPTIONS.map(tab => {
          const Icon = tab.icon;
          const count = tabCounts[tab.value];
          const active = filterTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setFilterTab(tab.value)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border-2 transition-all min-h-[40px] shrink-0',
                active
                  ? 'border-brand-primary bg-brand-primary/10 text-brand-primary shadow-sm'
                  : 'border-transparent text-secondary hover:text-primary hover:bg-sidebar'
              )}
            >
              <Icon size={13} />
              {tab.label}
              <span className={cn(
                'text-[9px] font-mono px-1.5 py-0.5 rounded-md',
                active ? 'bg-brand-primary text-white' : 'bg-subtle text-muted'
              )}>
                {count}
              </span>
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleClearProcessed}
            disabled={unallocatedCargoes.length === 0}
            title="Remover todas as cargas do grid (cargas alocadas em conveses não serão afetadas)"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted hover:text-status-error hover:bg-status-error/5 border-2 border-transparent hover:border-status-error/30 transition-all min-h-[40px] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 size={12} />
            Limpar Processadas
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-sidebar border-2 border-subtle flex items-center justify-center mb-4">
              <Package size={32} className="text-muted opacity-50" />
            </div>
            {unallocatedCargoes.length === 0 ? (
              <>
                <h3 className="text-base font-black text-primary uppercase tracking-widest mb-2">Nenhuma carga no inventário</h3>
                <p className="text-[11px] text-secondary leading-relaxed">
                  Use os botões acima para importar manifestos via PDF/IA/Excel ou criar cargas manualmente.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-base font-black text-primary uppercase tracking-widest mb-2">Nenhum resultado nesta aba</h3>
                <p className="text-[11px] text-secondary leading-relaxed">
                  Ajuste a aba ou a busca para encontrar suas cargas.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {filtered.map(c => (
              <CargoGridCard
                key={c.id}
                cargo={c}
                selected={selectedCargos.has(c.id)}
                onToggle={toggleCargoSelection}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modais */}
      <CargoEditorModal isOpen={showEditor} onClose={() => setShowEditor(false)} />
      <ManualCargoModal isOpen={showManual} onClose={() => setShowManual(false)} />
      <AllocateCargoModal
        isOpen={showAllocate}
        onClose={() => setShowAllocate(false)}
        selectedCargoIds={selectedIds}
        onSuccess={() => { /* handled inside */ }}
      />
      <PriorityModal
        isOpen={showPriority}
        onClose={() => setShowPriority(false)}
        selectedCargoIds={selectedIds}
      />
      <CargoAssistant
        isOpen={showAssistant}
        onClose={() => setShowAssistant(false)}
        selectedCargos={unallocatedCargoes.filter(c => selectedCargos.has(c.id))}
      />
      <GroupMoveModal isOpen={showGroupMove} onClose={() => setShowGroupMove(false)} />
    </div>
  );
}
