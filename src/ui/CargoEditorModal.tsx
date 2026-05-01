import { useState, useRef, useCallback, useId, type KeyboardEvent, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, CheckCircle2, Table2, AlertCircle, Upload, Download, ChevronDown, ArrowRight } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useCargoStore } from '@/features/cargoStore';
import { useNotificationStore } from '@/features/notificationStore';
import { reportException } from '@/features/errorReporter';
import type { Cargo, CargoCategory } from '@/domain/Cargo';
import {
  parseDecimalBR,
  parseExcelToMatrix,
  parseCsvToMatrix,
  loadXlsx,
} from '@/lib/spreadsheetParser';

// ─── Tipos internos ────────────────────────────────────────────────────────────

interface EditorRow {
  id: string;
  category: CargoCategory | '';
  description: string;
  identifier: string;
  empresa: string;
  origin: string;
  destination: string;
  weightTonnes: string;
  lengthMeters: string;
  widthMeters: string;
  heightMeters: string;
  isHazardous: boolean;
  /** Override de "modal unitizador" vindo da planilha (coluna `unitizador`).
   *  undefined = "siga default por categoria" (resolvido via canHoldItems no import). */
  holdsItems?: boolean;
  errors: Partial<Record<RowField, string>>;
}

// Campos obrigatórios para validação
type RowField = 'category' | 'description' | 'identifier' | 'weightTonnes' | 'lengthMeters' | 'widthMeters' | 'heightMeters';

// ColKey = todas as colunas editáveis (inclui origin/destination/empresa opcionais)
type ColKey = 'category' | 'description' | 'identifier' | 'empresa' | 'origin' | 'destination' | 'weightTonnes' | 'lengthMeters' | 'widthMeters' | 'heightMeters';

// ─── Mapeamento de categorias ─────────────────────────────────────────────────

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

// Mapeia strings brutas do CSV para CargoCategory
function parseCsvCategory(raw: string, perigosa: string): CargoCategory {
  const upper = raw.trim().toUpperCase();
  const map: Record<string, CargoCategory> = {
    CONTAINER: 'CONTAINER', BASKET: 'BASKET', CESTA: 'BASKET',
    GENERAL: 'GENERAL', GERAL: 'GENERAL', EQUIPMENT: 'EQUIPMENT',
    EQUIPAMENTO: 'EQUIPMENT', TUBULAR: 'TUBULAR', HAZARDOUS: 'HAZARDOUS',
    PERIGOSO: 'HAZARDOUS', HEAVY: 'HEAVY', PESADO: 'HEAVY',
    FRAGILE: 'FRAGILE', FRÁGIL: 'FRAGILE', OTHER: 'OTHER', OUTROS: 'OTHER',
  };
  if (perigosa.trim().toUpperCase() === 'SIM' && !map[upper]) return 'HAZARDOUS';
  return map[upper] ?? 'GENERAL';
}

// Parse da célula "unitizador" em boolean | undefined.
// Vazio → undefined (cai no default por categoria via canHoldItems).
function parseUnitizadorCell(raw: string): boolean | undefined {
  const v = raw.trim().toUpperCase();
  if (!v) return undefined;
  if (['SIM', 'S', 'Y', 'YES', 'TRUE', '1', 'V', 'VERDADEIRO'].includes(v)) return true;
  if (['NÃO', 'NAO', 'N', 'NO', 'FALSE', '0', 'F', 'FALSO'].includes(v)) return false;
  return undefined;
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

function mkId() { return Math.random().toString(36).slice(2, 9); }

function emptyRow(): EditorRow {
  return { id: mkId(), category: '', description: '', identifier: '', empresa: '', origin: '', destination: '', weightTonnes: '', lengthMeters: '', widthMeters: '', heightMeters: '', isHazardous: false, errors: {} };
}

// ─── Validação ────────────────────────────────────────────────────────────────

// Labels human-readable usados no painel de erros e mensagens de tooltip
const FIELD_LABELS: Record<RowField, string> = {
  category: 'Categoria',
  description: 'Descrição',
  identifier: 'Cód. Identificador',
  weightTonnes: 'Peso (t)',
  lengthMeters: 'Comprimento (m)',
  widthMeters: 'Largura (m)',
  heightMeters: 'Altura (m)',
};

function validateRow(row: EditorRow): Partial<Record<RowField, string>> {
  const e: Partial<Record<RowField, string>> = {};
  if (!row.category) e.category = 'Selecione uma categoria';
  if (!row.description || row.description.trim().length < 2) e.description = 'Descrição vazia ou muito curta';
  if (!row.identifier || row.identifier.trim().length < 2) e.identifier = 'Código vazio ou muito curto (mín. 2 caracteres)';
  const wt = parseDecimalBR(row.weightTonnes);
  if (!row.weightTonnes || isNaN(wt)) e.weightTonnes = 'Peso ausente — informe valor em toneladas';
  else if (wt <= 0) e.weightTonnes = `Peso deve ser maior que zero (atual: ${wt}t)`;
  else if (wt > 1000) e.weightTonnes = `Peso muito alto (${wt}t) — verifique se está em toneladas, não kg`;
  const len = parseDecimalBR(row.lengthMeters);
  if (!row.lengthMeters || isNaN(len)) e.lengthMeters = 'Comprimento ausente';
  else if (len <= 0) e.lengthMeters = 'Comprimento deve ser maior que zero';
  else if (len > 50) e.lengthMeters = `Comprimento muito alto (${len}m, máx 50m)`;
  const wid = parseDecimalBR(row.widthMeters);
  if (!row.widthMeters || isNaN(wid)) e.widthMeters = 'Largura ausente';
  else if (wid <= 0) e.widthMeters = 'Largura deve ser maior que zero';
  else if (wid > 50) e.widthMeters = `Largura muito alta (${wid}m, máx 50m)`;
  if (row.heightMeters) {
    const h = parseDecimalBR(row.heightMeters);
    if (isNaN(h)) e.heightMeters = 'Altura inválida';
    else if (h <= 0) e.heightMeters = 'Altura deve ser maior que zero';
    else if (h > 50) e.heightMeters = `Altura muito alta (${h}m, máx 50m)`;
  }
  return e;
}

// Lista achatada de erros (uma entrada por campo errado) — usada no painel navegável
interface FlatError {
  rowIdx: number;
  rowNumber: number; // 1-based para exibição
  field: RowField;
  fieldLabel: string;
  message: string;
  identifier: string; // para localização rápida na lista
  description: string;
}

function buildFlatErrors(rows: EditorRow[]): FlatError[] {
  const out: FlatError[] = [];
  rows.forEach((row, idx) => {
    Object.entries(row.errors).forEach(([field, message]) => {
      if (!message) return;
      out.push({
        rowIdx: idx,
        rowNumber: idx + 1,
        field: field as RowField,
        fieldLabel: FIELD_LABELS[field as RowField],
        message,
        identifier: row.identifier || '—',
        description: row.description || '(sem descrição)',
      });
    });
  });
  return out;
}

// ─── Mapeamento de cabeçalhos (CSV e Excel) ───────────────────────────────────

const HEADER_MAP: Record<string, ColKey | 'perigosa' | 'unitizador' | 'skip'> = {
  'descrição':              'description',
  'descricao':              'description',
  'description':            'description',
  'código identificador':   'identifier',
  'codigo identificador':   'identifier',
  'código id':              'identifier',
  'cod. id':                'identifier',
  'identifier':             'identifier',
  'carga perigosa?':        'perigosa',
  'carga perigosa':         'perigosa',
  'hazardous':              'perigosa',
  'categoria':              'category',
  'category':               'category',
  'origem':                 'origin',
  'origin':                 'origin',
  'destino':                'destination',
  'destination':            'destination',
  'quantidade':             'skip',
  'quantity':               'skip',
  'empresa':                'empresa',
  'empresa proprietária':   'empresa',
  'empresa proprietaria':   'empresa',
  'company':                'empresa',
  'company name':           'empresa',
  'razão social':           'empresa',
  'razao social':           'empresa',
  'cliente':                'empresa',
  'owner':                  'empresa',
  'peso (t)':               'weightTonnes',
  'peso(t)':                'weightTonnes',
  'peso':                   'weightTonnes',
  'weight (t)':             'weightTonnes',
  'comprimento (m)':        'lengthMeters',
  'comprimento(m)':         'lengthMeters',
  'comprimento':            'lengthMeters',
  'length (m)':             'lengthMeters',
  'largura (m)':            'widthMeters',
  'largura(m)':             'widthMeters',
  'largura':                'widthMeters',
  'width (m)':              'widthMeters',
  'altura (m)':             'heightMeters',
  'altura(m)':              'heightMeters',
  'altura':                 'heightMeters',
  'height (m)':             'heightMeters',
  'unitizador':             'unitizador',
  'unitizadora':            'unitizador',
  'modal unitizador':       'unitizador',
  'modal unitizadora':      'unitizador',
  'carries items':          'unitizador',
  'holds items':            'unitizador',
};

// Converte array de arrays (headers + data) em EditorRow[]
function sheetDataToRows(data: string[][]): EditorRow[] {
  if (data.length < 2) return [];
  const headers = data[0].map(h => String(h ?? '').trim().toLowerCase());
  const colMap: (ColKey | 'perigosa' | 'unitizador' | 'skip' | null)[] = headers.map(h => HEADER_MAP[h] ?? null);

  const rows: EditorRow[] = [];
  for (let i = 1; i < data.length; i++) {
    const cells = data[i].map(c => String(c ?? '').trim());
    if (cells.every(c => !c)) continue;
    const obj: Record<string, string> = {};
    colMap.forEach((key, idx) => { if (key && key !== 'skip') obj[key] = cells[idx] ?? ''; });

    const cat = parseCsvCategory(obj['category'] ?? '', obj['perigosa'] ?? '');
    const isHaz = (obj['perigosa'] ?? '').trim().toUpperCase() === 'SIM' || cat === 'HAZARDOUS';
    const holds = parseUnitizadorCell(obj['unitizador'] ?? '');
    rows.push({
      id: mkId(),
      category: cat,
      description: obj['description'] ?? '',
      identifier: obj['identifier'] ?? '',
      empresa: obj['empresa'] ?? '',
      origin: obj['origin'] ?? '',
      destination: obj['destination'] ?? '',
      weightTonnes: (obj['weightTonnes'] ?? '').replace(',', '.'),
      lengthMeters: (obj['lengthMeters'] ?? '').replace(',', '.'),
      widthMeters:  (obj['widthMeters']  ?? '').replace(',', '.'),
      heightMeters: (obj['heightMeters'] ?? '').replace(',', '.'),
      isHazardous: isHaz,
      holdsItems: holds,
      errors: {},
    });
  }
  return rows;
}

// ─── Parser CSV ───────────────────────────────────────────────────────────────

function parseCsvToRows(text: string): EditorRow[] {
  return sheetDataToRows(parseCsvToMatrix(text));
}

async function parseExcelToRows(buffer: ArrayBuffer): Promise<EditorRow[]> {
  return sheetDataToRows(await parseExcelToMatrix(buffer));
}

// ─── Células ──────────────────────────────────────────────────────────────────

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
    if (e.key === 'Tab') { e.preventDefault(); onTab(rowIdx, colIdx, e.shiftKey); }
  };
  return (
    <div className="relative group h-full">
      <input
        type={numeric ? 'number' : 'text'}
        value={value}
        step={numeric ? '0.001' : undefined}
        min={numeric ? '0' : undefined}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(rowIdx, field, e.target.value)}
        onKeyDown={handleKey}
        data-row={rowIdx}
        data-col={colIdx}
        title={error}
        className={`w-full h-full px-2.5 bg-transparent text-[12px] outline-none transition-colors
          ${error ? 'border-2 border-status-error bg-status-error/10 text-status-error pr-7' : 'text-primary border-0 focus:bg-brand-primary/5 focus:border focus:border-brand-primary/40'}`}
        placeholder={numeric ? '0.000' : '—'}
      />
      {/* Indicador permanente de erro (✕ pulsante à direita) */}
      {error && (
        <span
          className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-status-error text-white text-[9px] font-black flex items-center justify-center shadow-md animate-pulse"
          aria-label={error}
        >
          !
        </span>
      )}
      {/* Tooltip de erro — visível em focus E hover (group-hover) */}
      {error && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-status-error text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg pointer-events-none opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity max-w-[280px] whitespace-normal">
          {error}
        </div>
      )}
    </div>
  );
}

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
    if (e.key === 'Tab') { e.preventDefault(); onTab(rowIdx, colIdx, e.shiftKey); }
  };
  return (
    <div className="relative group h-full flex items-center">
      {cat && <span className="absolute left-2 w-2 h-2 rounded-full shrink-0 pointer-events-none" style={{ backgroundColor: cat.color }} />}
      <select
        value={value}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(rowIdx, 'category', e.target.value)}
        onKeyDown={handleKey}
        data-row={rowIdx}
        data-col={colIdx}
        title={error}
        className={`w-full h-full pl-6 pr-7 bg-transparent text-[12px] outline-none cursor-pointer appearance-none transition-colors
          ${error ? 'border-2 border-status-error bg-status-error/10 text-status-error' : 'text-primary border-0 focus:bg-brand-primary/5 focus:border focus:border-brand-primary/40'}`}
      >
        <option value="">— Selecione —</option>
        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
      {error && (
        <>
          <span
            className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-status-error text-white text-[9px] font-black flex items-center justify-center shadow-md animate-pulse"
            aria-label={error}
          >
            !
          </span>
          <div className="absolute left-0 top-full mt-1 z-50 bg-status-error text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-lg pointer-events-none opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity max-w-[280px]">
            {error}
          </div>
        </>
      )}
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

// Ordem das colunas no grid (espelha a planilha CSV)
// Categoria | Descrição | Cód.ID | Origem | Destino | Peso | Comp | Larg | Alt
function GridRow({ row, rowIdx, onChange, onDelete, onTab }: RowProps) {
  const errorCount = Object.keys(row.errors).length;
  const hasError = errorCount > 0;
  return (
    <tr
      data-row-idx={rowIdx}
      className={`border-b border-subtle/40 hover:bg-brand-primary/[0.03] group/row transition-colors ${hasError ? 'bg-status-error/5' : ''}`}
    >
      {/* # da linha — número em vermelho + ponto pulsante quando há erro */}
      <td
        className={`sticky left-0 bg-sidebar border-r-2 text-center w-9 shrink-0 ${hasError ? 'border-r-status-error' : 'border-subtle/40'}`}
        title={hasError ? `${errorCount} erro(s) nesta linha` : undefined}
      >
        <div className="flex flex-col items-center justify-center gap-0.5">
          <span className={`text-[10px] font-black ${hasError ? 'text-status-error' : 'text-muted'}`}>{rowIdx + 1}</span>
          {hasError && (
            <span className="w-1.5 h-1.5 rounded-full bg-status-error animate-pulse" />
          )}
        </div>
      </td>
      {/* Categoria — col 0 */}
      <td className="border-r border-subtle/30 h-9" style={{ width: 140, minWidth: 140 }}>
        <CategoryCell value={row.category} rowIdx={rowIdx} colIdx={0} error={row.errors.category} onChange={onChange} onTab={onTab} />
      </td>
      {/* Descrição — col 1 */}
      <td className="border-r border-subtle/30 h-9" style={{ width: 240, minWidth: 180 }}>
        <TextCell value={row.description} field="description" rowIdx={rowIdx} colIdx={1} error={row.errors.description} onChange={onChange} onTab={onTab} />
      </td>
      {/* Cód. ID — col 2 */}
      <td className="border-r border-subtle/30 h-9" style={{ width: 148, minWidth: 120 }}>
        <TextCell value={row.identifier} field="identifier" rowIdx={rowIdx} colIdx={2} error={row.errors.identifier} onChange={onChange} onTab={onTab} />
      </td>
      {/* Empresa — col 3 (opcional) */}
      <td className="border-r border-subtle/30 h-9" style={{ width: 160, minWidth: 120 }}>
        <TextCell value={row.empresa} field="empresa" rowIdx={rowIdx} colIdx={3} onChange={onChange} onTab={onTab} />
      </td>
      {/* Origem — col 4 */}
      <td className="border-r border-subtle/30 h-9" style={{ width: 100, minWidth: 80 }}>
        <TextCell value={row.origin} field="origin" rowIdx={rowIdx} colIdx={4} onChange={onChange} onTab={onTab} />
      </td>
      {/* Destino — col 5 */}
      <td className="border-r border-subtle/30 h-9" style={{ width: 100, minWidth: 80 }}>
        <TextCell value={row.destination} field="destination" rowIdx={rowIdx} colIdx={5} onChange={onChange} onTab={onTab} />
      </td>
      {/* Peso (t) — col 6 */}
      <td className="border-r border-subtle/30 h-9" style={{ width: 90, minWidth: 72 }}>
        <TextCell value={row.weightTonnes} field="weightTonnes" rowIdx={rowIdx} colIdx={6} error={row.errors.weightTonnes} numeric onChange={onChange} onTab={onTab} />
      </td>
      {/* Comp (m) — col 7 */}
      <td className="border-r border-subtle/30 h-9" style={{ width: 90, minWidth: 72 }}>
        <TextCell value={row.lengthMeters} field="lengthMeters" rowIdx={rowIdx} colIdx={7} error={row.errors.lengthMeters} numeric onChange={onChange} onTab={onTab} />
      </td>
      {/* Larg (m) — col 8 */}
      <td className="border-r border-subtle/30 h-9" style={{ width: 90, minWidth: 72 }}>
        <TextCell value={row.widthMeters} field="widthMeters" rowIdx={rowIdx} colIdx={8} error={row.errors.widthMeters} numeric onChange={onChange} onTab={onTab} />
      </td>
      {/* Alt (m) — col 9 */}
      <td className="h-9" style={{ width: 90, minWidth: 72 }}>
        <TextCell value={row.heightMeters} field="heightMeters" rowIdx={rowIdx} colIdx={9} error={row.errors.heightMeters} numeric onChange={onChange} onTab={onTab} />
      </td>
      {/* Delete */}
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

// ─── Download do template Excel ───────────────────────────────────────────────

const TEMPLATE_HEADERS = [
  'Descrição',
  'Código identificador',
  'Empresa',
  'Carga Perigosa?',
  'Categoria',
  'Origem',
  'Destino',
  'Quantidade',
  'Peso (t)',
  'Comprimento (m)',
  'Largura (m)',
  'Altura (m)',
];

const TEMPLATE_HINTS = [
  'Ex: CONTAINER HWOC 000030 ESL AC10/163',
  'Ex: HWOC 000030',
  'Empresa proprietária do material (opcional). Ex: Petrobras',
  'SIM ou NÃO',
  'CONTAINER | BASKET | GENERAL | EQUIPMENT | TUBULAR | HAZARDOUS | HEAVY | FRAGILE | OTHER',
  'Ex: PACU',
  'Ex: NS44',
  '1 (sempre)',
  'Ex: 7.50',
  'Ex: 6.05',
  'Ex: 2.43',
  'Ex: 2.59',
];

const TEMPLATE_EXAMPLE = [
  'CONTAINER U2 JF 0158 ESL 286-241',
  'U2 JF 0158',
  'Petrobras',
  'NÃO',
  'CONTAINER',
  'PACU',
  'NS45',
  '1',
  '7.5',
  '6.05',
  '2.43',
  '2.59',
];

async function downloadTemplate() {
  // Gera CSV como fallback — também funciona sem SheetJS
  const buildCsv = () => {
    const sep = ';';
    const rows = [TEMPLATE_HEADERS, TEMPLATE_HINTS, TEMPLATE_EXAMPLE];
    return rows.map(r => r.map(c => `"${c}"`).join(sep)).join('\r\n');
  };

  try {
    const XLSX = await loadXlsx();

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_HINTS, TEMPLATE_EXAMPLE]);

    // Larguras de coluna (12 colunas: descrição, id, empresa, perigosa,
    // categoria, origem, destino, qtd, peso, comp, larg, alt).
    ws['!cols'] = [
      { wch: 50 }, { wch: 24 }, { wch: 24 }, { wch: 14 }, { wch: 52 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 14 }, { wch: 12 }, { wch: 12 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Plano de Carga');
    XLSX.writeFile(wb, 'CargoDeck_Modelo_Plano_de_Carga.xlsx');
  } catch {
    // Fallback: download como CSV
    const csv = buildCsv();
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CargoDeck_Modelo_Plano_de_Carga.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface Props { isOpen: boolean; onClose: () => void }

export function CargoEditorModal({ isOpen, onClose }: Props) {
  const [rows, setRows] = useState<EditorRow[]>([emptyRow()]);
  const [validated, setValidated] = useState(false);
  const [showErrorPanel, setShowErrorPanel] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);
  const titleId = useId();
  const containerRef = useFocusTrap<HTMLDivElement>({ isActive: isOpen, onEscape: onClose });
  const fileImportRef = useRef<HTMLInputElement>(null);

  const { setExtractedCargoes } = useCargoStore();
  const { notify } = useNotificationStore();

  const handleClose = () => {
    setRows([emptyRow()]);
    setValidated(false);
    onClose();
  };

  const addRow = useCallback(() => {
    setRows(prev => {
      const next = [...prev, emptyRow()];
      const newIdx = next.length - 1;
      setTimeout(() => {
        const inputs = tableRef.current?.querySelectorAll<HTMLElement>('[data-row]');
        if (!inputs) return;
        const target = Array.from(inputs).find(el => el.dataset.row === String(newIdx) && el.dataset.col === '0');
        target?.focus();
      }, 50);
      return next;
    });
  }, []);

  const deleteRow = useCallback((idx: number) => {
    setRows(prev => prev.length === 1 ? [emptyRow()] : prev.filter((_, i) => i !== idx));
  }, []);

  const handleChange = useCallback((rowIdx: number, field: ColKey, value: string) => {
    setRows(prev => {
      const updated = [...prev];
      const row = { ...updated[rowIdx], [field]: value };
      // Re-valida em tempo real assim que a planilha foi importada (validated=true)
      // ou após o usuário ter clicado em "Gerar" pelo menos uma vez.
      row.errors = validated ? validateRow(row) : {};
      updated[rowIdx] = row;
      return updated;
    });
  }, [validated]);

  // Foca a primeira célula com erro de uma linha (campo específico)
  const focusErrorCell = useCallback((rowIdx: number, field: RowField) => {
    // Mapa de campos para colIdx no DOM (ordem definida em GridRow):
    //  category=0, description=1, identifier=2, empresa=3, origin=4,
    //  destination=5, weightTonnes=6, lengthMeters=7, widthMeters=8,
    //  heightMeters=9
    const colMap: Record<RowField, number> = {
      category: 0, description: 1, identifier: 2,
      weightTonnes: 6, lengthMeters: 7, widthMeters: 8, heightMeters: 9,
    };
    const colIdx = colMap[field];
    setTimeout(() => {
      const inputs = tableRef.current?.querySelectorAll<HTMLElement>('[data-row]');
      if (!inputs) return;
      const target = Array.from(inputs).find(el => el.dataset.row === String(rowIdx) && el.dataset.col === String(colIdx));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.focus();
      }
    }, 50);
  }, []);

  const handleTab = useCallback((rowIdx: number, colIdx: number, shift: boolean) => {
    const totalCols = 10; // category, description, identifier, empresa, origin, destination, weight, length, width, height
    let nextRow = rowIdx;
    let nextCol = colIdx + (shift ? -1 : 1);
    if (nextCol >= totalCols) { nextCol = 0; nextRow = rowIdx + 1; if (nextRow >= rows.length) setRows(prev => [...prev, emptyRow()]); }
    else if (nextCol < 0) { nextCol = totalCols - 1; nextRow = rowIdx - 1; if (nextRow < 0) return; }
    setTimeout(() => {
      const inputs = tableRef.current?.querySelectorAll<HTMLElement>('[data-row]');
      if (!inputs) return;
      const target = Array.from(inputs).find(el => el.dataset.row === String(nextRow) && el.dataset.col === String(nextCol));
      target?.focus();
    }, 30);
  }, [rows.length]);

  // ─── Importar planilha (CSV ou Excel) ─────────────────────────────────────

  const handleFileImport = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const isExcel = /\.(xlsx|xls|xlsm)$/i.test(file.name);

    // Helper para aplicar validação automática a todas as linhas após import
    const applyImported = (parsed: EditorRow[], origem: 'Excel' | 'CSV') => {
      const validatedRows = parsed.map(r => ({ ...r, errors: validateRow(r) }));
      const errorCount = validatedRows.filter(r => Object.keys(r.errors).length > 0).length;
      setRows(validatedRows);
      setValidated(true); // habilita validação em tempo real para edições subsequentes
      if (errorCount > 0) {
        notify(`${parsed.length} linha(s) importada(s) do ${origem} — ${errorCount} linha(s) com erro detectado(s). Clique em "${errorCount} ERRO${errorCount !== 1 ? 'S' : ''}" para revisar.`, 'warning', 6000);
      } else {
        notify(`${parsed.length} linha(s) importada(s) do ${origem} sem erros.`, 'success');
      }
    };

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const buffer = ev.target?.result as ArrayBuffer;
          const parsed = await parseExcelToRows(buffer);
          if (parsed.length === 0) {
            notify('Nenhuma linha válida encontrada na planilha.', 'error');
            reportException(new Error('Planilha sem dados válidos'), {
              title: 'Falha ao importar Excel',
              category: 'import',
              severity: 'warning',
              source: 'cargo-editor-excel',
              suggestion: 'Confirme que a primeira linha contém os cabeçalhos corretos (Categoria, Descrição, Código identificador, etc.) e que há ao menos uma linha de dados.',
            });
            return;
          }
          applyImported(parsed, 'Excel');
        } catch (err) {
          notify(err instanceof Error ? err.message : 'Erro ao ler arquivo Excel.', 'error');
          reportException(err, {
            title: 'Falha ao processar planilha Excel',
            category: 'import',
            severity: 'error',
            source: 'cargo-editor-excel',
            suggestion: 'Verifique se o arquivo é .xlsx válido. Se persistir, baixe o template oficial pelo botão "Modelo" e copie seus dados para ele.',
          });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const text = ev.target?.result as string;
          if (!text) return;
          const parsed = parseCsvToRows(text);
          if (parsed.length === 0) {
            notify('Nenhuma linha válida encontrada no CSV.', 'error');
            reportException(new Error('CSV sem dados válidos'), {
              title: 'Falha ao importar CSV',
              category: 'import',
              severity: 'warning',
              source: 'cargo-editor-csv',
              suggestion: 'Confirme o separador (; ou ,) e os cabeçalhos. Salve o arquivo com codificação UTF-8.',
            });
            return;
          }
          applyImported(parsed, 'CSV');
        } catch (err) {
          notify(err instanceof Error ? err.message : 'Erro ao ler CSV.', 'error');
          reportException(err, {
            title: 'Falha ao processar CSV',
            category: 'import',
            severity: 'error',
            source: 'cargo-editor-csv',
            suggestion: 'Salve o arquivo com codificação UTF-8 e separador ponto-e-vírgula (padrão BR).',
          });
        }
      };
      reader.readAsText(file, 'UTF-8');
    }
  }, [notify]);

  // ─── Gerar cargas ───────────────────────────────────────────────────────────

  const handleGenerate = () => {
    const withErrors = rows.map(row => ({ ...row, errors: validateRow(row) }));
    setValidated(true);
    setRows(withErrors);
    const hasErrors = withErrors.some(r => Object.keys(r.errors).length > 0);
    if (hasErrors) {
      const totalErrCount = withErrors.filter(r => Object.keys(r.errors).length > 0).length;
      notify(`${totalErrCount} linha(s) com erro. Clique no botão vermelho "ERROS" no topo para revisar.`, 'error', 6000);
      // Auto-scroll para a primeira linha com erro
      const firstErrorIdx = withErrors.findIndex(r => Object.keys(r.errors).length > 0);
      if (firstErrorIdx >= 0) {
        const firstField = Object.keys(withErrors[firstErrorIdx].errors)[0] as RowField;
        setTimeout(() => {
          // foca a célula do primeiro erro (a função focusErrorCell já faz scroll)
          const colMap: Record<RowField, number> = {
            category: 0, description: 1, identifier: 2,
            weightTonnes: 6, lengthMeters: 7, widthMeters: 8, heightMeters: 9,
          };
          const colIdx = colMap[firstField];
          const inputs = tableRef.current?.querySelectorAll<HTMLElement>('[data-row]');
          if (!inputs) return;
          const target = Array.from(inputs).find(el => el.dataset.row === String(firstErrorIdx) && el.dataset.col === String(colIdx));
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.focus();
          }
        }, 100);
        // Também abre o painel de erros automaticamente
        setShowErrorPanel(true);
      }
      return;
    }
    const cargoes: Cargo[] = withErrors.map(row => {
      const isHaz = row.isHazardous || row.category === 'HAZARDOUS';
      return {
        id: crypto.randomUUID(),
        identifier: row.identifier.trim(),
        description: row.description.trim(),
        category: (isHaz ? 'HAZARDOUS' : row.category) as CargoCategory,
        weightTonnes: parseDecimalBR(row.weightTonnes),
        lengthMeters: parseDecimalBR(row.lengthMeters),
        widthMeters: parseDecimalBR(row.widthMeters),
        heightMeters: row.heightMeters ? parseDecimalBR(row.heightMeters) : undefined,
        quantity: 1,
        status: 'UNALLOCATED',
        isHazardous: isHaz,
        color: isHaz ? '#a855f7' : (row.category ? (CATEGORY_MAP[row.category as CargoCategory]?.color ?? '#3b82f6') : '#3b82f6'),
        format: 'Retangular',
        origemCarga: row.origin.trim() || undefined,
        destinoCarga: row.destination.trim() || undefined,
        holdsItems: row.holdsItems,
        empresa: row.empresa.trim() || undefined,
      };
    });
    setExtractedCargoes(cargoes);
    notify(`${cargoes.length} carga${cargoes.length !== 1 ? 's' : ''} adicionada${cargoes.length !== 1 ? 's' : ''} ao inventário!`, 'success');
    handleClose();
  };

  const totalWeight = rows.reduce((s, r) => s + (parseDecimalBR(r.weightTonnes) || 0), 0);
  const filledRows = rows.filter(r => r.identifier || r.description).length;
  const errorCount = validated ? rows.filter(r => Object.keys(r.errors).length > 0).length : 0;
  // Lista achatada de erros para o painel navegável (uma entrada por campo errado)
  const flatErrors = validated ? buildFlatErrors(rows) : [];

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 font-sans">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-main border-2 border-subtle rounded-[2rem] w-full max-w-[1280px] shadow-high relative flex flex-col"
        style={{ height: 'min(90vh, 740px)' }}
      >

        {/* Accent */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-primary via-indigo-500 to-brand-primary rounded-t-[2rem] z-10" />

        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-subtle shrink-0 flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
            <Table2 size={20} className="text-brand-primary" />
          </div>
          <div>
            <h2 id={titleId} className="text-lg font-black text-primary tracking-tighter uppercase leading-none">Editor de Cargas em Grade</h2>
            <p className="text-[9px] font-black text-secondary uppercase tracking-[0.3em] opacity-80 mt-0.5">Entrada em massa · Estilo planilha · TAB para navegar</p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Badge clicável de erros — abre painel navegável */}
            {errorCount > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowErrorPanel(s => !s)}
                  title="Clique para ver e navegar pelos erros"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 transition-all min-h-[36px] ${
                    showErrorPanel
                      ? 'bg-status-error text-white border-status-error shadow-md'
                      : 'bg-status-error/10 text-status-error border-status-error/30 hover:bg-status-error/20'
                  }`}
                >
                  <AlertCircle size={12} className="animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{errorCount} erro{errorCount !== 1 ? 's' : ''}</span>
                  <ChevronDown size={11} className={`transition-transform ${showErrorPanel ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown navegável de erros */}
                {showErrorPanel && (
                  <div className="absolute top-full mt-2 right-0 z-50 w-[440px] max-w-[90vw] bg-main border-2 border-status-error/40 rounded-2xl shadow-high overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 bg-status-error/10 border-b-2 border-status-error/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={14} className="text-status-error" />
                        <span className="text-[11px] font-black text-status-error uppercase tracking-widest">
                          {flatErrors.length} problema{flatErrors.length !== 1 ? 's' : ''} em {errorCount} linha{errorCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <button
                        onClick={() => setShowErrorPanel(false)}
                        className="p-1 rounded-md hover:bg-status-error/20 text-status-error transition-colors"
                        title="Fechar"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto p-2 space-y-1.5">
                      {flatErrors.slice(0, 100).map((err, i) => (
                        <button
                          key={`${err.rowIdx}-${err.field}-${i}`}
                          onClick={() => {
                            focusErrorCell(err.rowIdx, err.field);
                            setShowErrorPanel(false);
                          }}
                          className="w-full text-left px-3 py-2 bg-sidebar/40 hover:bg-status-error/10 border border-subtle hover:border-status-error/40 rounded-xl transition-all group/err flex items-start gap-3"
                        >
                          <div className="flex flex-col items-center justify-center w-9 shrink-0 pt-0.5">
                            <span className="text-[10px] font-black text-muted">LINHA</span>
                            <span className="text-sm font-mono font-black text-status-error">{err.rowNumber}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-status-error/15 text-status-error">
                                {err.fieldLabel}
                              </span>
                              {err.identifier !== '—' && (
                                <span className="text-[10px] font-mono text-muted truncate">{err.identifier}</span>
                              )}
                            </div>
                            <p className="text-[11px] text-primary font-bold leading-snug">{err.message}</p>
                            <p className="text-[10px] text-muted mt-0.5 truncate group-hover/err:text-secondary transition-colors">
                              {err.description}
                            </p>
                          </div>
                          <ArrowRight size={12} className="text-muted opacity-0 group-hover/err:opacity-100 group-hover/err:translate-x-0.5 transition-all mt-2 shrink-0" />
                        </button>
                      ))}
                      {flatErrors.length > 100 && (
                        <p className="text-center text-[10px] text-muted font-bold py-2">+ {flatErrors.length - 100} erro(s) adicionais</p>
                      )}
                    </div>
                    <div className="px-4 py-2 bg-sidebar border-t border-subtle flex items-center justify-between gap-2">
                      <p className="text-[9px] text-muted font-bold">
                        Clique em um item para ir até a célula
                      </p>
                      {flatErrors.length > 0 && (
                        <button
                          onClick={() => { focusErrorCell(flatErrors[0].rowIdx, flatErrors[0].field); setShowErrorPanel(false); }}
                          className="text-[10px] font-black text-status-error hover:underline uppercase tracking-widest"
                        >
                          Ir ao primeiro →
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Botão baixar planilha modelo */}
            <div className="relative group/dl">
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-sidebar border-2 border-subtle hover:border-indigo-400/60 text-secondary hover:text-indigo-400 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
                title="Baixar planilha modelo"
              >
                <Download size={14} />
                Modelo
              </button>
              {/* Tooltip explicativo */}
              <div className="pointer-events-none absolute right-0 top-full mt-2 z-50 w-64 opacity-0 group-hover/dl:opacity-100 transition-opacity duration-200">
                <div className="bg-[#1e1e2e] border border-indigo-400/30 rounded-2xl px-4 py-3 shadow-xl">
                  <p className="text-[11px] font-black text-indigo-300 uppercase tracking-widest mb-1">Planilha Modelo</p>
                  <p className="text-[11px] text-secondary leading-relaxed">
                    Baixe nossa planilha modelo, insira os dados de cada carga nas colunas indicadas e faça o upload para extração automática.
                  </p>
                  <p className="text-[10px] text-muted mt-2 font-bold">Formato .xlsx ou .csv</p>
                </div>
              </div>
            </div>

            {/* Botão importar planilha */}
            <button
              onClick={() => fileImportRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-sidebar border-2 border-subtle hover:border-brand-primary/50 text-secondary hover:text-brand-primary rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
              title="Importar Plano de Cargas (.xlsx, .csv)"
            >
              <Upload size={14} />
              Importar Plano de Cargas
            </button>
            <input ref={fileImportRef} type="file" accept=".xlsx,.xls,.xlsm,.csv,.txt" className="hidden" onChange={handleFileImport} />

            {filledRows > 0 && (
              <div className="flex items-center gap-3 text-[10px] font-black text-secondary uppercase tracking-widest">
                <span>{filledRows} linha{filledRows !== 1 ? 's' : ''}</span>
                {totalWeight > 0 && <span className="text-brand-primary">{totalWeight.toFixed(2)} t</span>}
              </div>
            )}
            <button onClick={handleClose} className="p-2 hover:bg-sidebar rounded-xl text-muted hover:text-primary transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto">
          <table ref={tableRef} className="w-full border-collapse text-left" style={{ minWidth: 1180 }}>
            <thead className="sticky top-0 z-20 bg-sidebar border-b-2 border-subtle">
              <tr>
                <th className="sticky left-0 bg-sidebar border-r border-subtle/40 w-9 px-2 py-2.5 text-[9px] font-black text-muted uppercase tracking-widest text-center">#</th>
                <th className="border-r border-subtle/30 px-3 py-2.5 text-[9px] font-black text-muted uppercase tracking-widest" style={{ width: 140 }}>Categoria</th>
                <th className="border-r border-subtle/30 px-3 py-2.5 text-[9px] font-black text-muted uppercase tracking-widest" style={{ width: 240 }}>Descrição</th>
                <th className="border-r border-subtle/30 px-3 py-2.5 text-[9px] font-black text-muted uppercase tracking-widest" style={{ width: 148 }}>Cód. Identificador</th>
                <th className="border-r border-subtle/30 px-3 py-2.5 text-[9px] font-black text-muted uppercase tracking-widest" style={{ width: 160 }}>Empresa</th>
                <th className="border-r border-subtle/30 px-3 py-2.5 text-[9px] font-black text-muted uppercase tracking-widest" style={{ width: 100 }}>Origem</th>
                <th className="border-r border-subtle/30 px-3 py-2.5 text-[9px] font-black text-muted uppercase tracking-widest" style={{ width: 100 }}>Destino</th>
                <th className="border-r border-subtle/30 px-3 py-2.5 text-[9px] font-black text-muted uppercase tracking-widest text-center" style={{ width: 90 }}>Peso (t)</th>
                <th className="border-r border-subtle/30 px-3 py-2.5 text-[9px] font-black text-muted uppercase tracking-widest text-center" style={{ width: 90 }}>Comp. (m)</th>
                <th className="border-r border-subtle/30 px-3 py-2.5 text-[9px] font-black text-muted uppercase tracking-widest text-center" style={{ width: 90 }}>Larg. (m)</th>
                <th className="px-3 py-2.5 text-[9px] font-black text-muted uppercase tracking-widest text-center" style={{ width: 90 }}>Alt. (m)</th>
                <th className="sticky right-0 bg-sidebar border-l border-subtle/40 w-8" />
              </tr>
            </thead>
            <tbody className="bg-main">
              {rows.map((row, idx) => (
                <GridRow key={row.id} row={row} rowIdx={idx} onChange={handleChange} onDelete={deleteRow} onTab={handleTab} />
              ))}
              <tr className="border-b border-subtle/20">
                <td colSpan={12} className="py-1.5 px-12">
                  <button onClick={addRow} className="flex items-center gap-2 text-[11px] font-black text-muted hover:text-brand-primary transition-colors uppercase tracking-widest py-1">
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
            {totalWeight > 0 && <span className="text-brand-primary">Peso total: {totalWeight.toFixed(3)} t</span>}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={addRow} className="flex items-center gap-2 px-5 py-2.5 bg-main border-2 border-subtle hover:border-brand-primary/40 text-primary rounded-xl text-xs font-black uppercase tracking-widest transition-all">
              <Plus size={14} />
              Linha
            </button>
            <button onClick={handleClose} className="px-5 py-2.5 rounded-xl text-xs font-black text-muted hover:text-primary hover:bg-main uppercase tracking-widest transition-all">
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
