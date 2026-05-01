/**
 * @file Parser DETERMINÍSTICO de DANFE — extração estrutural via pdfjs-dist
 * usando ATRIBUIÇÃO POSICIONAL POR X.
 *
 * Por que abordagem posicional (e não regex sobre texto reconstruído):
 * - O `pdfLoader.ts` carrega pdf.js v2.16.105 antiga, cujo `getTextContent`
 *   tem comportamento imprevisível ao agrupar fragmentos de células de tabela:
 *   às vezes preserva quebras de linha entre linhas continuação de descrição
 *   multi-linha, às vezes não.
 * - A versão regex anterior do parser (que olhava para a "cauda" do registro
 *   no texto reconstruído) perdia descrições multi-linha quando o pdf.js
 *   embaralhava fragmentos.
 * - Solução: trabalhar com cada text item raw + sua posição (x, y) original.
 *   Detectar a header row da tabela, usar X dos headers como boundaries de
 *   coluna, e atribuir cada fragment subsequente à coluna correta.
 *
 * Fluxo:
 * 1. Lê pdf.js → array de items por página com {str, x, y, width, page}.
 * 2. Localiza a header row da tabela ("DESCRIÇÃO", "NCM/SH", "QTDE", etc.)
 *    e usa as posições X desses headers como boundaries de coluna.
 * 3. Detecta a faixa Y da tabela (entre header e marcador de fim).
 * 4. Para cada Y row dentro da tabela, atribui cada item à coluna pela X.
 * 5. Linhas com NCM populado = item completo; linhas com apenas DESCRIÇÃO
 *    populada = continuação multi-linha do item anterior.
 */

import { parseDecimalBR } from '@/lib/spreadsheetParser';
import type { ContainerItemImport } from '@/domain/schemas/container.schema';
import type { DanfeHeader } from '@/domain/schemas/danfe.schema';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface PdfTextItem {
  str?: string;
  width?: number;
  transform?: number[]; // [a, b, c, d, e, f] onde e=X, f=Y
}

interface PdfTextContent { items: PdfTextItem[] }
interface PdfPage { getTextContent(): Promise<PdfTextContent> }
interface PdfDocument { numPages: number; getPage(n: number): Promise<PdfPage> }
interface PdfJsLib {
  getDocument(opts: { data: ArrayBuffer; isEvalSupported: boolean }): { promise: Promise<PdfDocument> };
}

interface PositionedItem {
  str: string;
  x: number;
  y: number;
  width: number;
  page: number;
}

type ColumnKey =
  | 'codProd' | 'descricao' | 'ncmSh' | 'cst' | 'cfop' | 'unid'
  | 'qtde' | 'vlUnitario' | 'vlTotal' | 'vlDesconto'
  | 'bcIcms' | 'vlIcms' | 'vlIpi' | 'aliqIcms' | 'aliqIpi';

interface ColumnDef {
  key: ColumnKey;
  /** X esquerda da coluna (do header). */
  x: number;
}

type ColumnLayout = ColumnDef[]; // ordenado por X crescente

interface RowDraft {
  page: number;
  y: number;
  /** Texto agregado por coluna (já trim'd). */
  cells: Partial<Record<ColumnKey, string>>;
}

// ─── Reading ─────────────────────────────────────────────────────────────────

async function readItemsPerPage(file: File): Promise<PositionedItem[]> {
  const { loadPdfJs } = await import('./pdfLoader');
  const pdfjsLib = (await loadPdfJs()) as PdfJsLib;
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer, isEvalSupported: false }).promise;

  const allItems: PositionedItem[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    for (const it of content.items) {
      if (!it.transform || typeof it.str !== 'string') continue;
      const str = it.str;
      if (str.length === 0) continue;
      allItems.push({
        str,
        x: it.transform[4],
        y: it.transform[5],
        width: it.width ?? 0,
        page: p,
      });
    }
  }
  return allItems;
}

// ─── Detecção de layout da tabela ────────────────────────────────────────────

/**
 * Mapeamento header-text → ColumnKey. Aceita variações comuns
 * (com/sem ponto, "DESCRIÇÃO" com/sem "DO PRODUTO").
 */
const HEADER_RECOGNIZERS: { regex: RegExp; key: ColumnKey }[] = [
  { regex: /^COD\.?\s*PROD/i,              key: 'codProd' },
  { regex: /^DESCRI[ÇC][ÃA]O/i,            key: 'descricao' },
  { regex: /^NCM/i,                        key: 'ncmSh' },
  { regex: /^CST/i,                        key: 'cst' },
  { regex: /^CFOP/i,                       key: 'cfop' },
  { regex: /^UNID/i,                       key: 'unid' },
  { regex: /^QTDE/i,                       key: 'qtde' },
  { regex: /^VL\.?\s*UNIT[ÁA]RIO|^VL\.?\s*UNIT/i, key: 'vlUnitario' },
  { regex: /^VL\.?\s*TOTAL/i,              key: 'vlTotal' },
  { regex: /^VL\.?\s*DESCONTO|^DESCONTO/i, key: 'vlDesconto' },
  { regex: /^BC\.?\s*ICMS/i,               key: 'bcIcms' },
  { regex: /^VL\.?\s*ICMS/i,               key: 'vlIcms' },
  { regex: /^V\.?\s*IPI|^VL\.?\s*IPI/i,    key: 'vlIpi' },
  { regex: /^AL[IÍ]Q\.?\s*ICMS/i,          key: 'aliqIcms' },
  { regex: /^AL[IÍ]Q\.?\s*IPI/i,           key: 'aliqIpi' },
];

function recognizeHeader(str: string): ColumnKey | null {
  const trimmed = str.trim();
  for (const r of HEADER_RECOGNIZERS) {
    if (r.regex.test(trimmed)) return r.key;
  }
  return null;
}

/**
 * Localiza a header row da tabela "DADOS DO PRODUTO / SERVIÇO" e devolve
 * o layout de colunas (X de cada uma). Retorna null se a tabela não
 * for identificada.
 */
function detectColumnLayout(items: PositionedItem[]): { layout: ColumnLayout; headerY: number; page: number } | null {
  // Agrupa items por (page, y aprox) e busca por uma row que contenha
  // a maioria dos headers conhecidos.
  const yTolerance = 3;
  const buckets = new Map<string, PositionedItem[]>();
  for (const it of items) {
    const yKey = Math.round(it.y / yTolerance) * yTolerance;
    const k = `${it.page}:${yKey}`;
    const arr = buckets.get(k) ?? [];
    arr.push(it);
    buckets.set(k, arr);
  }

  let bestRow: PositionedItem[] | null = null;
  let bestScore = 0;
  let bestY = 0;
  let bestPage = 0;

  for (const arr of buckets.values()) {
    const matches = arr.map(it => ({ it, key: recognizeHeader(it.str) })).filter(m => m.key);
    // Considera header válido apenas se >= 8 colunas reconhecidas (15 ideais)
    if (matches.length >= 8 && matches.length > bestScore) {
      bestScore = matches.length;
      bestRow = arr;
      bestY = arr[0].y;
      bestPage = arr[0].page;
    }
  }

  if (!bestRow) return null;

  // Constrói layout consolidando duplicatas (ex.: "DESCRIÇÃO" + "DO PRODUTO"
  // em fragmentos separados) — fica com o X mínimo.
  const byKey = new Map<ColumnKey, number>();
  for (const it of bestRow) {
    const key = recognizeHeader(it.str);
    if (!key) continue;
    const prev = byKey.get(key);
    if (prev === undefined || it.x < prev) byKey.set(key, it.x);
  }

  const layout: ColumnLayout = Array.from(byKey.entries())
    .map(([key, x]) => ({ key, x }))
    .sort((a, b) => a.x - b.x);

  return { layout, headerY: bestY, page: bestPage };
}

// ─── Bounds da tabela ────────────────────────────────────────────────────────

const TABLE_END_RES = [
  /C[ÁA]LCULO\s+DO\s+ISSQN/i,
  /DADOS\s+ADICIONAIS/i,
  /INFORMA[ÇC][ÕO]ES\s+COMPLEMENTARES/i,
  /VALOR\s+TOTAL\s+DOS\s+SERVI[ÇC]OS/i,
];

/**
 * Encontra a Y do primeiro marcador de fim de tabela em qualquer página
 * a partir do header.
 */
function findTableEnd(items: PositionedItem[], headerPage: number, headerY: number): { page: number; y: number } {
  // Em PDFs, Y maior = topo da página. Conteúdo da tabela tem Y < headerY.
  // O marcador de fim aparece com Y < headerY (na mesma página) ou em
  // página posterior (qualquer Y).
  let bestPage = Number.POSITIVE_INFINITY;
  let bestY = Number.NEGATIVE_INFINITY;

  for (const it of items) {
    if (!TABLE_END_RES.some(re => re.test(it.str))) continue;
    // Critério: precisa estar DEPOIS do header (em página posterior, OU
    // mesma página mas Y menor que o header).
    const isAfterHeader =
      it.page > headerPage ||
      (it.page === headerPage && it.y < headerY);
    if (!isAfterHeader) continue;
    // Pega o que está mais "perto" do header (menor distância vertical):
    // página mais baixa primeiro, depois Y maior dentro daquela página.
    if (it.page < bestPage || (it.page === bestPage && it.y > bestY)) {
      bestPage = it.page;
      bestY = it.y;
    }
  }

  if (!Number.isFinite(bestPage)) {
    // Sem marcador de fim → considera o documento inteiro
    return { page: Number.MAX_SAFE_INTEGER, y: Number.NEGATIVE_INFINITY };
  }
  return { page: bestPage, y: bestY };
}

// ─── Atribuição posicional ───────────────────────────────────────────────────

/**
 * Dado o X de um fragment, retorna a coluna cuja boundary esquerda é
 * imediatamente ≤ X. Usa o layout ordenado por X crescente.
 */
function columnForX(layout: ColumnLayout, x: number): ColumnKey | null {
  const tolerance = 3; // tolerância à esquerda (text pode "vazar" um pouco)
  let chosen: ColumnKey | null = null;
  for (const col of layout) {
    if (x + tolerance >= col.x) chosen = col.key;
    else break;
  }
  return chosen;
}

/**
 * Dentro do bounds da tabela, agrupa items por Y proximity, atribui cada
 * fragment à coluna pela posição X, e devolve uma lista de RowDrafts
 * preservando a ordem visual (top-down + por página).
 */
function collectRowDrafts(
  items: PositionedItem[],
  layout: ColumnLayout,
  headerPage: number,
  headerY: number,
  endPage: number,
  endY: number
): RowDraft[] {
  // Filtra items dentro da bounding box da tabela
  const inTable = items.filter(it => {
    if (it.page < headerPage) return false;
    if (it.page === headerPage && it.y >= headerY) return false; // header e acima
    if (it.page > endPage) return false;
    if (it.page === endPage && it.y <= endY) return false; // fora da tabela
    // Filtra também o próprio header repetido em páginas seguintes
    // (mesmo padrão de Y se for tabela contínua) — recognizeHeader pega.
    if (recognizeHeader(it.str)) return false;
    // Ignora items à esquerda da primeira coluna (margens, números de página)
    if (it.x + 3 < layout[0].x) return false;
    return true;
  });

  // Ordena: por página, depois por Y descendente (top-down), depois por X
  inTable.sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    if (a.y !== b.y) return b.y - a.y;
    return a.x - b.x;
  });

  const yTolerance = 3;
  const drafts: RowDraft[] = [];
  let currentDraft: RowDraft | null = null;
  let currentY = Number.POSITIVE_INFINITY;
  let currentPage = -1;

  for (const it of inTable) {
    const newRow =
      it.page !== currentPage ||
      Math.abs(it.y - currentY) > yTolerance;

    if (newRow) {
      if (currentDraft) drafts.push(currentDraft);
      currentDraft = { page: it.page, y: it.y, cells: {} };
      currentY = it.y;
      currentPage = it.page;
    }

    const col = columnForX(layout, it.x);
    if (!col || !currentDraft) continue;
    const prev = currentDraft.cells[col];
    currentDraft.cells[col] = prev ? `${prev} ${it.str.trim()}`.replace(/\s+/g, ' ').trim() : it.str.trim();
  }
  if (currentDraft) drafts.push(currentDraft);

  return drafts;
}

// ─── Mesclagem de linhas continuação ─────────────────────────────────────────

interface MergedItem {
  codProd: string;
  descricao: string;
  ncmSh: string;
  cst: string;
  cfop: string;
  unid: string;
  qtde: number;
  vlUnitario: number;
  vlTotal: number;
  vlDesconto: number;
  bcIcms: number;
  vlIcms: number;
  vlIpi: number;
  aliqIcms: number;
  aliqIpi: number;
}

function isDataRow(d: RowDraft): boolean {
  // Linha de dados completa: tem NCM (ou CFOP, ou QTDE) — sinaliza "fim de item".
  return Boolean(d.cells.ncmSh) || Boolean(d.cells.cfop) || Boolean(d.cells.vlTotal);
}

function mergeRows(drafts: RowDraft[]): MergedItem[] {
  const items: MergedItem[] = [];
  // Buffer de codProd e descrição enquanto não encontramos a row de dados final
  let pendingCodProd = '';
  let pendingDescricao = '';

  for (const draft of drafts) {
    const cellCod = (draft.cells.codProd ?? '').trim();
    const cellDesc = (draft.cells.descricao ?? '').trim();

    // Se a row tem codProd novo, fecha buffer anterior se ele virou item
    // sem cauda (não deveria, mas defensivo) e inicia novo buffer.
    if (cellCod && /^\d{6,}$/.test(cellCod)) {
      // Se há descrição buffer mas SEM cauda, descarta — não é item válido
      pendingCodProd = cellCod;
      pendingDescricao = cellDesc;
    } else if (cellDesc && !pendingCodProd) {
      // Descrição sem codProd ainda e sem buffer → ignora (linha solta)
      continue;
    } else if (cellDesc) {
      // Continuação de descrição
      pendingDescricao = pendingDescricao
        ? `${pendingDescricao} ${cellDesc}`.replace(/\s+/g, ' ').trim()
        : cellDesc;
    }

    if (isDataRow(draft) && pendingCodProd) {
      const ncmSh = (draft.cells.ncmSh ?? '').trim();
      const cst = (draft.cells.cst ?? '').trim();
      const cfop = (draft.cells.cfop ?? '').trim();
      const unid = (draft.cells.unid ?? '').trim();
      const qtde = parseDecimalBR((draft.cells.qtde ?? '').trim());
      const vlUnitario = parseDecimalBR((draft.cells.vlUnitario ?? '').trim());
      const vlTotal = parseDecimalBR((draft.cells.vlTotal ?? '').trim());
      const vlDesconto = parseDecimalBR((draft.cells.vlDesconto ?? '').trim());
      const bcIcms = parseDecimalBR((draft.cells.bcIcms ?? '').trim());
      const vlIcms = parseDecimalBR((draft.cells.vlIcms ?? '').trim());
      const vlIpi = parseDecimalBR((draft.cells.vlIpi ?? '').trim());
      const aliqIcms = parseDecimalBR((draft.cells.aliqIcms ?? '').trim());
      const aliqIpi = parseDecimalBR((draft.cells.aliqIpi ?? '').trim());

      items.push({
        codProd: pendingCodProd,
        descricao: pendingDescricao,
        ncmSh, cst, cfop, unid,
        qtde, vlUnitario, vlTotal, vlDesconto,
        bcIcms, vlIcms, vlIpi, aliqIcms, aliqIpi,
      });

      pendingCodProd = '';
      pendingDescricao = '';
    }
  }

  return items;
}

// ─── Header parsing (best-effort regex) ──────────────────────────────────────

const HEADER_PATTERNS = {
  numero: /N[º°]\s*([\d.]+)/i,
  serie: /S[ÉE]RIE\s+(\d+)/i,
  dataEmissao: /DATA\s+D[AE]\s+EMISS[ÃA]O[:\s\-]*(\d{2}\/\d{2}\/\d{4})/i,
  natOperacao: /NATUREZA\s+D[AE]\s+OPERA[ÇC][ÃA]O[:\s\-]*([^\n]+)/i,
  chaveAcesso: /CHAVE\s+DE\s+ACESSO[:\s\-\n]+([\d\s]{40,})/i,
};

function captureWithRegex(text: string, re: RegExp): string | undefined {
  const m = text.match(re);
  if (!m || !m[1]) return undefined;
  return m[1].trim();
}

function parseHeader(items: PositionedItem[]): DanfeHeader {
  // Reconstrói texto plano simples para regex de header
  const text = items.map(it => it.str).join(' ');
  const numeroRaw = captureWithRegex(text, HEADER_PATTERNS.numero);
  const numero = numeroRaw ? numeroRaw.replace(/\D/g, '') : undefined;
  const serie = captureWithRegex(text, HEADER_PATTERNS.serie);
  const dataEmissao = captureWithRegex(text, HEADER_PATTERNS.dataEmissao);
  const natOperacao = captureWithRegex(text, HEADER_PATTERNS.natOperacao);
  const chaveRaw = captureWithRegex(text, HEADER_PATTERNS.chaveAcesso);
  const chaveAcesso = chaveRaw ? chaveRaw.replace(/\s/g, '').slice(0, 44) : undefined;

  return { numero, serie, dataEmissao, natOperacao, chaveAcesso };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ParsedDanfe {
  items: ContainerItemImport[];
  header: DanfeHeader;
  rawText: string;
}

/**
 * Tenta parsear o DANFE de forma estrutural posicional. Retorna null se
 * a tabela não for encontrada (PDF não-padrão, escaneado sem texto, ou
 * não-DANFE). Não lança em erros recuperáveis — devolve null para o
 * orquestrador decidir se cai no fallback LLM.
 */
export async function parseDanfeStructured(file: File): Promise<ParsedDanfe | null> {
  let allItems: PositionedItem[];
  try {
    allItems = await readItemsPerPage(file);
  } catch {
    return null;
  }

  if (allItems.length < 10) return null; // PDF sem texto extraível

  const detected = detectColumnLayout(allItems);
  if (!detected) return null;

  const { layout, headerY, page: headerPage } = detected;

  // Sanity check: precisamos pelo menos das colunas críticas
  const keys = new Set(layout.map(c => c.key));
  if (!keys.has('codProd') || !keys.has('descricao') || !keys.has('ncmSh')) {
    return null;
  }

  const end = findTableEnd(allItems, headerPage, headerY);
  const drafts = collectRowDrafts(allItems, layout, headerPage, headerY, end.page, end.y);
  const merged = mergeRows(drafts);

  if (merged.length === 0) return null;

  const items: ContainerItemImport[] = merged.map(r => ({
    codProd: r.codProd,
    descricao: r.descricao,
    ncmSh: r.ncmSh,
    cst: r.cst,
    cfop: r.cfop,
    unid: r.unid,
    qtde: r.qtde,
    vlUnitario: r.vlUnitario,
    vlTotal: r.vlTotal,
    vlDesconto: r.vlDesconto,
    bcIcms: r.bcIcms,
    vlIcms: r.vlIcms,
    vlIpi: r.vlIpi,
    aliqIcms: r.aliqIcms,
    aliqIpi: r.aliqIpi,
  }));

  return {
    items,
    header: parseHeader(allItems),
    rawText: allItems.map(it => it.str).join(' '),
  };
}
