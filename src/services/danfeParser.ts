/**
 * @file Parser DETERMINÍSTICO de DANFE — extração estrutural via pdfjs-dist.
 *
 * Por que existe (em vez de só usar LLM):
 * - DANFE é regulamentado pela SEFAZ. A seção "DADOS DO PRODUTO / SERVIÇO"
 *   sempre tem 15 colunas na mesma ordem, com cabeçalhos previsíveis.
 * - Determinístico: zero variabilidade, zero risco de alucinação fiscal,
 *   zero custo por chamada, zero latência de rede, zero dependência de API
 *   externa. Tudo no client.
 * - LLM fica como fallback para PDFs muito atípicos (tabela quebrada,
 *   layout customizado fora do padrão SEFAZ).
 *
 * Estratégia:
 * 1. pdf.js lê todas as páginas e devolve text items com posições X/Y.
 * 2. Items são agrupados em linhas por proximidade Y, ordenados por X
 *    em cada linha — preserva a ordem de leitura natural.
 * 3. A região da tabela é recortada entre os marcadores
 *    "DADOS DO PRODUTO" e "CÁLCULO DO ISSQN" / "DADOS ADICIONAIS".
 * 4. Cada item é identificado pela "cauda" característica:
 *    NCM(8 dígitos) + CST(3) + CFOP(4) + UNID(≤6 chars) + 9 decimais pt-BR.
 *    Tudo entre o COD.PROD anterior e o início dessa cauda é a descrição
 *    (que pode ter quebrado em múltiplas linhas).
 */

import { parseDecimalBR } from '@/lib/spreadsheetParser';
import type { ContainerItemImport } from '@/domain/schemas/container.schema';
import type { DanfeHeader } from '@/domain/schemas/danfe.schema';

interface PdfTextItem {
  str?: string;
  transform?: number[]; // [a, b, c, d, e, f] onde e=X, f=Y
}

interface PdfTextContent {
  items: PdfTextItem[];
}

interface PdfPage {
  getTextContent(): Promise<PdfTextContent>;
}

interface PdfDocument {
  numPages: number;
  getPage(n: number): Promise<PdfPage>;
}

interface PdfJsLib {
  getDocument(opts: { data: ArrayBuffer; isEvalSupported: boolean }): { promise: Promise<PdfDocument> };
}

// ─── Reading ─────────────────────────────────────────────────────────────────

/**
 * Lê o PDF e devolve o texto de cada página em ordem visual (linhas separadas
 * por \n, items em cada linha ordenados pela posição X do PDF).
 */
async function readPdfTextOrdered(file: File): Promise<string> {
  const { loadPdfJs } = await import('./pdfLoader');
  const pdfjsLib = (await loadPdfJs()) as PdfJsLib;
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer, isEvalSupported: false }).promise;

  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pageTexts.push(itemsToOrderedText(content.items));
  }
  return pageTexts.join('\n\n');
}

/**
 * Converte os text items do pdf.js em texto ordenado: agrupa por Y (com
 * tolerância) para formar linhas, ordena cada linha por X, junta com espaço.
 * Linhas separadas por \n.
 */
function itemsToOrderedText(items: PdfTextItem[]): string {
  const yTolerance = 2;
  const valid = items.filter(it => it.transform && typeof it.str === 'string');
  // Y maior = topo da página (PDF origin é bottom-left). Ordena top-down.
  const sorted = [...valid].sort((a, b) => (b.transform![5] - a.transform![5]));

  const rows: PdfTextItem[][] = [];
  let currentRow: PdfTextItem[] = [];
  let currentY = Number.POSITIVE_INFINITY;

  for (const item of sorted) {
    const y = item.transform![5];
    if (Math.abs(y - currentY) <= yTolerance) {
      currentRow.push(item);
    } else {
      if (currentRow.length) {
        currentRow.sort((a, b) => a.transform![4] - b.transform![4]);
        rows.push(currentRow);
      }
      currentRow = [item];
      currentY = y;
    }
  }
  if (currentRow.length) {
    currentRow.sort((a, b) => a.transform![4] - b.transform![4]);
    rows.push(currentRow);
  }

  return rows
    .map(row => row.map(it => (it.str ?? '').trim()).filter(Boolean).join(' '))
    .filter(line => line.length > 0)
    .join('\n');
}

// ─── Slicing ─────────────────────────────────────────────────────────────────

const TABLE_START_RE = /DADOS\s+DO\s+PRODUTO\s*\/?\s*SERVI[ÇC]O/i;
const TABLE_END_RES = [
  /C[ÁA]LCULO\s+DO\s+ISSQN/i,
  /DADOS\s+ADICIONAIS/i,
  /INFORMA[ÇC][ÕO]ES\s+COMPLEMENTARES/i,
  /VALOR\s+TOTAL\s+DOS\s+SERVI[ÇC]OS/i,
];

/**
 * Recorta a área da tabela "DADOS DO PRODUTO / SERVIÇO" do texto completo.
 * Retorna null se os marcadores não forem encontrados (PDF não é DANFE
 * padrão, ou está corrompido, ou é escaneado sem texto).
 */
function sliceTableArea(text: string): string | null {
  const start = text.search(TABLE_START_RE);
  if (start < 0) return null;

  // Avança para após o título da seção
  const startMatch = text.slice(start).match(TABLE_START_RE)!;
  const tableBegin = start + startMatch[0].length;
  const remaining = text.slice(tableBegin);

  // Acha o primeiro marcador de fim
  let endIdx = remaining.length;
  for (const re of TABLE_END_RES) {
    const m = remaining.search(re);
    if (m >= 0 && m < endIdx) endIdx = m;
  }
  return remaining.slice(0, endIdx);
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

/**
 * Cauda do registro: NCM(8d) CST(3d) CFOP(4d) UNID(1-6 chars) + 9 decimais pt-BR.
 * Cobre os 14 últimos campos das 15 colunas (todos exceto codProd e descricao,
 * que vêm antes da cauda).
 */
const TAIL_RE = new RegExp(
  '(\\d{8})\\s+' +              // NCM/SH
  '(\\d{3})\\s+' +              // CST
  '(\\d{4})\\s+' +              // CFOP
  '(\\S{1,6})\\s+' +            // UNID
  '([\\d.,]+)\\s+' +            // QTDE
  '([\\d.,]+)\\s+' +            // VL.UNITÁRIO
  '([\\d.,]+)\\s+' +            // VL.TOTAL
  '([\\d.,]+)\\s+' +            // VL.DESCONTO
  '([\\d.,]+)\\s+' +            // BC.ICMS
  '([\\d.,]+)\\s+' +            // VL.ICMS
  '([\\d.,]+)\\s+' +            // V.IPI
  '([\\d.,]+)\\s+' +            // ALÍQ.ICMS
  '([\\d.,]+)',                 // ALÍQ.IPI
  'g'
);

const COD_PROD_RE = /\b\d{8}\b/g;

interface RawItem {
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

/**
 * Para cada match da cauda, identifica o COD.PROD imediatamente anterior
 * (último \d{8} antes da cauda dentro do bloco corrente) e o descricao
 * (texto entre COD.PROD e início da cauda).
 */
function parseTableText(tableText: string): RawItem[] {
  const items: RawItem[] = [];
  const tails = [...tableText.matchAll(TAIL_RE)];

  let prevEnd = 0;
  for (const match of tails) {
    const tailStart = match.index ?? 0;
    const blockBeforeTail = tableText.slice(prevEnd, tailStart);

    // Acha o COD.PROD: ÚLTIMO \d{8} no bloco antes da cauda. Em DANFEs com
    // descrição multi-linha, pode existir vários candidatos — o último é
    // sempre o do item atual; os anteriores foram do item anterior cujo
    // tail já foi consumido (improvável, mas defensivo).
    const codCandidates = [...blockBeforeTail.matchAll(COD_PROD_RE)];
    if (codCandidates.length === 0) {
      prevEnd = tailStart + match[0].length;
      continue;
    }
    const codMatch = codCandidates[codCandidates.length - 1];
    const codProd = codMatch[0];
    const descricaoStart = (codMatch.index ?? 0) + codProd.length;
    const rawDescricao = blockBeforeTail.slice(descricaoStart);
    const descricao = rawDescricao.replace(/\s+/g, ' ').trim();

    items.push({
      codProd,
      descricao,
      ncmSh: match[1],
      cst: match[2],
      cfop: match[3],
      unid: match[4],
      qtde: parseDecimalBR(match[5]),
      vlUnitario: parseDecimalBR(match[6]),
      vlTotal: parseDecimalBR(match[7]),
      vlDesconto: parseDecimalBR(match[8]),
      bcIcms: parseDecimalBR(match[9]),
      vlIcms: parseDecimalBR(match[10]),
      vlIpi: parseDecimalBR(match[11]),
      aliqIcms: parseDecimalBR(match[12]),
      aliqIpi: parseDecimalBR(match[13]),
    });

    prevEnd = tailStart + match[0].length;
  }

  return items;
}

// ─── Header parsing (best-effort) ────────────────────────────────────────────

const HEADER_PATTERNS = {
  numero: /N[º°]\s*([\d\.]+)/i,
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

/**
 * Best-effort: extrai metadados do cabeçalho do DANFE. Cada campo é opcional;
 * se o regex não bater, vira undefined.
 */
function parseHeader(text: string): DanfeHeader {
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
  /** Texto bruto do PDF (útil para debug ou fallback LLM). */
  rawText: string;
}

/**
 * Tenta parsear o DANFE de forma estrutural. Retorna null se a tabela não
 * for encontrada (PDF não-padrão, escaneado sem texto, ou não-DANFE).
 * Não lança em erros recuperáveis — apenas devolve null para o orquestrador
 * decidir se cai no fallback LLM.
 */
export async function parseDanfeStructured(file: File): Promise<ParsedDanfe | null> {
  let rawText: string;
  try {
    rawText = await readPdfTextOrdered(file);
  } catch {
    return null;
  }

  if (rawText.replace(/\s+/g, '').length < 50) {
    return null; // PDF sem texto extraível (escaneado)
  }

  const tableText = sliceTableArea(rawText);
  if (!tableText) return null;

  const rawItems = parseTableText(tableText);
  if (rawItems.length === 0) return null;

  const items: ContainerItemImport[] = rawItems.map(r => ({
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
    header: parseHeader(rawText),
    rawText,
  };
}
