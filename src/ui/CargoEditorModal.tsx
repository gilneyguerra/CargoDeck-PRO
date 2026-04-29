import { useState, useRef, useCallback, type KeyboardEvent, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, CheckCircle2, Table2, AlertCircle } from 'lucide-react';
import { useCargoStore } from '@/features/cargoStore';
import { useNotificationStore } from '@/features/notificationStore';
import type { Cargo, CargoCategory } from '@/domain/Cargo';

// ─── Tipos internos ────────────────────────────────────────────────────────────

interface EditorRow {
  id: string;
  category: CargoCategory | '';
  identifier: string;
  description: string;
  lengthMeters: string;
  widthMeters: string;
  heightMeters: string;
  weightTonnes: string;
  origin: string;
  destination: string;
  errors: Partial<Record<RowField, string>>;
}

type RowField = 'category' | 'identifier' | 'description' | 'lengthMeters' | 'widthMeters' | 'heightMeters' | 'weightTonnes';

// ─── Constantes ────────────────────────────────────────────────────────────────

const CATEGORIES: { value: CargoCategory; label: string; color: string }[] = [
  { value: 'CONTAINER',  label: 'Container',   color: '#3b82f6' },
  { value: 'BASKET',     label: 'Cesta',       color: '#10b981' },
  { value: 'GENERAL',    label: 'Geral',       color: '#f59e0b' },
  { value: 'EQUIPMENT',  label: 'Equipamento', color: '#ec4899' },
  { value: 'TUBULAR',    label: 'Tubular',     color: '#64748b' },
  { value: 'HAZARDOUS',  label: 'Perigoso',    color: '#f97316' },
  { value: 'HEAVY',      label: 'Pesado',      color: '#8b5cf6' },
  { value: 'FRAGILE',    label: 'Frágil',      color: '#06b6d4' },
  { value: 'OTHER',      label: 'Outros',      color: '#6b7280' },
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.value, c]));

const COLUMNS = [
  { key: 'category',     label: 'Categoria',       width: 148 },
  { key: 'identifier',   label: 'Cód. Identificador', width: 148 },
  { key: 'description',  label: 'Descrição',       width: 220 },
  { key: 'lengthMeters', label: 'Comp. (m)',        width: 88  },
  { key: 'widthMeters',  label: 'Larg. (m)',        width: 88  },
  { key: 'heightMeters', label: 'Alt. (m)',         width: 88  },
  { key: 'weightTonnes', label: 'Peso (t)',         width: 96  },
  { key: 'origin',       label: 'Origem',           width: 120 },
  { key: 'destination',  label: 'Destino',          width: 120 },
] as const;

type ColKey = typeof COLUMNS[number]['key'];

function mkId() { return Math.random().toString(36).slice(2, 9); }

function emptyRow(): EditorRow {
  return {
    id: mkId(),
    category: '',
    identifier: '',
    description: '',
    lengthMeters: '',
    widthMeters: '',
    heightMeters: '',
    weightTonnes: '',
    origin: '',
    destination: '',
    errors: {},
  };
}

// ─── Validação ────────────────────────────────────────────────────────────────

function validateRow(row: EditorRow): Partial<Record<RowField, string>> {
  const errors: Partial<Record<RowField, string>> = {};

  if (!row.category) {
    errors.category = 'Selecione uma categoria';
  }
  if (!row.identifier || row.identifier.trim().length < 2) {
    errors.identifier = 'Código inválido (mín. 2 caracteres)';
  }
  if (!row.description || row.description.trim().length < 2) {
    errors.description = 'Descrição obrigatória';
  }
  const len = parseFloat(row.lengthMeters);
  if (!row.lengthMeters || isNaN(len) || len <= 0 || len > 50) {
    errors.lengthMeters = 'Comprimento inválido (0.1–50m)';
  }
  const wid = parseFloat(row.widthMeters);
  if (!row.widthMeters || isNaN(wid) || wid <= 0 || wid > 50) {
    errors.widthMeters = 'Largura inválida (0.1–50m)';
  }
  const hei = parseFloat(row.heightMeters);
  if (row.heightMeters && (isNaN(hei) || hei <= 0 || hei > 50)) {
    errors.heightMeters = 'Altura inválida (0.1–50m)';
  }
  const wt = parseFloat(row.weightTonnes);
  if (!row.weightTonnes || isNaN(wt) || wt <= 0 || wt > 500) {
    errors.weightTonnes = 'Peso inválido (0.1–500t)';
  }

  return errors;
}

function rowToCargoCategory(row: EditorRow): string | undefined {
  const cat = CATEGORY_MAP[row.category as CargoCategory];
  return cat?.color;
}

// ─── Célula de texto ──────────────────────────────────────────────────────────

interface TextCellProps {
  value: string;
  field: ColKey;
  rowIdx: number;
  error?: string;
  numeric?: boolean;
  colIdx: number;
  onChange: (rowIdx: number, field: ColKey, value: string) => void;
  onTab: (rowIdx: number, colIdx: number, shift: boolean) => void;
}

function TextCell({ value, field, rowIdx, error, numeric, colIdx, onChange, onTab }: TextCellProps) {
  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      onTab(rowIdx, colIdx, e.shiftKey);
    }
  };

  return (
    <div className="relative group h-full">
      <input
        type={numeric ? 'number' : 'text'}
        value={value}
        step={numeric ? '0.01' : undefined}
        min={numeric ? '0' : undefined}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(rowIdx, field, e.target.value)}
        onKeyDown={handleKey}
        data-row={rowIdx}
        data-col={colIdx}
        className={`w-full h-full px-2.5 bg-transparent text-[12px] text-primary outline-none transition-colors
          ${error
            ? 'border border-status-error/60 bg-status-error/5 text-status-error placeholder:text-status-error/40'
            : 'border-0 focus:bg-brand-primary/5 focus:border focus:border-brand-primary/40'
          }`}
        placeholder={numeric ? '0.00' : '—'}
      />
      {error && (
        <div className="absolute left-0 top-full mt-0.5 z-50 bg-status-error text-white text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap shadow-lg pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity">
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Célula de categoria ──────────────────────────────────────────────────────

interface CategoryCellProps {
  value: CargoCategory | '';
  rowIdx: number;
  colIdx: number;
  error?: string;
  onChange: (rowIdx: number, field: ColKey, value: string) => void;
  onTab: (rowIdx: number, colIdx: number, shift: boolean) => void;
}

function CategoryCell({ value, rowIdx, colIdx, error, onChange, onTab }: CategoryCellProps) {
  const cat = value ? CATEGORY_MAP[value] : null;

  const handleKey = (e: KeyboardEvent<HTMLSelectElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      onTab(rowIdx, colIdx, e.shiftKey);
    }
  };

  return (
    <div className="relative h-full flex items-center">
      {cat && (
        <span
          className="absolute left-2 w-2 h-2 rounded-full shrink-0 pointer-events-none"
          style={{ backgroundColor: cat.color }}
        />
      )}
      <select
        value={value}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(rowIdx, 'category', e.target.value)}
        onKeyDown={handleKey}
        data-row={rowIdx}
        data-col={colIdx}
        className={`w-full h-full pl-6 pr-2 bg-transparent text-[12px] text-primary outline-none cursor-pointer transition-colors appearance-none
          ${error
            ? 'border border-status-error/60 bg-status-error/5 text-status-error'
            : 'border-0 focus:bg-brand-primary/5 focus:border focus:border-brand-primary/40'
          }`}
      >
        <option value="">— Selecione —</option>
        {CATEGORIES.map(c => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Linha da grade ───────────────────────────────────────────────────────────

interface RowProps {
  row: EditorRow;
  rowIdx: number;
  onChange: (rowIdx: number, field: ColKey, value: string) => void;
  onDelete: (rowIdx: number) => void;
  onTab: (rowIdx: number, colIdx: number, shift: boolean) => void;
}

function GridRow({ row, rowIdx, onChange, onDelete, onTab }: RowProps) {
  const hasError = Object.keys(row.errors).length > 0;
  const catMeta = row.category ? CATEGORY_MAP[row.category as CargoCategory] : null;

  return (
    <tr
      className={`border-b border-subtle/40 hover:bg-brand-primary/[0.03] group/row transition-colors
        ${hasError ? 'bg-status-error/[0.02]' : ''}`}
    >
      {/* Número da linha */}
      <td className="sticky left-0 bg-sidebar border-r border-subtle/40 text-center w-9 shrink-0">
        <span className="text-[10px] font-black text-muted">{rowIdx + 1}</span>
      </td>

      {/* Categoria */}
      <td className="border-r border-subtle/30 h-9" style={{ width: 148, minWidth: 148 }}>
        <CategoryCell
          value={row.category}
          rowIdx={rowIdx}
          colIdx={0}
          error={row.errors.category}
          onChange={onChange}
          onTab={onTab}
        />
      </td>

      {/* Identificador */}
      <td className="border-r border-subtle/30 h-9" style={{ width: 148, minWidth: 148 }}>
        <TextCell value={row.identifier} field="identifier" rowIdx={rowIdx} colIdx={1} error={row.errors.identifier}onChange={onChange} onTab={onTab} />
      </td>

      {/* Descrição */}
      <td className="border-r border-subtle/30 h-9" style={{ width: 220, minWidth: 180 }}>
        <TextCell value={row.description} field="description" rowIdx={rowIdx} colIdx={2} error={row.errors.description}onChange={onChange} onTab={onTab} />
      </td>

      {/* Comprimento */}
      <td className="border-r border-subtle/30 h-9" style={{ width: 88, minWidth: 72 }}>
        <TextCell value={row.lengthMeters} field="lengthMeters" rowIdx={rowIdx} colIdx={3} error={row.errors.lengthMeters} numericonChange={onChange} onTab={onTab} />
      </td>

      {/* Largura */}
      <td className="border-r border-subtle/30 h-9" style={{ width: 88, minWidth: 72 }}>
        <TextCell value={row.widthMeters} field="widthMeters" rowIdx={rowIdx} colIdx={4} error={row.errors.widthMeters} numericonChange={onChange} onTab={onTab} />
      </td>

      {/* Altura */}
      <td className="border-r border-subtle/30 h-9" style={{ width: 88, minWidth: 72 }}>
        <TextCell value={row.heightMeters} field="heightMeters" rowIdx={rowIdx} colIdx={5} error={row.errors.heightMeters} numericonChange={onChange} onTab={onTab} />
      </td>

      {/* Peso */}
      <td className="border-r border-subtle/30 h-9" style={{ width: 96, minWidth: 80 }}>
        <TextCell value={row.weightTonnes} field="weightTonnes" rowIdx={rowIdx} colIdx={6} error={row.errors.weightTonnes} numericonChange={onChange} onTab={onTab} />
      </td>

      {/* Origem */}
      <td className="border-r border-subtle/30 h-9" style={{ width: 120, minWidth: 100 }}>
        <TextCell value={row.origin} field="origin" rowIdx={rowIdx} colIdx={7}onChange={onChange} onTab={onTab} />
      </td>

      {/* Destino */}
      <td className="h-9" style={{ width: 120, minWidth: 100 }}>
        <TextCell value={row.destination} field="destination" rowIdx={rowIdx} colIdx={8}onChange={onChange} onTab={onTab} />
      </td>

      {/* Deletar */}
      <td className="sticky right-0 bg-sidebar border-l border-subtle/40 px-1">
        <button
          onClick={() => onDelete(rowIdx)}
          className="opacity-0 group-hover/row:opacity-100 transition-opacity p-1 rounded hover:bg-status-error/10 text-muted hover:text-status-error"
          title="Remover linha"
        >
          <Trash2 size={12} />
        </button>
      </td>
    </tr>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────────

interface Props { isOpen: boolean; onClose: () => void }

export function CargoEditorModal({ isOpen, onClose }: Props) {
  const [rows, setRows] = useState<EditorRow[]>([emptyRow()]);
  const [validated, setValidated] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);

  const { setExtractedCargoes } = useCargoStore();
  const { notify } = useNotificationStore();

  const handleClose = () => {
    setRows([emptyRow()]);
    setValidated(false);
    onClose();
  };

  const addRow = useCallback(() => {
    setRows(prev => [...prev, emptyRow()]);
    // Foco na primeira célula da nova linha após render
    setTimeout(() => {
      const inputs = tableRef.current?.querySelectorAll<HTMLElement>('[data-row]');
      if (!inputs) return;
      const lastRowIdx = rows.length;
      const target = Array.from(inputs).find(el => el.dataset.row === String(lastRowIdx) && el.dataset.col === '0');
      target?.focus();
    }, 50);
  }, [rows.length]);

  const deleteRow = useCallback((idx: number) => {
    setRows(prev => {
      if (prev.length === 1) return [emptyRow()];
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const handleChange = useCallback((rowIdx: number, field: ColKey, value: string) => {
    setRows(prev => {
      const updated = [...prev];
      const row = { ...updated[rowIdx], [field]: value };
      // Revalidar linha se já validou
      if (validated) {
        row.errors = validateRow(row);
      } else {
        row.errors = {};
      }
      updated[rowIdx] = row;
      return updated;
    });
  }, [validated]);

  // TAB navigation: avança para próxima célula, cria linha se na última
  const handleTab = useCallback((rowIdx: number, colIdx: number, shift: boolean) => {
    const totalCols = 9;
    let nextRow = rowIdx;
    let nextCol = colIdx + (shift ? -1 : 1);

    if (nextCol >= totalCols) {
      nextCol = 0;
      nextRow = rowIdx + 1;
      // Criar nova linha se na última
      if (nextRow >= rows.length) {
        setRows(prev => [...prev, emptyRow()]);
      }
    } else if (nextCol < 0) {
      nextCol = totalCols - 1;
      nextRow = rowIdx - 1;
      if (nextRow < 0) return;
    }

    setTimeout(() => {
      const inputs = tableRef.current?.querySelectorAll<HTMLElement>('[data-row]');
      if (!inputs) return;
      const target = Array.from(inputs).find(
        el => el.dataset.row === String(nextRow) && el.dataset.col === String(nextCol)
      );
      target?.focus();
    }, 30);
  }, [rows.length]);

  const handleGenerate = () => {
    // Validar todas as linhas
    const withErrors = rows.map(row => ({ ...row, errors: validateRow(row) }));
    setValidated(true);
    setRows(withErrors);

    const hasErrors = withErrors.some(r => Object.keys(r.errors).length > 0);
    if (hasErrors) {
      // Focar primeira célula com erro
      setTimeout(() => {
        const errEl = tableRef.current?.querySelector<HTMLElement>('.border-status-error\\/60');
        errEl?.focus();
      }, 50);
      notify('Corrija os campos destacados antes de importar.', 'error');
      return;
    }

    // Converter para Cargo[]
    const cargoes: Cargo[] = withErrors.map(row => ({
      id: crypto.randomUUID(),
      identifier: row.identifier.trim(),
      description: row.description.trim(),
      category: row.category as CargoCategory,
      weightTonnes: parseFloat(row.weightTonnes),
      lengthMeters: parseFloat(row.lengthMeters),
      widthMeters: parseFloat(row.widthMeters),
      heightMeters: row.heightMeters ? parseFloat(row.heightMeters) : undefined,
      quantity: 1,
      status: 'UNALLOCATED',
      color: rowToCargoCategory(row) ?? '#3b82f6',
      format: 'Retangular',
      origemCarga: row.origin.trim() || undefined,
      destinoCarga: row.destination.trim() || undefined,
    }));

    setExtractedCargoes(cargoes);
    notify(`${cargoes.length} carga${cargoes.length !== 1 ? 's' : ''} adicionada${cargoes.length !== 1 ? 's' : ''} ao inventário!`, 'success');
    handleClose();
  };

  // Métricas do rodapé
  const totalWeight = rows.reduce((sum, r) => sum + (parseFloat(r.weightTonnes) || 0), 0);
  const filledRows = rows.filter(r => r.identifier || r.description).length;
  const errorCount = validated ? rows.filter(r => Object.keys(r.errors).length > 0).length : 0;

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 font-sans">
      <div
        className="bg-main border-2 border-subtle rounded-[2rem] w-full max-w-[1200px] shadow-high relative flex flex-col"
        style={{ height: 'min(90vh, 720px)' }}
      >
        {/* Accent bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-primary via-indigo-500 to-brand-primary rounded-t-[2rem] z-10" />

        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-subtle shrink-0 flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
            <Table2 size={20} className="text-brand-primary" />
          </div>
          <div>
            <h2 className="text-lg font-black text-primary tracking-tighter uppercase leading-none">Editor de Cargas em Grade</h2>
            <p className="text-[9px] font-black text-secondary uppercase tracking-[0.3em] opacity-80 mt-0.5">Entrada em massa · Estilo planilha · TAB para navegar</p>
          </div>

          {/* Métricas rápidas */}
          <div className="ml-auto flex items-center gap-4">
            {errorCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-status-error/10 border border-status-error/30 rounded-xl">
                <AlertCircle size={12} className="text-status-error" />
                <span className="text-[10px] font-black text-status-error uppercase">{errorCount} erro{errorCount !== 1 ? 's' : ''}</span>
              </div>
            )}
            {filledRows > 0 && (
              <div className="flex items-center gap-3 text-[10px] font-black text-secondary uppercase tracking-widest">
                <span>{filledRows} linha{filledRows !== 1 ? 's' : ''}</span>
                {totalWeight > 0 && <span className="text-brand-primary">{totalWeight.toFixed(2)} t total</span>}
              </div>
            )}
            <button
              onClick={handleClose}
              className="p-2 hover:bg-sidebar rounded-xl text-muted hover:text-primary transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto">
          <table
            ref={tableRef}
            className="w-full border-collapse text-left"
            style={{ minWidth: 1060 }}
          >
            {/* Cabeçalho fixo */}
            <thead className="sticky top-0 z-20 bg-sidebar border-b-2 border-subtle">
              <tr>
                {/* Nº */}
                <th className="sticky left-0 bg-sidebar border-r border-subtle/40 w-9 px-2 py-2.5 text-[9px] font-black text-muted uppercase tracking-widest text-center">#</th>
                {/* Categoria */}
                <th className="border-r border-subtle/30 px-3 py-2.5 text-[9px] font-black text-muted uppercase tracking-widest" style={{ width: 148 }}>Categoria</th>
                {/* Identificador */}
                <th className="border-r border-subtle/30 px-3 py-2.5 text-[9px] font-black text-muted uppercase tracking-widest" style={{ width: 148 }}>Cód. ID</th>
                {/* Descrição */}
                <th className="border-r border-subtle/30 px-3 py-2.5 text-[9px] font-black text-muted uppercase tracking-widest" style={{ width: 220 }}>Descrição</th>
                {/* Dimensões */}
                <th className="border-r border-subtle/30 px-3 py-2.5 text-[9px] font-black text-muted uppercase tracking-widest text-center" style={{ width: 88 }}>Comp. m</th>
                <th className="border-r border-subtle/30 px-3 py-2.5 text-[9px] font-black text-muted uppercase tracking-widest text-center" style={{ width: 88 }}>Larg. m</th>
                <th className="border-r border-subtle/30 px-3 py-2.5 text-[9px] font-black text-muted uppercase tracking-widest text-center" style={{ width: 88 }}>Alt. m</th>
                {/* Peso */}
                <th className="border-r border-subtle/30 px-3 py-2.5 text-[9px] font-black text-muted uppercase tracking-widest text-center" style={{ width: 96 }}>Peso t</th>
                {/* Rota */}
                <th className="border-r border-subtle/30 px-3 py-2.5 text-[9px] font-black text-muted uppercase tracking-widest" style={{ width: 120 }}>Origem</th>
                <th className="px-3 py-2.5 text-[9px] font-black text-muted uppercase tracking-widest" style={{ width: 120 }}>Destino</th>
                {/* Ações */}
                <th className="sticky right-0 bg-sidebar border-l border-subtle/40 w-8" />
              </tr>
            </thead>

            <tbody className="bg-main">
              {rows.map((row, idx) => (
                <GridRow
                  key={row.id}
                  row={row}
                  rowIdx={idx}
                  onChange={handleChange}
                  onDelete={deleteRow}
                  onTab={handleTab}
                />
              ))}

              {/* Linha de adicionar */}
              <tr className="border-b border-subtle/20">
                <td colSpan={11} className="py-1.5 px-12">
                  <button
                    onClick={addRow}
                    className="flex items-center gap-2 text-[11px] font-black text-muted hover:text-brand-primary transition-colors uppercase tracking-widest py-1"
                  >
                    <Plus size={13} />
                    Adicionar linha
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Rodapé */}
        <div className="px-8 py-5 border-t border-subtle bg-sidebar shrink-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-[10px] font-black text-muted uppercase tracking-widest">
            <span>{rows.length} linha{rows.length !== 1 ? 's' : ''} · {filledRows} preenchida{filledRows !== 1 ? 's' : ''}</span>
            {totalWeight > 0 && (
              <span className="text-brand-primary">Peso total: {totalWeight.toFixed(3)} t</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={addRow}
              className="flex items-center gap-2 px-5 py-2.5 bg-main border-2 border-subtle hover:border-brand-primary/40 text-primary rounded-xl text-xs font-black uppercase tracking-widest transition-all"
            >
              <Plus size={14} />
              Linha
            </button>

            <button
              onClick={handleClose}
              className="px-5 py-2.5 rounded-xl text-xs font-black text-muted hover:text-primary hover:bg-main uppercase tracking-widest transition-all"
            >
              Cancelar
            </button>

            <button
              onClick={handleGenerate}
              disabled={filledRows === 0}
              className="flex items-center gap-2 px-8 py-2.5 bg-status-success hover:brightness-110 disabled:opacity-40 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md shadow-status-success/20 active:scale-95 transition-all"
            >
              <CheckCircle2 size={14} />
              Gerar {filledRows > 0 ? `${filledRows} ` : ''}Carga{filledRows !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
