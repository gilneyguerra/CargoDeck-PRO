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
  { regex: /^COD\.?\s*PROD|^C[ÓO]DIGO\s*DO\s*PRODUTO/i,    key: 'codProd' },
  { regex: /^DESCRI[ÇC][ÃA]O|^PRODUTO\s*\/\s*SERVI/i,      key: 'descricao' },
  { regex: /^NCM/i,                                         key: 'ncmSh' },
  { regex: /^CST|^CSOSN/i,                                  key: 'cst' },
  { regex: /^CFOP/i,                                        key: 'cfop' },
  { regex: /^UNID|^UN\b|^UN\.?\b/i,                         key: 'unid' },
  { regex: /^QTD[E]?|^QUANTIDADE/i,                         key: 'qtde' },
  { regex: /^VL\.?\s*UNIT|^V\.?\s*UNIT|^PRE[ÇC]O\s*UNIT|^VALOR\s*UNIT/i, key: 'vlUnitario' },
  { regex: /^VL\.?\s*TOTAL|^VALOR\s*TOTAL/i,                key: 'vlTotal' },
  { regex: /^VL\.?\s*DESCONTO|^DESCONTO|^DESC\.?\b/i,       key: 'vlDesconto' },
  { regex: /^BC\.?\s*ICMS|^BASE\s*C[AÁ]LC\.?\s*ICMS/i,      key: 'bcIcms' },
  { regex: /^VL\.?\s*ICMS|^V\.?\s*ICMS/i,                   key: 'vlIcms' },
  { regex: /^V\.?\s*IPI|^VL\.?\s*IPI/i,                     key: 'vlIpi' },
  { regex: /^AL[IÍ]Q\.?\s*ICMS|^AL[IÍ]Q\s*ICMS/i,           key: 'aliqIcms' },
  { regex: /^AL[IÍ]Q\.?\s*IPI|^AL[IÍ]Q\s*IPI/i,             key: 'aliqIpi' },
];

function recognizeHeader(str: string): ColumnKey | null {
  const trimmed = str.trim();
  for (const r of HEADER_RECOGNIZERS) {
    if (r.regex.test(trimmed)) return r.key;
  }
  return null;
}

interface DetectedHeader {
  layout: ColumnLayout;
  headerY: number;
  page: number;
  /** Quantas colunas reconhecidas — usado para escolher o "canonical layout"
   *  quando há múltiplos headers (continuação multi-página). */
  score: number;
}

/**
 * Encontra TODAS as ocorrências do header da tabela em todas as páginas.
 * DANFEs multi-página repetem o header em cada página; cada repetição
 * abre uma nova região de itens que precisa ser extraída.
 *
 * Critério: row com >= 8 columns reconhecidas (de 15 ideais).
 */
function detectAllTableHeaders(items: PositionedItem[]): DetectedHeader[] {
  const yTolerance = 3;
  const buckets = new Map<string, PositionedItem[]>();
  for (const it of items) {
    const yKey = Math.round(it.y / yTolerance) * yTolerance;
    const k = `${it.page}:${yKey}`;
    const arr = buckets.get(k) ?? [];
    arr.push(it);
    buckets.set(k, arr);
  }

  const found: DetectedHeader[] = [];
  for (const arr of buckets.values()) {
    const matches = arr.map(it => ({ it, key: recognizeHeader(it.str) })).filter(m => m.key);
    if (matches.length < 8) continue;

    const byKey = new Map<ColumnKey, number>();
    for (const it of arr) {
      const key = recognizeHeader(it.str);
      if (!key) continue;
      const prev = byKey.get(key);
      if (prev === undefined || it.x < prev) byKey.set(key, it.x);
    }
    const layout: ColumnLayout = Array.from(byKey.entries())
      .map(([key, x]) => ({ key, x }))
      .sort((a, b) => a.x - b.x);

    found.push({ layout, headerY: arr[0].y, page: arr[0].page, score: matches.length });
  }

  // Ordena por (página, Y descendente). DANFEs lêem top-down em PDF →
  // header da página vem com Y maior. Ordem natural: página crescente, Y
  // decrescente dentro da página.
  found.sort((a, b) => a.page - b.page || b.headerY - a.headerY);
  return found;
}

// ─── Bounds da tabela ────────────────────────────────────────────────────────

/**
 * Marcadores de fim da tabela. Lista expandida para tolerar variações
 * que aparecem em DANFEs reais — alguns geradores omitem ISSQN, outros
 * usam labels diferentes. A regra é: o que aparece IMEDIATAMENTE após
 * a última linha de dados, encerrando a região tabular.
 */
const TABLE_END_RES = [
  /C[ÁA]LCULO\s+DO\s+ISSQN/i,
  /C[ÁA]LCULO\s+DO\s+ISS\b/i,
  /DADOS\s+ADICIONAIS/i,
  /INFORMA[ÇC][ÕO]ES\s+COMPLEMENTARES/i,
  /VALOR\s+TOTAL\s+DOS\s+SERVI[ÇC]OS/i,
  /VALOR\s+APROXIMADO\s+DOS?\s+TRIBUTOS?/i,
  /RESERVADO\s+AO\s+FISCO/i,
];

/**
 * Para um header específico, encontra a Y do PRÓXIMO marcador de fim
 * NA MESMA PÁGINA (com Y < headerY). Em DANFEs multi-página, cada
 * página tem seu próprio rodapé "DADOS ADICIONAIS" — não pegar o
 * rodapé da página 1 quando o header está na página 2 (causa do bug
 * que perdia ~50% dos itens em DANFEs longos).
 *
 * Se não houver marcador na página, retorna `Number.NEGATIVE_INFINITY`
 * (significa "vai até o fim da página"). Aí o filtro de bounding box
 * pega tudo abaixo do header.
 */
function findEndForHeader(items: PositionedItem[], headerPage: number, headerY: number): number {
  let bestY = Number.NEGATIVE_INFINITY;
  for (const it of items) {
    if (it.page !== headerPage) continue;
    if (it.y >= headerY) continue; // só conta o que está abaixo do header
    if (!TABLE_END_RES.some(re => re.test(it.str))) continue;
    // Y maior = mais próximo do header (logo abaixo). Pega o mais alto.
    if (it.y > bestY) bestY = it.y;
  }
  return bestY;
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
 * Coleta RowDrafts de UMA região tabular (uma página, do header até o
 * marcador de fim ou bottom da página). Chamada uma vez por header
 * detectado — em DANFEs multi-página, é chamada N vezes.
 *
 * `endY` = Y do marcador de fim na mesma página, ou `-Infinity` para
 * pegar até o final.
 */
function collectRowDraftsForRange(
  items: PositionedItem[],
  layout: ColumnLayout,
  page: number,
  headerY: number,
  endY: number,
): RowDraft[] {
  const inRange = items.filter(it => {
    if (it.page !== page) return false;
    if (it.y >= headerY) return false; // acima ou no header
    if (it.y <= endY) return false; // abaixo do marcador de fim
    if (recognizeHeader(it.str)) return false; // ignora header repetido
    if (it.x + 3 < layout[0].x) return false; // ignora margens / números de página
    return true;
  });

  // Top-down dentro da página: Y descendente, depois X
  inRange.sort((a, b) => {
    if (a.y !== b.y) return b.y - a.y;
    return a.x - b.x;
  });

  const yTolerance = 3;
  const drafts: RowDraft[] = [];
  let currentDraft: RowDraft | null = null;
  let currentY = Number.POSITIVE_INFINITY;

  for (const it of inRange) {
    const newRow = Math.abs(it.y - currentY) > yTolerance;

    if (newRow) {
      if (currentDraft) drafts.push(currentDraft);
      currentDraft = { page: it.page, y: it.y, cells: {} };
      currentY = it.y;
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

  const headers = detectAllTableHeaders(allItems);
  if (headers.length === 0) return null;

  // Layout canônico = o header com mais colunas reconhecidas. Em DANFEs
  // multi-página o layout é idêntico entre páginas (continuação visual);
  // se houver micro-variação de X entre páginas, o canônico fica estável.
  const canonical = headers.reduce((a, b) => (b.score > a.score ? b : a), headers[0]);
  const layout = canonical.layout;

  // Sanity check: precisamos pelo menos das colunas críticas
  const keys = new Set(layout.map(c => c.key));
  if (!keys.has('codProd') || !keys.has('descricao') || !keys.has('ncmSh')) {
    return null;
  }

  // Coleta drafts de CADA header detectado (uma região por página).
  // mergeRows depois junta tudo em ordem, anexando continuações de
  // descrição que cruzam quebra de página corretamente.
  const allDrafts: RowDraft[] = [];
  for (const h of headers) {
    const endY = findEndForHeader(allItems, h.page, h.headerY);
    const drafts = collectRowDraftsForRange(allItems, layout, h.page, h.headerY, endY);
    allDrafts.push(...drafts);
  }
  const merged = mergeRows(allDrafts);

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
