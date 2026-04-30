import { useState, useEffect, useMemo, type FormEvent, type ChangeEvent } from 'react';
import { useCargoStore } from '@/features/cargoStore';
import { useNotificationStore } from '@/features/notificationStore';
import {
  ArrowLeft, Box, Settings, Info, Plus, Trash2, Save,
  Package, AlertCircle, Layers
} from 'lucide-react';
import type { CargoCategory } from '@/domain/Cargo';
import { CargoPreview } from './CargoPreview';
import { cn } from '@/lib/utils';

// ─── Constantes ────────────────────────────────────────────────────────────────

const DRAFT_KEY = 'cargodeck-creation-draft';

const CATEGORY_OPTIONS: { value: CargoCategory; label: string; color: string }[] = [
  { value: 'GENERAL',    label: 'Geral',       color: '#f59e0b' },
  { value: 'CONTAINER',  label: 'Container',   color: '#3b82f6' },
  { value: 'BASKET',     label: 'Cesta',       color: '#10b981' },
  { value: 'TUBULAR',    label: 'Tubular',     color: '#64748b' },
  { value: 'EQUIPMENT',  label: 'Equipamento', color: '#ec4899' },
  { value: 'HAZARDOUS',  label: 'Perigoso',    color: '#f97316' },
  { value: 'HEAVY',      label: 'Pesado',      color: '#8b5cf6' },
  { value: 'FRAGILE',    label: 'Frágil',      color: '#06b6d4' },
  { value: 'OTHER',      label: 'Outros',      color: '#6b7280' },
];

const COLOR_OPTIONS = [
  { value: '#3b82f6', label: 'Azul Marítimo (Padrão)' },
  { value: '#10b981', label: 'Verde Segurança' },
  { value: '#f59e0b', label: 'Âmbar Atenção' },
  { value: '#ef4444', label: 'Vermelho Crítico' },
  { value: '#8b5cf6', label: 'Roxo Especial' },
  { value: '#6b7280', label: 'Cinza Industrial' },
];

interface DraftState {
  description: string;
  identifier: string;
  weightTonnes: string;
  lengthMeters: string;
  widthMeters: string;
  heightMeters: string;
  quantity: number;
  category: CargoCategory;
  observations: string;
  isRemovable: boolean;
  color: string;
  format: 'Retangular' | 'Quadrado' | 'Tubular';
  origin: string;
  destination: string;
}

const EMPTY_DRAFT: DraftState = {
  description: '', identifier: '', weightTonnes: '', lengthMeters: '',
  widthMeters: '', heightMeters: '', quantity: 1, category: 'GENERAL',
  observations: '', isRemovable: false, color: '#3b82f6', format: 'Retangular',
  origin: '', destination: '',
};

// ─── Validação ────────────────────────────────────────────────────────────────

interface FormErrors {
  description?: string;
  identifier?: string;
  weightTonnes?: string;
  lengthMeters?: string;
  widthMeters?: string;
  heightMeters?: string;
}

function validateDraft(d: DraftState): FormErrors {
  const errs: FormErrors = {};
  if (!d.description.trim() || d.description.trim().length < 2) errs.description = 'Descrição obrigatória (mín. 2 caracteres)';
  if (!d.identifier.trim() || d.identifier.trim().length < 2) errs.identifier = 'TAG / Código obrigatório (mín. 2 caracteres)';
  const w = parseFloat(d.weightTonnes);
  if (!d.weightTonnes || isNaN(w) || w <= 0 || w > 500) errs.weightTonnes = 'Peso entre 0.1 e 500 t';
  const l = parseFloat(d.lengthMeters);
  if (!d.lengthMeters || isNaN(l) || l <= 0 || l > 50) errs.lengthMeters = 'Comprimento entre 0.1 e 50 m';
  const wi = parseFloat(d.widthMeters);
  if (!d.widthMeters || isNaN(wi) || wi <= 0 || wi > 50) errs.widthMeters = 'Largura entre 0.1 e 50 m';
  if (d.heightMeters) {
    const h = parseFloat(d.heightMeters);
    if (isNaN(h) || h <= 0 || h > 50) errs.heightMeters = 'Altura entre 0.1 e 50 m';
  }
  return errs;
}

// ─── Página principal ────────────────────────────────────────────────────────

export function ContainerCreationPage() {
  const { addManualCargo, unallocatedCargoes, setViewMode } = useCargoStore();
  const { notify } = useNotificationStore();

  // Carrega rascunho do localStorage na montagem
  const [draft, setDraft] = useState<DraftState>(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) return { ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<DraftState>) };
    } catch { /* noop */ }
    return EMPTY_DRAFT;
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const update = <K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    if (submitted) {
      setErrors(validateDraft({ ...draft, [key]: value }));
    }
  };

  // ─── Cálculos derivados ───────────────────────────────────────────────────
  const area = useMemo(() => {
    const l = parseFloat(draft.lengthMeters) || 0;
    const w = parseFloat(draft.widthMeters) || 0;
    return (l * w).toFixed(2);
  }, [draft.lengthMeters, draft.widthMeters]);

  const volume = useMemo(() => {
    const l = parseFloat(draft.lengthMeters) || 0;
    const w = parseFloat(draft.widthMeters) || 0;
    const h = parseFloat(draft.heightMeters) || 1;
    return (l * w * h).toFixed(2);
  }, [draft.lengthMeters, draft.widthMeters, draft.heightMeters]);

  // ─── Ações ────────────────────────────────────────────────────────────────

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const errs = validateDraft(draft);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      notify('Corrija os campos destacados antes de salvar.', 'error');
      return;
    }

    addManualCargo({
      description: draft.description.trim(),
      identifier: draft.identifier.trim(),
      weightTonnes: parseFloat(draft.weightTonnes),
      lengthMeters: parseFloat(draft.lengthMeters),
      widthMeters: parseFloat(draft.widthMeters),
      heightMeters: draft.heightMeters ? parseFloat(draft.heightMeters) : 1,
      quantity: draft.quantity,
      category: draft.category,
      observations: draft.observations.trim() || undefined,
      isRemovable: draft.isRemovable,
      color: draft.color,
      format: draft.format,
      origemCarga: draft.origin.trim() || undefined,
      destinoCarga: draft.destination.trim() || undefined,
    });

    notify(`Carga "${draft.identifier}" adicionada ao inventário!`, 'success');
    setDraft(EMPTY_DRAFT);
    setErrors({});
    setSubmitted(false);
    localStorage.removeItem(DRAFT_KEY);
  };

  const handleSaveDraft = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      notify('Rascunho salvo. Você pode voltar mais tarde.', 'info');
    } catch {
      notify('Não foi possível salvar o rascunho.', 'error');
    }
  };

  const handleClearDraft = () => {
    setDraft(EMPTY_DRAFT);
    setErrors({});
    setSubmitted(false);
    localStorage.removeItem(DRAFT_KEY);
    notify('Formulário limpo.', 'info');
  };

  const handleBack = () => {
    setViewMode('deck');
  };

  // Auto-salvar rascunho a cada 5 segundos quando há conteúdo
  useEffect(() => {
    const hasContent = Object.entries(draft).some(([k, v]) => {
      if (k === 'quantity') return v !== 1;
      if (k === 'color' || k === 'format' || k === 'category') return false;
      if (typeof v === 'string') return v.length > 0;
      return Boolean(v);
    });
    if (!hasContent) return;
    const timer = window.setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* noop */ }
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [draft]);

  // ─── Render ───────────────────────────────────────────────────────────────

  const inputCls = (hasError: boolean) =>
    cn(
      'w-full bg-main border-2 rounded-xl px-4 py-3 text-sm font-bold text-primary outline-none transition-all shadow-inner placeholder:text-muted/50',
      hasError ? 'border-status-error/60 bg-status-error/5' : 'border-strong/40 focus:border-brand-primary'
    );

  return (
    <div className="flex-1 flex flex-col bg-main overflow-hidden">
      {/* Header da página */}
      <div className="px-8 py-5 border-b-2 border-subtle bg-sidebar/50 shrink-0 flex items-center gap-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-secondary hover:text-primary hover:bg-main border-2 border-transparent hover:border-subtle uppercase tracking-widest transition-all"
        >
          <ArrowLeft size={14} />
          Voltar ao Deck
        </button>
        <div className="h-8 w-px bg-subtle" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
            <Plus size={20} className="text-brand-primary" />
          </div>
          <div>
            <h1 className="text-lg font-montserrat font-black text-primary tracking-tighter uppercase leading-none">Cadastro Detalhado de Carga</h1>
            <p className="text-[9px] font-black text-secondary uppercase tracking-[0.3em] opacity-80 mt-1">Formulário completo · Rascunho automático</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={handleClearDraft}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black text-muted hover:text-status-error hover:bg-status-error/5 border-2 border-transparent hover:border-status-error/30 uppercase tracking-widest transition-all"
          >
            <Trash2 size={12} />
            Limpar
          </button>
          <button
            onClick={handleSaveDraft}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black text-secondary hover:text-brand-primary hover:bg-brand-primary/5 border-2 border-subtle hover:border-brand-primary/30 uppercase tracking-widest transition-all"
          >
            <Save size={12} />
            Salvar Rascunho
          </button>
        </div>
      </div>

      {/* Conteúdo: 2 colunas (60% form / 40% preview) */}
      <div className="flex-1 overflow-hidden flex">
        {/* COLUNA ESQUERDA — FORMULÁRIO */}
        <form
          id="container-creation-form"
          onSubmit={handleSubmit}
          className="flex-1 max-w-[60%] overflow-y-auto p-8 space-y-6"
          style={{ width: '60%' }}
        >
          {/* Categoria */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
              <Layers size={13} className="text-brand-primary" /> Categoria
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORY_OPTIONS.map(opt => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => update('category', opt.value)}
                  className={cn(
                    'relative px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border-2 active:scale-95',
                    draft.category === opt.value
                      ? 'border-brand-primary bg-brand-primary/10 text-brand-primary shadow-md'
                      : 'border-subtle bg-main text-secondary hover:border-strong hover:text-primary'
                  )}
                >
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                  <span className="ml-3">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Descrição + ID */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
                <Box size={13} className="text-brand-primary" /> Descrição Comercial
              </label>
              <input
                type="text"
                value={draft.description}
                onChange={(e: ChangeEvent<HTMLInputElement>) => update('description', e.target.value)}
                placeholder="Ex.: BOMBA CENTRÍFUGA SECUNDÁRIA"
                className={inputCls(!!errors.description)}
              />
              {errors.description && <p className="text-[10px] font-bold text-status-error">{errors.description}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-primary uppercase tracking-widest">TAG / Código</label>
              <input
                type="text"
                value={draft.identifier}
                onChange={(e: ChangeEvent<HTMLInputElement>) => update('identifier', e.target.value)}
                placeholder="TAG-990"
                className={inputCls(!!errors.identifier)}
              />
              {errors.identifier && <p className="text-[10px] font-bold text-status-error">{errors.identifier}</p>}
            </div>
          </div>

          {/* Especificações Técnicas */}
          <div className="bg-sidebar/40 p-6 rounded-2xl border-2 border-subtle space-y-4">
            <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
              <Settings size={13} className="text-brand-primary" /> Especificações Físicas
            </label>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black text-muted uppercase tracking-widest">Peso (t)</label>
                <input
                  type="number" step="0.001"
                  value={draft.weightTonnes}
                  onChange={e => update('weightTonnes', e.target.value)}
                  className={inputCls(!!errors.weightTonnes)}
                />
                {errors.weightTonnes && <p className="text-[9px] font-bold text-status-error">{errors.weightTonnes}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black text-muted uppercase tracking-widest">Comp. (m)</label>
                <input
                  type="number" step="0.01"
                  value={draft.lengthMeters}
                  onChange={e => update('lengthMeters', e.target.value)}
                  className={inputCls(!!errors.lengthMeters)}
                />
                {errors.lengthMeters && <p className="text-[9px] font-bold text-status-error">{errors.lengthMeters}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black text-muted uppercase tracking-widest">Larg. (m)</label>
                <input
                  type="number" step="0.01"
                  value={draft.widthMeters}
                  onChange={e => update('widthMeters', e.target.value)}
                  className={inputCls(!!errors.widthMeters)}
                />
                {errors.widthMeters && <p className="text-[9px] font-bold text-status-error">{errors.widthMeters}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black text-muted uppercase tracking-widest">Alt. (m)</label>
                <input
                  type="number" step="0.01"
                  value={draft.heightMeters}
                  onChange={e => update('heightMeters', e.target.value)}
                  className={inputCls(!!errors.heightMeters)}
                />
                {errors.heightMeters && <p className="text-[9px] font-bold text-status-error">{errors.heightMeters}</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black text-muted uppercase tracking-widest">Quantidade</label>
                <input
                  type="number" min="1"
                  value={draft.quantity}
                  onChange={e => update('quantity', parseInt(e.target.value) || 1)}
                  className={inputCls(false)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black text-muted uppercase tracking-widest">Geometria</label>
                <select
                  value={draft.format}
                  onChange={e => update('format', e.target.value as 'Retangular' | 'Quadrado' | 'Tubular')}
                  className={cn(inputCls(false), 'appearance-none cursor-pointer')}
                >
                  <option value="Retangular">Retangular</option>
                  <option value="Quadrado">Quadrado</option>
                  <option value="Tubular">Tubular</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black text-muted uppercase tracking-widest">Cor</label>
                <select
                  value={draft.color}
                  onChange={e => update('color', e.target.value)}
                  className={cn(inputCls(false), 'appearance-none cursor-pointer')}
                >
                  {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Rota */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-primary uppercase tracking-widest">Origem</label>
              <input
                type="text"
                value={draft.origin}
                onChange={e => update('origin', e.target.value)}
                placeholder="Ex.: PACU"
                className={inputCls(false)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-primary uppercase tracking-widest">Destino</label>
              <input
                type="text"
                value={draft.destination}
                onChange={e => update('destination', e.target.value)}
                placeholder="Ex.: NS44"
                className={inputCls(false)}
              />
            </div>
          </div>

          {/* Observações + Removível */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
              <Info size={13} className="text-brand-primary" /> Observações do Operador
            </label>
            <textarea
              value={draft.observations}
              onChange={e => update('observations', e.target.value)}
              placeholder="Instruções especiais de manuseio ou armazenamento..."
              rows={3}
              className={cn(inputCls(false), 'resize-none no-scrollbar')}
            />
          </div>

          <div
            className="flex items-center justify-between p-5 bg-sidebar border-2 border-subtle rounded-2xl cursor-pointer hover:border-brand-primary/40 transition-all"
            onClick={() => update('isRemovable', !draft.isRemovable)}
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-black text-primary uppercase tracking-widest">Carga Removível / Subsea</span>
              <span className="text-[9px] font-bold text-secondary uppercase tracking-tighter opacity-80">Item pode ser retirado durante a operação</span>
            </div>
            <div className={cn('w-12 h-6 rounded-full transition-all relative', draft.isRemovable ? 'bg-brand-primary' : 'bg-strong/40')}>
              <div className={cn(
                'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all',
                draft.isRemovable ? 'left-6' : 'left-0.5'
              )} />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-brand-primary text-white py-4 rounded-2xl text-xs font-black uppercase tracking-[0.25em] shadow-xl shadow-brand-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 min-h-[40px]"
            >
              <Plus size={16} />
              Adicionar ao Inventário
            </button>
          </div>
        </form>

        {/* COLUNA DIREITA — PREVIEW + LISTA */}
        <aside className="border-l-2 border-subtle bg-sidebar/30 overflow-y-auto" style={{ width: '40%' }}>
          {/* Preview */}
          <div className="p-6 border-b-2 border-subtle">
            <div className="flex items-center gap-2 mb-4">
              <Package size={14} className="text-brand-primary" />
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Pré-visualização Dimensional</span>
            </div>

            <div className="bg-main rounded-2xl border-2 border-dashed border-subtle p-8 flex items-center justify-center min-h-[220px] mb-4">
              <div className="scale-110">
                <CargoPreview
                  format={draft.format}
                  length={parseFloat(draft.lengthMeters) || 1}
                  width={parseFloat(draft.widthMeters) || 1}
                  height={parseFloat(draft.heightMeters) || 1}
                  color={draft.color}
                  quantity={draft.quantity}
                  dynamicScale={true}
                />
              </div>
            </div>

            {/* Métricas calculadas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-main rounded-xl border border-subtle p-3 text-center">
                <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-1">Área</p>
                <p className="text-sm font-black text-brand-primary font-mono">{area} <span className="text-[10px] text-muted">m²</span></p>
              </div>
              <div className="bg-main rounded-xl border border-subtle p-3 text-center">
                <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-1">Volume</p>
                <p className="text-sm font-black text-brand-primary font-mono">{volume} <span className="text-[10px] text-muted">m³</span></p>
              </div>
            </div>
          </div>

          {/* Lista de Não Alocadas */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-status-success" />
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Não Alocadas</span>
              </div>
              <span className="text-[10px] font-black text-status-success bg-status-success/10 border border-status-success/30 rounded-lg px-2 py-1">
                {unallocatedCargoes.length}
              </span>
            </div>

            {unallocatedCargoes.length === 0 ? (
              <div className="bg-main border-2 border-dashed border-subtle rounded-2xl p-8 text-center">
                <AlertCircle size={20} className="text-muted mx-auto mb-2 opacity-50" />
                <p className="text-[10px] font-black text-muted uppercase tracking-widest">Nenhuma carga no inventário ainda.</p>
                <p className="text-[9px] text-secondary mt-1">Preencha o formulário ao lado para começar.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto no-scrollbar">
                {unallocatedCargoes.slice(0, 50).map(c => (
                  <div
                    key={c.id}
                    className="bg-main border border-subtle rounded-xl p-3 flex items-center gap-3 hover:border-brand-primary/40 transition-all"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: c.color || '#3b82f6' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-primary truncate">{c.identifier}</p>
                      <p className="text-[9px] text-muted truncate">{c.description}</p>
                    </div>
                    <span className="text-[10px] font-black text-secondary font-mono shrink-0">{c.weightTonnes.toFixed(2)}t</span>
                  </div>
                ))}
                {unallocatedCargoes.length > 50 && (
                  <p className="text-center text-[9px] text-muted font-bold uppercase tracking-widest mt-2">
                    + {unallocatedCargoes.length - 50} cargas adicionais
                  </p>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
