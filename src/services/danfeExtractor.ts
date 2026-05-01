/**
 * @file Orquestrador de extração de itens DANFE.
 *
 * Estratégia em duas camadas:
 *
 * 1. **Parser estrutural (PRIMÁRIO)** — `parseDanfeStructured` em
 *    src/services/danfeParser.ts. Lê o PDF via pdfjs-dist, recorta a área
 *    "DADOS DO PRODUTO / SERVIÇO" e extrai as 15 colunas via regex
 *    determinística. Zero rede, zero alucinação, zero custo. Cobre 100%
 *    dos DANFEs autorizados pela SEFAZ no formato padrão.
 *
 * 2. **LLM (FALLBACK opcional)** — `extractDanfeViaLLM` chama o proxy
 *    `/api/llm-zen` com a tarefa `DANFE_EXTRACTION`. Acionado APENAS
 *    quando o parser estrutural retorna null/empty (PDFs muito atípicos,
 *    layout customizado fora do padrão, ou em geradores que reordenam
 *    colunas). Custos de token + latência só pagos nesses casos raros.
 *
 * O caller indica qual estratégia foi usada via `result.strategy`, para
 * a UI poder distinguir o feedback ("via leitor PDF" vs "via IA").
 */

import { routeTask } from './llmRouter';
import { DanfeJSONSchema, type DanfeJSON } from '@/domain/schemas/danfe.schema';
import { parseDanfeStructured } from './danfeParser';
import { useErrorReporter } from '@/features/errorReporter';

export type ExtractionStrategy = 'parser' | 'llm';

export interface ExtractDanfeResult {
  /** Itens DANFE extraídos. */
  items: DanfeJSON['items'];
  /** Cabeçalho da NF-e (best-effort). */
  header?: DanfeJSON['header'];
  /** Estratégia que produziu o resultado — informa o feedback ao usuário. */
  strategy: ExtractionStrategy;
  /** Modelo LLM usado (apenas quando strategy === 'llm'). */
  modelUsed?: string;
  /** Texto bruto extraído do PDF. */
  rawText: string;
  /** Aviso quando schema falhou parcialmente (apenas no fallback LLM). */
  validationWarning?: string;
}

// ─── Estratégia 1: parser estrutural via pdfjs ───────────────────────────────

async function tryStructuredParser(file: File): Promise<ExtractDanfeResult | null> {
  const parsed = await parseDanfeStructured(file);
  if (!parsed || parsed.items.length === 0) return null;

  return {
    items: parsed.items,
    header: parsed.header,
    strategy: 'parser',
    rawText: parsed.rawText,
  };
}

// ─── Estratégia 2: fallback LLM ──────────────────────────────────────────────

function stripJsonFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

function parseJsonSafe<T>(text: string): T | null {
  try {
    return JSON.parse(stripJsonFences(text)) as T;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]) as T; } catch { /* noop */ }
    }
    return null;
  }
}

interface PdfTextItem { str?: string }
interface PdfPage { getTextContent(): Promise<{ items: PdfTextItem[] }> }
interface PdfDocumentProxy { numPages: number; getPage(n: number): Promise<PdfPage> }
interface PdfJsLib {
  getDocument(opts: { data: ArrayBuffer; isEvalSupported: boolean }): { promise: Promise<PdfDocumentProxy> };
}

async function readPdfTextFlat(file: File): Promise<string> {
  const { loadPdfJs } = await import('./pdfLoader');
  const pdfjsLib = (await loadPdfJs()) as unknown as PdfJsLib;
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, isEvalSupported: false });
  const pdf = await loadingTask.promise;

  const pageTextPromises = Array.from({ length: pdf.numPages }, async (_, i) => {
    const page = await pdf.getPage(i + 1);
    const content = await page.getTextContent();
    return content.items.map(it => it.str ?? '').join(' ');
  });

  const pageTexts = await Promise.all(pageTextPromises);
  return pageTexts.join('\n');
}

async function extractDanfeViaLLM(file: File, rawTextFromParser?: string): Promise<ExtractDanfeResult> {
  const rawText = rawTextFromParser ?? (await readPdfTextFlat(file));
  if (rawText.replace(/\s+/g, '').length < 50) {
    throw new Error('PDF não contém texto extraível. Pode ser escaneado ou estar protegido.');
  }

  const response = await routeTask('DANFE_EXTRACTION', rawText);
  const parsed = parseJsonSafe<DanfeJSON>(response.content);
  if (!parsed) {
    throw new Error('O modelo não retornou JSON válido. Tente novamente.');
  }

  const result = DanfeJSONSchema.safeParse(parsed);
  if (result.success) {
    return {
      items: result.data.items,
      header: result.data.header,
      strategy: 'llm',
      modelUsed: response.modelUsed,
      rawText,
    };
  }

  // Validação parcial — surface aviso mas devolve o que foi possível parsear
  const issuesPreview = result.error.issues.slice(0, 3)
    .map(i => `${i.path.join('.') || 'root'}: ${i.message}`)
    .join(' | ');
  useErrorReporter.getState().report({
    title: 'DANFE extraído com inconsistências (fallback IA)',
    message: `Parser estrutural não cobriu este formato; fallback IA retornou JSON com inconsistências: ${issuesPreview}`,
    category: 'validation',
    severity: 'warning',
    source: 'danfe-extraction-zod',
    details: JSON.stringify(result.error.issues, null, 2),
    suggestion: 'Revise os itens importados antes de salvar — campos podem estar ausentes ou em formato inesperado.',
  });

  const fallbackItems = Array.isArray(parsed.items) ? parsed.items : [];
  return {
    items: fallbackItems as DanfeJSON['items'],
    header: parsed.header,
    strategy: 'llm',
    modelUsed: response.modelUsed,
    rawText,
    validationWarning: issuesPreview,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Extrai itens DANFE de um arquivo PDF tentando o parser estrutural primeiro
 * e caindo no fallback LLM somente quando necessário.
 *
 * Casos de uso:
 * - DANFE padrão SEFAZ (99% dos casos): parser estrutural → resposta em
 *   ~100ms, zero custo, dados exatos.
 * - DANFE com layout customizado / scanner OCRado: parser falha → LLM
 *   tenta entender o texto extraído.
 * - PDF totalmente escaneado sem texto: ambos falham → erro acionável.
 */
export async function extractDanfeFromPdf(file: File): Promise<ExtractDanfeResult> {
  // 1. Parser determinístico (preferido)
  const structured = await tryStructuredParser(file);
  if (structured) return structured;

  // 2. Fallback LLM
  return extractDanfeViaLLM(file);
}
