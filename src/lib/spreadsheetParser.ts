/**
 * @file Parser nativo de XLSX/CSV — sem dependências npm, sem CDN obrigatório.
 *
 * Reusado por:
 *  - src/ui/CargoEditorModal.tsx        (cargas offshore — 9 colunas)
 *  - src/ui/containers/ContainerInventoryModal.tsx (DANFE — 15 colunas)
 *
 * O parser XLSX nativo funciona via DecompressionStream (deflate-raw) +
 * DOMParser, lendo a estrutura ZIP+XML do arquivo manualmente. Em casos raros
 * (ex.: variantes de XLSX que dependem de escape específico), há fallback para
 * SheetJS via <script> CDN — não está em package.json e nunca é referenciado
 * por nome de módulo (lição #10).
 *
 * Os parsers retornam matrizes string[][] (linhas × células). O mapeamento
 * para tipos de domínio (EditorRow / ContainerItemImport) fica a cargo de
 * cada consumidor.
 */

/** Converte decimal brasileiro ("1.234,56") em number (1234.56). */
export function parseDecimalBR(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// ─── XLSX nativo: DecompressionStream + DOMParser ────────────────────────────

async function inflateRaw(compressed: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  // new ArrayBuffer() garante tipo ArrayBuffer (nunca ArrayBufferLike). Lição #11.
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

async function parseExcelNative(buffer: ArrayBuffer): Promise<string[][]> {
  const ssXml = await readZipEntry(buffer, 'xl/sharedStrings.xml');
  const shXml = await readZipEntry(buffer, 'xl/worksheets/sheet1.xml');
  if (!shXml) throw new Error('Planilha não encontrada no arquivo XLSX.');
  const strings = ssXml ? xlsxSharedStrings(ssXml) : [];
  return xlsxSheet(shXml, strings);
}

// ─── SheetJS via CDN (fallback) ──────────────────────────────────────────────
// Lição #10: nunca usar `typeof import('xlsx')` — pacote não está em
// package.json. Interface local + cast pontual é o único caminho seguro.

interface XlsxSheet {
  '!cols'?: { wch: number }[];
  [key: string]: unknown;
}
interface XlsxWorkbook {
  SheetNames: string[];
  Sheets: Record<string, XlsxSheet>;
}
export interface XlsxLib {
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

export async function loadXlsx(): Promise<XlsxLib> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (xlsxLib || (window as any).XLSX) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    xlsxLib = xlsxLib ?? (window as any).XLSX;
    return xlsxLib!;
  }
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

/**
 * Parse XLSX → matriz string[][]. Tenta nativo primeiro (sem rede); se falhar,
 * recorre a SheetJS via CDN.
 */
export async function parseExcelToMatrix(buffer: ArrayBuffer): Promise<string[][]> {
  try {
    return await parseExcelNative(buffer);
  } catch {
    const XLSX = await loadXlsx();
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });
  }
}

/**
 * Parse CSV → matriz string[][]. Detecta separador (;|,) na primeira linha,
 * remove aspas externas, ignora linhas vazias.
 */
export function parseCsvToMatrix(text: string): string[][] {
  const sep = text.split('\n')[0].includes(';') ? ';' : ',';
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  return lines.map(line => line.split(sep).map(c => c.replace(/^"|"$/g, '').trim()));
}
