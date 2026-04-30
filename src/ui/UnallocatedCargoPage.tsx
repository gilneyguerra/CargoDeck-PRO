import { useState, useMemo, useRef, useDeferredValue, type ChangeEvent } from 'react';
import {
  ArrowLeft, Search, Upload, MessageSquare, Table2, Plus,
  ArrowRight, CheckSquare, Square, Trash2, Package, X, Eye
} from 'lucide-react';
import { useCargoStore } from '@/features/cargoStore';
import { useNotificationStore } from '@/features/notificationStore';
import { usePDFUpload } from '@/hooks/usePDFUpload';
import { ManifestoChatModal } from './ManifestoChatModal';
import { CargoEditorModal } from './CargoEditorModal';
import { ManualCargoModal } from './ManualCargoModal';
import { AllocateCargoModal } from './AllocateCargoModal';
import type { Cargo } from '@/domain/Cargo';
import { cn } from '@/lib/utils';

// ─── CargoCard ─────────────────────────────────────────────────────────────────

interface CargoCardProps {
  cargo: Cargo;
  selected: boolean;
  onToggle: (id: string) => void;
  onEdit: (cargo: Cargo) => void;
  onDelete: (cargo: Cargo) => void;
}

function CargoCard({ cargo, selected, onToggle, onEdit, onDelete }: CargoCardProps) {
  const ratio = (cargo.lengthMeters || 1) / (cargo.widthMeters || 1);
  // Caixa visual proporcional: largura base 80px, altura derivada
  const baseSize = 80;
  const visualWidth = ratio >= 1 ? baseSize : Math.max(20, baseSize * ratio);
  const visualHeight = ratio >= 1 ? Math.max(20, baseSize / ratio) : baseSize;

  return (
    <div
      onClick={() => onToggle(cargo.id)}
      className={cn(
        'group p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-3 hover:shadow-md active:scale-[0.98]',
        selected
          ? 'border-brand-primary bg-brand-primary/5 shadow-md'
          : 'border-subtle bg-sidebar/40 hover:border-strong'
      )}
    >
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
          className="flex-1 p-1.5 rounded-md hover:bg-brand-primary/10 text-muted hover:text-brand-primary transition-all"
          title="Editar"
        >
          <Eye size={12} className="mx-auto" />
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

export function UnallocatedCargoPage() {
  const {
    unallocatedCargoes, selectedCargos,
    toggleCargoSelection, selectMultipleCargos, clearCargoSelection,
    setViewMode, setEditingCargo, deleteCargo
  } = useCargoStore();
  const { notify, ask } = useNotificationStore();
  const { upload, loading: isProcessing } = usePDFUpload();

  // Modais
  const [showChat, setShowChat] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showAllocate, setShowAllocate] = useState(false);

  // Busca
  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtragem com useMemo (performance > 200 itens)
  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return unallocatedCargoes;
    return unallocatedCargoes.filter(c =>
      (c.identifier || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q) ||
      (c.category || '').toLowerCase().includes(q) ||
      (c.destinoCarga || '').toLowerCase().includes(q)
    );
  }, [unallocatedCargoes, deferredSearch]);

  // Métricas
  const selectedIds = useMemo(() => Array.from(selectedCargos), [selectedCargos]);
  const selectedCount = selectedIds.length;
  const selectedWeight = useMemo(
    () => unallocatedCargoes.filter(c => selectedCargos.has(c.id)).reduce((s, c) => s + (c.weightTonnes || 0), 0),
    [unallocatedCargoes, selectedCargos]
  );

  const allFilteredSelected = filtered.length > 0 && filtered.every(c => selectedCargos.has(c.id));

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleBack = () => {
    clearCargoSelection();
    setViewMode('deck');
  };

  const handleSelectAll = () => {
    if (allFilteredSelected) {
      clearCargoSelection();
    } else {
      selectMultipleCargos(filtered.map(c => c.id));
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await upload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEdit = (cargo: Cargo) => setEditingCargo(cargo);

  const handleDelete = async (cargo: Cargo) => {
    const ok = await ask('Excluir Carga', `Excluir "${cargo.identifier}" definitivamente?`);
    if (ok) {
      await deleteCargo(cargo.id);
      notify('Carga excluída.', 'success');
    }
  };

  const handleAllocate = () => {
    if (selectedCount === 0) {
      notify('Selecione pelo menos uma carga.', 'warning');
      return;
    }
    setShowAllocate(true);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col bg-main overflow-hidden">
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
            <Package size={20} className="text-brand-primary" />
          </div>
          <div>
            <h1 className="text-base font-montserrat font-black text-primary tracking-tighter uppercase leading-none">Cargas Não Alocadas</h1>
            <p className="text-[9px] font-black text-secondary uppercase tracking-[0.3em] opacity-80 mt-1">
              {filtered.length} de {unallocatedCargoes.length} carga(s)
            </p>
          </div>
        </div>

        {/* Busca */}
        <div className="flex-1 min-w-[240px] max-w-md relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por ID, descrição, categoria, destino…"
            className="w-full bg-main border-2 border-subtle rounded-xl pl-9 pr-9 py-2.5 text-xs font-bold text-primary outline-none focus:border-brand-primary transition-all min-h-[40px]"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-sidebar text-muted hover:text-primary"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Botões de extração */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            title="Importar Manifesto PDF (OCR)"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-main border-2 border-subtle hover:border-brand-primary/40 text-secondary hover:text-brand-primary transition-all min-h-[40px] disabled:opacity-40"
          >
            <Upload size={12} />
            PDF
          </button>
          <button
            onClick={() => setShowChat(true)}
            title="Importar via Chat IA"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-main border-2 border-subtle hover:border-brand-primary/40 text-secondary hover:text-brand-primary transition-all min-h-[40px]"
          >
            <MessageSquare size={12} />
            IA
          </button>
          <button
            onClick={() => setShowEditor(true)}
            title="Editor em Grade (Excel/CSV)"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-main border-2 border-subtle hover:border-brand-primary/40 text-secondary hover:text-brand-primary transition-all min-h-[40px]"
          >
            <Table2 size={12} />
            Grade
          </button>
          <button
            onClick={() => setShowManual(true)}
            title="Nova carga manual"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-brand-primary text-white hover:brightness-110 transition-all min-h-[40px] shadow-md"
          >
            <Plus size={12} />
            Manual
          </button>
        </div>

        <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
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
                <h3 className="text-base font-black text-primary uppercase tracking-widest mb-2">Nenhum resultado</h3>
                <p className="text-[11px] text-secondary leading-relaxed">
                  Não há cargas que correspondam à busca <span className="font-mono font-black text-brand-primary">"{deferredSearch}"</span>.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(c => (
              <CargoCard
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

      {/* Footer fixo com seleção */}
      <div className="px-6 py-4 border-t-2 border-subtle bg-sidebar shrink-0 flex items-center gap-3 flex-wrap">
        <button
          onClick={handleSelectAll}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-secondary hover:text-brand-primary hover:bg-main border-2 border-subtle hover:border-brand-primary/40 transition-all min-h-[40px] disabled:opacity-40"
        >
          {allFilteredSelected ? <CheckSquare size={12} /> : <Square size={12} />}
          {allFilteredSelected ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
        </button>

        {selectedCount > 0 && (
          <button
            onClick={clearCargoSelection}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted hover:text-status-error hover:bg-status-error/5 transition-all min-h-[40px]"
          >
            <X size={12} />
            Limpar
          </button>
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
          <span className="text-secondary">
            Selecionadas: <span className="text-brand-primary font-mono">{selectedCount}</span>
          </span>
          <span className="text-muted">·</span>
          <span className="text-secondary">
            Peso total: <span className="text-status-success font-mono">{selectedWeight.toFixed(2)} t</span>
          </span>
        </div>

        <button
          onClick={handleAllocate}
          disabled={selectedCount === 0}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-status-success text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-status-success/20 active:scale-95 min-h-[40px]"
        >
          <ArrowRight size={14} />
          Movimentar Selecionadas
        </button>
      </div>

      {/* Modais */}
      <ManifestoChatModal isOpen={showChat} onClose={() => setShowChat(false)} />
      <CargoEditorModal isOpen={showEditor} onClose={() => setShowEditor(false)} />
      <ManualCargoModal isOpen={showManual} onClose={() => setShowManual(false)} />
      <AllocateCargoModal
        isOpen={showAllocate}
        onClose={() => setShowAllocate(false)}
        selectedCargoIds={selectedIds}
        onSuccess={() => { /* clearCargoSelection já é feito dentro do modal */ }}
      />
    </div>
  );
}
