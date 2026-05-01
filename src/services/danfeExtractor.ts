/**
 * @file Extração de itens DANFE a partir de PDF de Nota Fiscal Eletrônica.
 *
 * Fluxo:
 * 1. pdf.js (carregado dinamicamente via pdfLoader) lê todas as páginas em texto.
 * 2. O texto é enviado para o LLM via routeTask('DANFE_EXTRACTION', ...).
 * 3. O JSON retornado é validado com Zod (DanfeJSONSchema). Falhas viram alertas
 *    no errorReporter mas a UI ainda recebe o que foi possível extrair.
 *
 * Este extrator NÃO ativa OCR para PDFs escaneados — DANFEs autorizados pela
 * SEFAZ são sempre digitais com texto extraível. Se o PDF retornar texto vazio,
 * o erro é reportado claramente.
 */

import { routeTask } from './llmRouter';
import { DanfeJSONSchema, type DanfeJSON } from '@/domain/schemas/danfe.schema';
import { useErrorReporter } from '@/features/errorReporter';

interface PdfTextItem { str?: string }
interface PdfPage { getTextContent(): Promise<{ items: PdfTextItem[] }> }
interface PdfDocumentProxy { numPages: number; getPage(n: number): Promise<PdfPage> }
interface PdfJsLib {
  version?: string;
  getDocument(opts: { data: ArrayBuffer; isEvalSupported: boolean }): { promise: Promise<PdfDocumentProxy> };
}

/** Lê o texto bruto de todas as páginas do PDF, em ordem. */
async function extractPdfText(file: File): Promise<string> {
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

export interface ExtractDanfeResult {
  /** Itens DANFE extraídos (já passaram pelo coerce do schema). */
  items: DanfeJSON['items'];
  /** Cabeçalho da NF-e (quando o LLM reconhece). */
  header?: DanfeJSON['header'];
  /** Modelo usado (para auditoria). */
  modelUsed: string;
  /** Texto bruto extraído do PDF (útil para debug/cole manual em fallback). */
  rawText: string;
  /** Aviso quando o schema falhou parcialmente — UI pode oferecer revisão. */
  validationWarning?: string;
}

/**
 * Extrai itens DANFE de um arquivo PDF. Lança em casos catastróficos
 * (PDF ilegível, LLM indisponível); para falhas parciais (schema inválido
 * mas itens recuperáveis), retorna `validationWarning` no resultado.
 */
export async function extractDanfeFromPdf(file: File): Promise<ExtractDanfeResult> {
  const rawText = await extractPdfText(file);
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
      modelUsed: response.modelUsed,
      rawText,
    };
  }

  // Falha de validação — tenta extrair o que conseguir e retorna com warning
  const issuesPreview = result.error.issues.slice(0, 3)
    .map(i => `${i.path.join('.') || 'root'}: ${i.message}`)
    .join(' | ');
  useErrorReporter.getState().report({
    title: 'DANFE extraído com inconsistências',
    message: `O JSON do modelo passou no parse mas falhou validação estrita: ${issuesPreview}`,
    category: 'validation',
    severity: 'warning',
    source: 'danfe-extraction-zod',
    details: JSON.stringify(result.error.issues, null, 2),
    suggestion: 'Revise os itens importados antes de salvar — campos podem estar ausentes ou em formato inesperado.',
  });

  // Fallback: aceita os items mesmo que validação parcial — é melhor mostrar
  // ao usuário que pode corrigir do que jogar tudo fora.
  const fallbackItems = Array.isArray(parsed.items) ? parsed.items : [];
  return {
    items: fallbackItems as DanfeJSON['items'],
    header: parsed.header,
    modelUsed: response.modelUsed,
    rawText,
    validationWarning: issuesPreview,
  };
}
