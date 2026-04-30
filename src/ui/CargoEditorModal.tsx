import { useState, useRef, useCallback, useId, type KeyboardEvent, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, CheckCircle2, Table2, AlertCircle, Upload, Download } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useCargoStore } from '@/features/cargoStore';
import { useNotificationStore } from '@/features/notificationStore';
import type { Cargo, CargoCategory } from '@/domain/Cargo';

// ─── Tipos internos ────────────────────────────────────────────────────────────

interface EditorRow {
  id: string;
  category: CargoCategory | '';
  description: string;
  identifier: string;
  origin: string;
  destination: string;
  weightTonnes: string;
  lengthMeters: string;
  widthMeters: string;
  heightMeters: string;
  errors: Partial<Record<RowField, string>>;
}

// Campos obrigatórios para validação
type RowField = 'category' | 'description' | 'identifier' | 'weightTonnes' | 'lengthMeters' | 'widthMeters' | 'heightMeters';

// ColKey = todas as colunas editáveis (inclui origin/destination opcionais)
type ColKey = 'category' | 'description' | 'identifier' | 'origin' | 'destination' | 'weightTonnes' | 'lengthMeters' | 'widthMeters' | 'heightMeters';

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

// ─── Utilitários ──────────────────────────────────────────────────────────────

function mkId() { return Math.random().toString(36).slice(2, 9); }

function emptyRow(): EditorRow {
  return { id: mkId(), category: '', description: '', identifier: '', origin: '', destination: '', weightTonnes: '', lengthMeters: '', widthMeters: '', heightMeters: '', errors: {} };
}

// Converte decimal brasileiro (vírgula) para ponto
function parseDecimal(s: string): number {
  return parseFloat(s.replace(',', '.'));
}

// ─── Validação ────────────────────────────────────────────────────────────────

function validateRow(row: EditorRow): Partial<Record<RowField, string>> {
  const e: Partial<Record<RowField, string>> = {};
  if (!row.category) e.category = 'Selecione uma categoria';
  if (!row.description || row.description.trim().length < 2) e.description = 'Descrição obrigatória';
  if (!row.identifier || row.identifier.trim().length < 2) e.identifier = 'Código inválido (mín. 2 chars)';
  const wt = parseDecimal(row.weightTonnes);
  if (!row.weightTonnes || isNaN(wt) || wt <= 0 || wt > 500) e.weightTonnes = 'Peso inválido (0.1–500t)';
  const len = parseDecimal(row.lengthMeters);
  if (!row.lengthMeters || isNaN(len) || len <= 0 || len > 50) e.lengthMeters = 'Comp. inválido (0.1–50m)';
  const wid = parseDecimal(row.widthMeters);
  if (!row.widthMeters || isNaN(wid) || wid <= 0 || wid > 50) e.widthMeters = 'Larg. inválida (0.1–50m)';
  if (row.heightMeters) {
    const h = parseDecimal(row.heightMeters);
    if (isNaN(h) || h <= 0 || h > 50) e.heightMeters = 'Alt. inválida (0.1–50m)';
  }
  return e;
}

// ─── Mapeamento de cabeçalhos (CSV e Excel) ───────────────────────────────────

const HEADER_MAP: Record<string, ColKey | 'perigosa' | 'skip'> = {
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
  'empresa':                'skip',
  'company':                'skip',
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
};

// Converte array de arrays (headers + data) em EditorRow[]
function sheetDataToRows(data: string[][]): EditorRow[] {
  if (data.length < 2) return [];
  const headers = data[0].map(h => String(h ?? '').trim().toLowerCase());
  const colMap: (ColKey | 'perigosa' | 'skip' | null)[] = headers.map(h => HEADER_MAP[h] ?? null);

  const rows: EditorRow[] = [];
  for (let i = 1; i < data.length; i++) {
    const cells = data[i].map(c => String(c ?? '').trim());
    if (cells.every(c => !c)) continue;
    const obj: Record<string, string> = {};
    colMap.forEach((key, idx) => { if (key && key !== 'skip') obj[key] = cells[idx] ?? ''; });

    const cat = parseCsvCategory(obj['category'] ?? '', obj['perigosa'] ?? '');
    rows.push({
      id: mkId(),
      category: cat,
      description: obj['description'] ?? '',
      identifier: obj['identifier'] ?? '',
      origin: obj['origin'] ?? '',
      destination: obj['destination'] ?? '',
      weightTonnes: (obj['weightTonnes'] ?? '').replace(',', '.'),
      lengthMeters: (obj['lengthMeters'] ?? '').replace(',', '.'),
      widthMeters:  (obj['widthMeters']  ?? '').replace(',', '.'),
      heightMeters: (obj['heightMeters'] ?? '').replace(',', '.'),
      errors: {},
    });
  }
  return rows;
}

// ─── Parser CSV ───────────────────────────────────────────────────────────────

function parseCsvToRows(text: string): EditorRow[] {
  const sep = text.split('\n')[0].includes(';') ? ';' : ',';
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const data = lines.map(line => line.split(sep).map(c => c.replace(/^"|"$/g, '').trim()));
  return sheetDataToRows(data);
}

// ─── Parser XLSX nativo (ZIP + XML, sem CDN, sem npm) ────────────────────────

async function inflateRaw(compressed: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  // new ArrayBuffer() garante tipo ArrayBuffer (nunca ArrayBufferLike/SharedArrayBuffer).
  // TypeScript não estreita o generic <T> de Uint8Array via instanceof em .buffer,
  // portanto a única forma segura é copiar para um ArrayBuffer explicitamente tipado.
  const ab = new ArrayBuffer(compressed.byteLength);
  new Uint8Array(ab).set(compressed);
  writer.write(ab);
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = ds.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

async function readZipEntry(buf: ArrayBuffer, target: string): Promise<string | null> {
  const bytes = new Uint8Array(buf);
  const dv = new DataView(buf);
  const dec = new TextDecoder();

  // Localizar EOCD (End of Central Directory)
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_556); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return null;

  const cdOffset = dv.getUint32(eocd + 16, true);
  const cdCount  = dv.getUint16(eocd + 8,  true);
  let pos = cdOffset;

  for (let e = 0; e < cdCount; e++) {
    if (dv.getUint32(pos, true) !== 0x02014b50) break;
    const method     = dv.getUint16(pos + 10, true);
    const compSize   = dv.getUint32(pos + 20, true);
    const nameLen    = dv.getUint16(pos + 28, true);
    const extraLen   = dv.getUint16(pos + 30, true);
    const commentLen = dv.getUint16(pos + 32, true);
    const localOff   = dv.getUint32(pos + 42, true);
    const name       = dec.decode(bytes.slice(pos + 46, pos + 46 + nameLen));
    pos += 46 + nameLen + extraLen + commentLen;

    if (name !== target) continue;

    const lnLen = dv.getUint16(localOff + 26, true);
    const leLen = dv.getUint16(localOff + 28, true);
    const data  = bytes.slice(localOff + 30 + lnLen + leLen, localOff + 30 + lnLen + leLen + compSize);

    if (method === 0) return dec.decode(data);
    if (method === 8) return dec.decode(await inflateRaw(data));
    return null;
  }
  return null;
}

function colIndex(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
}

function xlsxSharedStrings(xml: string): string[] {
  return Array.from(new DOMParser().parseFromString(xml, 'text/xml').querySelectorAll('si'))
    .map(si => Array.from(si.querySelectorAll('t')).map(t => t.textContent ?? '').join(''));
}

function xlsxSheet(xml: string, strings: string[]): string[][] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const result: string[][] = [];
  for (const row of Array.from(doc.querySelectorAll('row'))) {
    const cells: string[] = [];
    for (const c of Array.from(row.querySelectorAll('c'))) {
      const ref = c.getAttribute('r') ?? '';
      const idx = colIndex(ref.replace(/\d/g, ''));
      while (cells.length <= idx) cells.push('');
      const t = c.getAttribute('t');
      const v = c.querySelector('v')?.textContent ?? '';
      if (t === 's') cells[idx] = strings[parseInt(v)] ?? '';
      else if (t === 'inlineStr') cells[idx] = c.querySelector('t')?.textContent ?? '';
      else cells[idx] = v;
    }
    result.push(cells);
  }
  return result;
}

async function parseExcelNative(buffer: ArrayBuffer): Promise<EditorRow[]> {
  const ssXml = await readZipEntry(buffer, 'xl/sharedStrings.xml');
  const shXml  = await readZipEntry(buffer, 'xl/worksheets/sheet1.xml');
  if (!shXml) throw new Error('Planilha não encontrada no arquivo XLSX.');
  const strings = ssXml ? xlsxSharedStrings(ssXml) : [];
  return sheetDataToRows(xlsxSheet(shXml, strings));
}

// ─── SheetJS via CDN (fallback caso o parser nativo falhe) ───────────────────

interface XlsxSheet {
  '!cols'?: { wch: number }[];
  [key: string]: unknown;
}
interface XlsxWorkbook { SheetNames: string[]; Sheets: Record<string, XlsxSheet> }
interface XlsxLib {
  read: (data: ArrayBuffer, opts: { type: 'array' }) => XlsxWorkbook;
  writeFile: (wb: XlsxWorkbook, filename: string) => void;
  utils: {
    sheet_to_json: <T>(sheet: XlsxSheet, opts: { header: 1; defval: string }) => T[];
    book_new: () => XlsxWorkbook;
    book_append_sheet: (wb: XlsxWorkbook, ws: XlsxSheet, name: string) => void;
    aoa_to_sheet: (data: string[][]) => XlsxSheet;
  };
}

let xlsxLib: XlsxLib | null = null;
const XLSX_CDN_URLS = [
  'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
];

async function loadXlsx(): Promise<XlsxLib> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (xlsxLib || (window as any).XLSX) { xlsxLib = xlsxLib ?? (window as any).XLSX; return xlsxLib!; }
  for (const url of XLSX_CDN_URLS) {
    try {
      await new Promise<void>((res, rej) => {
        const s = document.createElement('script'); s.src = url;
        s.onload = () => res(); s.onerror = () => rej();
        document.head.appendChild(s);
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lib = (window as any).XLSX as XlsxLib | undefined;
      if (lib && typeof lib.read === 'function') { xlsxLib = lib; return lib; }
    } catch { /* try next */ }
  }
  throw new Error('SheetJS indisponível via CDN');
}

async function parseExcelToRows(buffer: ArrayBuffer): Promise<EditorRow[]> {
  // Tenta parser nativo primeiro — sem CDN, sem dependências
  try {
    return await parseExcelNative(buffer);
  } catch {
    // Fallback: SheetJS via CDN
    const XLSX = await loadXlsx();
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });
    return sheetDataToRows(data);
  }
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
        className={`w-full h-full px-2.5 bg-transparent text-[12px] text-primary outline-none transition-colors
          ${error ? 'border border-status-error/60 bg-status-error/5 text-status-error' : 'border-0 focus:bg-brand-primary/5 focus:border focus:border-brand-primary/40'}`}
        placeholder={numeric ? '0.000' : '—'}
      />
      {error && (
        <div className="absolute left-0 top-full mt-0.5 z-50 bg-status-error text-white text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap shadow-lg pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity">
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
    <div className="relative h-full flex items-center">
      {cat && <span className="absolute left-2 w-2 h-2 rounded-full shrink-0 pointer-events-none" style={{ backgroundColor: cat.color }} />}
      <select
        value={value}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(rowIdx, 'category', e.target.value)}
        onKeyDown={handleKey}
        data-row={rowIdx}
        data-col={colIdx}
        className={`w-full h-full pl-6 pr-2 bg-transparent text-[12px] text-primary outline-none cursor-pointer appearance-none
          ${error ? 'border border-status-error/60 bg-status-error/5 text-status-error' : 'border-0 focus:bg-brand-primary/5 focus:border focus:border-brand-primary/40'}`}
      >
        <option value="">— Selecione —</option>
        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
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

// Ordem das colunas no grid (espelha a planilha CSV)
// Categoria | Descrição | Cód.ID | Origem | Destino | Peso | Comp | Larg | Alt
function GridRow({ row, rowIdx, onChange, onDelete, onTab }: RowProps) {
  const hasError = Object.keys(row.errors).length > 0;
  return (
    <tr className={`border-b border-subtle/40 hover:bg-brand-primary/[0.03] group/row transition-colors ${hasError ? 'bg-status-error/[0.02]' : ''}`}>
      {/* # */}
      <td className="sticky left-0 bg-sidebar border-r border-subtle/40 text-center w-9 shrink-0">
        <span className="text-[10px] font-black text-muted">{rowIdx + 1}</span>
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
      {/* Origem — col 3 */}
      <td className="border-r border-subtle/30 h-9" style={{ width: 100, minWidth: 80 }}>
        <TextCell value={row.origin} field="origin" rowIdx={rowIdx} colIdx={3} onChange={onChange} onTab={onTab} />
      </td>
      {/* Destino — col 4 */}
      <td className="border-r border-subtle/30 h-9" style={{ width: 100, minWidth: 80 }}>
        <TextCell value={row.destination} field="destination" rowIdx={rowIdx} colIdx={4} onChange={onChange} onTab={onTab} />
      </td>
      {/* Peso (t) — col 5 */}
      <td className="border-r border-subtle/30 h-9" style={{ width: 90, minWidth: 72 }}>
        <TextCell value={row.weightTonnes} field="weightTonnes" rowIdx={rowIdx} colIdx={5} error={row.errors.weightTonnes} numeric onChange={onChange} onTab={onTab} />
      </td>
      {/* Comp (m) — col 6 */}
      <td className="border-r border-subtle/30 h-9" style={{ width: 90, minWidth: 72 }}>
        <TextCell value={row.lengthMeters} field="lengthMeters" rowIdx={rowIdx} colIdx={6} error={row.errors.lengthMeters} numeric onChange={onChange} onTab={onTab} />
      </td>
      {/* Larg (m) — col 7 */}
      <td className="border-r border-subtle/30 h-9" style={{ width: 90, minWidth: 72 }}>
        <TextCell value={row.widthMeters} field="widthMeters" rowIdx={rowIdx} colIdx={7} error={row.errors.widthMeters} numeric onChange={onChange} onTab={onTab} />
      </td>
      {/* Alt (m) — col 8 */}
      <td className="h-9" style={{ width: 90, minWidth: 72 }}>
        <TextCell value={row.heightMeters} field="heightMeters" rowIdx={rowIdx} colIdx={8} error={row.errors.heightMeters} numeric onChange={onChange} onTab={onTab} />
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

    // Larguras de coluna
    ws['!cols'] = [
      { wch: 50 }, { wch: 24 }, { wch: 14 }, { wch: 52 },
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
      row.errors = validated ? validateRow(row) : {};
      updated[rowIdx] = row;
      return updated;
    });
  }, [validated]);

  const handleTab = useCallback((rowIdx: number, colIdx: number, shift: boolean) => {
    const totalCols = 9;
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

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const buffer = ev.target?.result as ArrayBuffer;
          const parsed = await parseExcelToRows(buffer);
          if (parsed.length === 0) { notify('Nenhuma linha válida encontrada na planilha.', 'error'); return; }
          setRows(parsed);
          setValidated(false);
          notify(`${parsed.length} linha${parsed.length !== 1 ? 's' : ''} importada${parsed.length !== 1 ? 's' : ''} da planilha Excel.`, 'success');
        } catch (err) {
          notify(err instanceof Error ? err.message : 'Erro ao ler arquivo Excel.', 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (!text) return;
        const parsed = parseCsvToRows(text);
        if (parsed.length === 0) { notify('Nenhuma linha válida encontrada no CSV.', 'error'); return; }
        setRows(parsed);
        setValidated(false);
        notify(`${parsed.length} linha${parsed.length !== 1 ? 's' : ''} importada${parsed.length !== 1 ? 's' : ''} do arquivo CSV.`, 'success');
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
      notify('Corrija os campos destacados antes de importar.', 'error');
      return;
    }
    const cargoes: Cargo[] = withErrors.map(row => ({
      id: crypto.randomUUID(),
      identifier: row.identifier.trim(),
      description: row.description.trim(),
      category: row.category as CargoCategory,
      weightTonnes: parseDecimal(row.weightTonnes),
      lengthMeters: parseDecimal(row.lengthMeters),
      widthMeters: parseDecimal(row.widthMeters),
      heightMeters: row.heightMeters ? parseDecimal(row.heightMeters) : undefined,
      quantity: 1,
      status: 'UNALLOCATED',
      color: row.category ? (CATEGORY_MAP[row.category as CargoCategory]?.color ?? '#3b82f6') : '#3b82f6',
      format: 'Retangular',
      origemCarga: row.origin.trim() || undefined,
      destinoCarga: row.destination.trim() || undefined,
    }));
    setExtractedCargoes(cargoes);
    notify(`${cargoes.length} carga${cargoes.length !== 1 ? 's' : ''} adicionada${cargoes.length !== 1 ? 's' : ''} ao inventário!`, 'success');
    handleClose();
  };

  const totalWeight = rows.reduce((s, r) => s + (parseDecimal(r.weightTonnes) || 0), 0);
  const filledRows = rows.filter(r => r.identifier || r.description).length;
  const errorCount = validated ? rows.filter(r => Object.keys(r.errors).length > 0).length : 0;

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
            {errorCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-status-error/10 border border-status-error/30 rounded-xl">
                <AlertCircle size={12} className="text-status-error" />
                <span className="text-[10px] font-black text-status-error uppercase">{errorCount} erro{errorCount !== 1 ? 's' : ''}</span>
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
                <td colSpan={11} className="py-1.5 px-12">
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
