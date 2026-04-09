// src/services/pdfExtractor.ts
/**
 * @file Serviço robusto para extração de dados de PDFs de manifestos de carga (CargoDeck-PRO).
 *
 * Capacidades:
 * - Leitura de PDFs nativos (texto selecionável) via pdfjs-dist
 * - Fallback automático para OCR via Tesseract.js em PDFs escaneados
 * - Extração dos 9 elementos do manifesto offshore brasileiro (Petrobras/TAGAZ):
 *   1. Nome da Embarcação  (do campo EQUIPAMENTO {NUM} {NOME})
 *   2. Número de Atendimento  (ATENDIMENTO: XXXXXXXXX)
 *   3. Roteiro Previsto  (Roteiro previsto PBG -> NS57 -> NS63 ...)
 *   4. Local de Origem  (seção "ORIG_COD   NOME_ORIG   DEST_COD   NOME_DEST")
 *   5. Local de Destino
 *   6. Descrição da Carga  (campo livre após a unidade)
 *   7. Código Identificador Único  (ISO container ou numérico)
 *   8. Dimensões (CxLxA em metros, separação por 'x')
 *   9. Peso (em KG → convertido para toneladas)
 */
import type * as pdfjsLibType from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import { AppError, handleApplicationError } from './errorHandler';
import { ErrorCodes } from '../lib/errorCodes';
import { logger } from '../utils/logger';

// ─── Interfaces Públicas ────────────────────────────────────────────────────

export interface CargoItem {
    id: string;
    identifier: string;        // Código único (ex: "MLTU 280189-9", "805154-2")
    description: string;       // Descrição textual da carga
    weight: number;            // Peso em TONELADAS (convertido de KG)
    weightKg: number;          // Peso original em KG
    volume: number;            // Volume em m³ (quando disponível)
    length?: number;           // Comprimento em metros
    width?: number;            // Largura em metros
    height?: number;           // Altura em metros
    bay: number;               // Página de origem (usado como agrupamento)
    positionX?: number;
    positionY?: number;
    rotation?: number;
    isBackload?: boolean;      // True se for operação de desembarque/backload
    tipoDetectado?: string;    // ex: "CONTAINER", "CESTA", "TUBULAR"
    // Dados do cabeçalho do manifesto
    nomeEmbarcacao?: string;
    numeroAtendimento?: string;
    origemCarga?: string;
    destinoCarga?: string;
    roteiroPrevisto?: string[];
}

interface ExtractionMetadata {
    pages: number;
    extractedAt: Date;
    method: 'text' | 'ocr';
    fileName: string;
    fileSize: number;
}

export interface ExtractionResult {
    success: boolean;
    data?: {
        items: CargoItem[];
        metadata: ExtractionMetadata;
    };
    error?: AppError;
}

// ─── Interface interna do cabeçalho ─────────────────────────────────────────

interface ManifestHeader {
    nomeEmbarcacao?: string;
    numeroAtendimento?: string;
    origemCarga?: string;
    destinoCarga?: string;
    roteiroPrevisto?: string[];
}

// ─── Utilitários de Normalização ────────────────────────────────────────────

/**
 * Normaliza valor numérico para float JS.
 * Suporta: "9.000,00" (BR), "9,000.00" (US), "9000"
 */
function normalizeNumber(raw: string): number {
    let s = raw.trim().replace(/[lI|]/g, '1').replace(/[oO]/g, '0');

    const commaIndex = s.lastIndexOf(',');
    const dotIndex = s.lastIndexOf('.');

    if (commaIndex > -1 && dotIndex > -1) {
        if (commaIndex > dotIndex) {
            s = s.replace(/\./g, '').replace(',', '.');
        } else {
            s = s.replace(/,/g, '');
        }
    } else if (commaIndex > -1) {
        // Se a vírgula é a única pontuação, usamos como decimal
        s = s.replace(',', '.');
    } else if (dotIndex > -1) {
        // Se o ponto é a única pontuação, Tesseract pode ter lido ",00" como ".000".
        // Vamos varrer e assumir que o ponto que resta é DECIMAL. 
        // Ex: "450.000" -> parseFloat("450.000") = 450
        // Petrobras não deve fornecer "4.500" isolado sem decimais (eles dariam 4.500,00).
        // Se fornecerem, parseFloat lerá como 4.5 e exigirá checagem visual. Segurança em 1o lugar.
    }

    return parseFloat(s) || 0;
}

function kgToTonnes(kg: number): number { return kg / 1000; }

function normalizeDimension(raw: string): number {
    const s = raw.trim().replace(/[lI|]/g, '1').replace(/[oO]/g, '0');
    return parseFloat(s.replace(',', '.')) || 0;
}

// ─── Palavras-chave ──────────────────────────────────────────────────────────

const BACKLOAD_KEYWORDS = [
    'desembarque', 'removido', 'removida', 'retorno', 'backload',
    'descarregamento', 'saida', 'saída', 'descarga', 'offload',
];

const CARGO_TYPES: Record<string, string> = {
    'CONTAINER': 'CONTAINER',
    'CONT ':     'CONTAINER',
    'CESTA':     'BASKET',
    'BASKET':    'BASKET',
    'CESTACM':   'BASKET',
    'CETSA':     'BASKET',
    'CACAMBA':   'BASKET',
    'TUBULAR':   'TUBULAR',
    'RISER':     'TUBULAR',
    'PIPE':      'TUBULAR',
    'TUBO':      'TUBULAR',
    'BOP':       'EQUIPMENT',
    'SKID':      'EQUIPMENT',
    'EQUIPAMENTO': 'EQUIPMENT',
    'EQUIPMENT': 'EQUIPMENT',
    'TANQUE':    'EQUIPMENT',
    'CUTTING BOX': 'EQUIPMENT',
    'CAIXA':     'GENERAL',
    'BOX':       'GENERAL',
    'PALLET':    'GENERAL',
};

// ─── Extração do Cabeçalho ───────────────────────────────────────────────────

/**
 * Extrai metadados do cabeçalho do manifesto Petrobras/TAGAZ:
 * - Nome da Embarcação  (do campo "EQUIPAMENTO {NUM} {NOME}")
 * - Número de Atendimento  ("ATENDIMENTO: 509442732")
 * - Roteiro Previsto  ("Roteiro previsto PBG -> NS57 -> ...")
 * - Origem/Destino global (primeiro cabeçalho de seção encontrado)
 */
function parseHeaderInfo(fullText: string): ManifestHeader {
    const header: ManifestHeader = {};

    // 1. Número de Atendimento
    // Formato Petrobras TAGAZ: "ATENDIMENTO:   509442732   052"
    const atendimentoPatterns = [
        /ATENDIMENTO\s*[:\-]\s*(\d{7,12})/i,
        /\b(5\d{8})\b/,          // Padrão Petrobras: 9 dígitos começando com 5
        /\b(\d{9})\b/,           // Qualquer 9 dígitos (fallback)
    ];
    for (const pat of atendimentoPatterns) {
        const m = fullText.match(pat);
        if (m?.[1]) { header.numeroAtendimento = m[1].trim(); break; }
    }

    // 2. Nome da Embarcação
    // Formato TAGAZ: "EQUIPAMENTO   30127695   CBO FLAMENGO"
    //                 ⇒ "CBO FLAMENGO" é o nome da embarcação (pode ser composto)
    const embarcacaoPatterns = [
        // Greedy: captura tudo até 2+ espaços ou fim de linha, incluindo nomes compostos
        /EQUIPAMENTO\s+\d+\s+([A-ZÁÉÍÓÚÀÂÃÊÕÜ][A-ZÁÉÍÓÚÀÂÃÊÕÜ\s]{2,35})(?=\s{2,}|\s*DATA:|\s*MANIFESTO|\s*$)/m,
        /(?:embarca[çc][ãa]o|navio|vessel|m\/v)\s*[:\-]?\s*([A-ZÁÉÍÓÚÀÂÃÊÕÜ][A-Za-zÀ-ÿ0-9\s\-]{3,40})(?=\s*\n|\s{2,})/im,
    ];
    for (const pat of embarcacaoPatterns) {
        const m = fullText.match(pat);
        const candidate = m?.[1]?.trim();
        if (candidate && candidate.length >= 3 && candidate.length <= 50) {
            if (!candidate.match(/^(MANIFESTO|PLANO|CARGA|ROTEIRO|ORIGEM|DESTINO|TOTAL|DATA|HORA|PAGINA|CONTAINER|PETROBRAS|BASE|EMPRESA|EQUIPAMENTO|RECEBIMENTO)/i)) {
                header.nomeEmbarcacao = candidate;
                break;
            }
        }
    }

    // 3. Roteiro Previsto
    // Formato real: "Roteiro previsto PBG -> NS57 -> NS63 -> NS44 -> NS32..."
    const roteiroPatterns = [
        /Roteiro\s+previsto\s+([A-Z0-9]{2,6}(?:\s*->\s*[A-Z0-9]{2,6}){2,})/i,
        /ROTEIRO\s+PREVISTO\s*[:\s]+([A-Z0-9]{2,6}(?:\s*->\s*[A-Z0-9]{2,6}){2,})/i,
        /Roteiro\s+previsto\s+([A-Z0-9]{2,6}(?:\s*-\s*[A-Z0-9]{2,6}){2,})/i,
    ];
    for (const pat of roteiroPatterns) {
        const m = fullText.match(pat);
        if (m?.[1]) {
            const stops = m[1].split(/\s*->\s*|\s+-\s+/)
                .map(s => s.trim().toUpperCase())
                .filter(s => /^[A-Z0-9]{2,6}$/.test(s));
            if (stops.length >= 2) { header.roteiroPrevisto = stops; break; }
        }
    }

    // 4. Origem e Destino global
    // O primeiro cabeçalho de seção encontrado no texto completo:
    // "NS44   LAGUNA STAR   PACU   PORTO DO AÇU"
    const sectionHeaderMatch = fullText.match(
        /\b([A-Z]{2,6})\s{2,}([A-Z][A-Z\sÀ-ÿ]{3,35}?)\s{3,}([A-Z]{2,6})\s{2,}([A-Z][A-Z\sÀ-ÿ]{3,35}?)(?=\s{2,}|\n|\d{4})/
    );
    if (sectionHeaderMatch) {
        const code1 = sectionHeaderMatch[1].trim();
        const code2 = sectionHeaderMatch[3].trim();
        // Verificar que não são palavras de rodapé
        if (!code1.match(/^(PETROBRAS|MANIFESTO|BASE|EMPRESA|RECEBIMENTO)$/i)) {
            header.origemCarga  = code1;
            header.destinoCarga = code2;
        }
    }

    // Fallback: buscar por rótulos "Origem:" e "Destino:"
    if (!header.origemCarga) {
        const m = fullText.match(/(?:local\s+de\s+)?origem\s*[:\-]?\s*([A-Z]{2,6})\s*[-–]/i);
        if (m?.[1]) header.origemCarga = m[1].trim();
    }
    if (!header.destinoCarga) {
        const m = fullText.match(/(?:local\s+de\s+)?destino\s*[:\-]?\s*([A-Z]{2,6})\s*[-–]/i);
        if (m?.[1]) header.destinoCarga = m[1].trim();
    }

    logger.debug('Header do manifesto extraído', {
        nomeEmbarcacao:    header.nomeEmbarcacao,
        numeroAtendimento: header.numeroAtendimento,
        origemCarga:       header.origemCarga,
        destinoCarga:      header.destinoCarga,
        roteiroPrevisto:   header.roteiroPrevisto?.slice(0, 5),
    });
    return header;
}

// ─── Detecção de tipo de carga ───────────────────────────────────────────────

function detectCargoType(text: string): string | undefined {
    const upper = text.toUpperCase();
    for (const [keyword, tipo] of Object.entries(CARGO_TYPES)) {
        if (upper.includes(keyword)) return tipo;
    }
    return undefined;
}

// ─── Parser de Código Identificador ─────────────────────────────────────────

function extractIdentifier(text: string): string | undefined {
    // ISO container: 4 letras + 6-7 dígitos (ex: MLTU 280189-9, TITU7263141)
    const containerMatch = text.match(/\b([A-Z]{3,4}\s?\d{6,7}[-]?\d?)\b/);
    if (containerMatch) return containerMatch[1].replace(/\s+/, ' ').trim();

    // Código numérico com hífen (ex: "805154-2")
    const numericHyphenMatch = text.match(/\b(\d{5,9}-\d{1,2})\b/);
    if (numericHyphenMatch) return numericHyphenMatch[1];

    // Código numérico puro (ex: "802567")
    const numericMatch = text.match(/\b(\d{5,9})\b/);
    if (numericMatch) return numericMatch[1];

    return undefined;
}

// ─── Parser Principal de Itens de Manifesto ──────────────────────────────────

/**
 * Extrai itens de carga do texto do manifesto.
 *
 * Padrão principal: Formato Petrobras/TAGAZ (validado com PDFs reais)
 * Cabeçalho de seção: "ORIG_COD   NOME_ORIGEM   DEST_COD   NOME_DESTINO"
 * Linha de carga: "NNNN   NNNNNNNN   NNNN/NNNN   QTD   UN   DESCRIÇÃO   CxLxA   PESO_KG   VALOR   BRL"
 *
 * Padrões de fallback para outros formatos de manifesto.
 */
function parseManifesto(text: string, pageNumber: number, header: ManifestHeader): CargoItem[] {
    const items: CargoItem[] = [];
    const seenIds = new Set<string>();

    let localOrigem  = header.origemCarga;
    let localDestino = header.destinoCarga;

    // ── Detectar cabeçalhos de seção dentro do texto ──────────────────────────
    // Padrão: "NS44   LAGUNA STAR   PACU   PORTO DO AÇU"
    const sectionHeaders = [...text.matchAll(
        /\b([A-Z]{2,6})\s{2,}([A-Z][A-Z\sÀ-ÿ]{3,35}?)\s{3,}([A-Z]{2,6})\s{2,}([A-Z][A-Z\sÀ-ÿ]{3,35}?)(?=\s{2,}|\n|\d{4})/g
    )];

    if (sectionHeaders.length > 0 && !localOrigem) {
        const sh = sectionHeaders[0];
        localOrigem  = sh[1].trim();
        localDestino = sh[3].trim();
    }

    type SectionMeta = { pos: number; origem: string; destino: string };
    const sections: SectionMeta[] = sectionHeaders.map(sh => ({
        pos:     sh.index ?? 0,
        origem:  sh[1].trim(),
        destino: sh[3].trim(),
    }));

    function getSectionFor(pos: number): { origem: string; destino: string } {
        let best = { origem: localOrigem ?? '', destino: localDestino ?? '' };
        for (const sec of sections) {
            if (sec.pos <= pos) best = sec;
            else break;
        }
        return best;
    }

    // ── Padrão 1 (Principal): Petrobras/TAGAZ com dimensões ───────────────────
    // Ex: "0032   326279595   0001/0002   1.00   UN   CETSA TIGER: 805154-2 ESLINGA ...   2,70x1,50x1,50   7.238,00   25.000,00   BRL"
    // Ex: "0032   326279595   0001/0002   1.00   UN   CETSA TIGER: 805154-2 ESLINGA ...   2,70x1,50x1,50   7.238,00   25.000,00   BRL"
    // Ou sem BRL e sem Valor (como no screenshot: "1,21x1,12x1,80 900,00 SUB/OPSUB/...")
    // Groupos: [1]=seq [2]=NF [3]=descrição [4]=C [5]=L [6]=A [7]=peso_kg
    // Nota: OCR pode trocar '1' por 'l'/'I', e '0' por 'O'. Por isso [\d.,lI|oO] e espaços extras no [xX×]
    const petrobrasPattern = /\b(\d{3,4})\s+(\d{6,12})\s+\d{4}\/\d{4}\s+[\d,.]+\s+(?:UN|BBL|M|M3|FT3|PE3|KG|TON|CX|PC|SC|GL|LT|TN)\s+(.{5,150}?)\s+([\d.,lI|oO]+)\s*[xX×]\s*([\d.,lI|oO]+)\s*[xX×]\s*([\d.,lI|oO]+)\s+([\d.,lI|oO]+)/gi;

    let match: RegExpExecArray | null;
    while ((match = petrobrasPattern.exec(text)) !== null) {
        try {
            const rawDescription = match[3].trim();
            if (rawDescription.match(/^(PETROBRAS|MANIFESTO|TRANSPORTE|PAG:|EMPRESA|ATENDIMENTO|ROTEIRO|HORA:|DATA:)/i)) continue;

            const length   = normalizeDimension(match[4]);
            const width    = normalizeDimension(match[5]);
            const height   = normalizeDimension(match[6]);
            const weightKg = normalizeNumber(match[7]);

            const identifier = extractIdentifier(rawDescription) ?? match[2];
            const desc       = rawDescription.substring(0, 120);
            const isBackload = BACKLOAD_KEYWORDS.some(kw => desc.toLowerCase().includes(kw));
            const tipo       = detectCargoType(desc);
            const sec        = getSectionFor(match.index ?? 0);
            const id         = `${identifier}-${match[1]}`;

            if (!seenIds.has(id)) {
                seenIds.add(id);
                items.push({
                    id, identifier,
                    description: desc,
                    weight: kgToTonnes(weightKg),
                    weightKg,
                    volume: length * width * height,
                    length, width, height,
                    bay: pageNumber,
                    isBackload, tipoDetectado: tipo,
                    nomeEmbarcacao:    header.nomeEmbarcacao,
                    numeroAtendimento: header.numeroAtendimento,
                    roteiroPrevisto:   header.roteiroPrevisto,
                    origemCarga:       sec.origem  || header.origemCarga,
                    destinoCarga:      sec.destino || header.destinoCarga,
                });
            }
        } catch (e) {
            logger.warn(`Falha ao parsear item (Petrobras) na pág ${pageNumber}:`, { truncated: match[0].substring(0, 80), error: e });
        }
    }
    petrobrasPattern.lastIndex = 0;

    // ── Padrão 2: Petrobras sem dimensões (líquidos/a granel) ────────────────
    // Este padrão captura linhas sem o bloco de dimensões no meio. Como requer segurança, avalia opcional do BRL e se a linha contem ou não
    if (items.length === 0) {
        const pattern2 = /\b(\d{3,4})\s+(\d{6,12})\s+\d{4}\/\d{4}\s+[\d,.]+\s+(?:UN|BBL|M|M3|FT3|PE3|KG|TON|CX|PC|SC|GL|LT|TN)\s+(.{5,150}?)\s+([\d.,]+)(?:\s+[\d.,]+)?(?:\s+(?:BRL|USD|EUR))?(?:\s+[a-zA-Z0-9\/_-]+)?\s*(?:\r?\n|$)/gi;
        while ((match = pattern2.exec(text)) !== null) {
            try {
                const rawDescription = match[3].trim();
                if (rawDescription.match(/^(PETROBRAS|MANIFESTO|TRANSPORTE|PAG:|EMPRESA|ATENDIMENTO|ROTEIRO)/i)) continue;

                const weightKg = normalizeNumber(match[4]);

                const identifier = extractIdentifier(rawDescription) ?? match[2];
                const id   = `${identifier}-${match[1]}`;
                const sec  = getSectionFor(match.index ?? 0);

                if (!seenIds.has(id)) {
                    seenIds.add(id);
                    items.push({
                        id, identifier,
                        description: rawDescription.substring(0, 120),
                        weight: kgToTonnes(weightKg),
                        weightKg, volume: 0,
                        bay: pageNumber,
                        isBackload: BACKLOAD_KEYWORDS.some(kw => rawDescription.toLowerCase().includes(kw)),
                        tipoDetectado: detectCargoType(rawDescription),
                        nomeEmbarcacao:    header.nomeEmbarcacao,
                        numeroAtendimento: header.numeroAtendimento,
                        roteiroPrevisto:   header.roteiroPrevisto,
                        origemCarga:       sec.origem  || header.origemCarga,
                        destinoCarga:      sec.destino || header.destinoCarga,
                    });
                }
            } catch (e) {
                logger.warn(`Falha ao parsear item (sem dims) na pág ${pageNumber}:`, { error: e });
            }
        }
        pattern2.lastIndex = 0;
    }

    // ── Padrão 3 (Fallback genérico): Descrição + CxLxA + KG ─────────────────
    if (items.length === 0) {
        const pattern3 = /([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s\-:\/]{3,80}?)\s+([\d.,lI|oO]+)\s*[xX×]\s*([\d.,lI|oO]+)\s*[xX×]\s*([\d.,lI|oO]+)\s*(?:m|M)?\s+([\d.,lI|oO]+)\s*[Kk][Gg]/g;
        while ((match = pattern3.exec(text)) !== null) {
            try {
                const rawDescription = match[1].trim();
                if (rawDescription.length < 5) continue;
                if (rawDescription.match(/^(PETROBRAS|MANIFESTO|TOTAL|DATA|HORA|PAGINA|ASSINATURA|EMPRESA)/i)) continue;

                const length = normalizeDimension(match[2]);
                const width  = normalizeDimension(match[3]);
                const height = normalizeDimension(match[4]);
                const weightKg = normalizeNumber(match[5]);

                const identifier = extractIdentifier(rawDescription) ?? `P${pageNumber}-${items.length + 1}`;
                const id = `${pageNumber}-${identifier}`;
                if (!seenIds.has(id)) {
                    seenIds.add(id);
                    items.push({
                        id, identifier,
                        description: rawDescription.substring(0, 120),
                        weight: kgToTonnes(weightKg),
                        weightKg,
                        volume: length * width * height,
                        length, width, height,
                        bay: pageNumber,
                        isBackload: BACKLOAD_KEYWORDS.some(kw => rawDescription.toLowerCase().includes(kw)),
                        tipoDetectado: detectCargoType(rawDescription),
                        ...header,
                    });
                }
            } catch (e) {
                logger.warn(`Falha ao parsear item (genérico) na pág ${pageNumber}:`, { error: e });
            }
        }
        pattern3.lastIndex = 0;
    }

    // ── Padrão 4 (Legado pipes): compatibilidade com formato antigo ───────────
    if (items.length === 0) {
        const pattern4 = /(\d+)\s*\|\s*(.+?)\s*\|\s*([\d.]+)\s*t\s*\|\s*([\d.]+)\s*m[³3]\s*\|\s*(\d+)/g;
        while ((match = pattern4.exec(text)) !== null) {
            try {
                const rawDescription = match[2].trim();
                const weightTonnes   = parseFloat(match[3]);
                const volume         = parseFloat(match[4]);
                const bay            = parseInt(match[5], 10);
                if (isNaN(weightTonnes) || weightTonnes === 0) continue;

                const identifier = extractIdentifier(rawDescription) ?? match[1];
                const id = `${pageNumber}-${identifier}`;
                if (!seenIds.has(id)) {
                    seenIds.add(id);
                    items.push({
                        id, identifier,
                        description: rawDescription,
                        weight: weightTonnes,
                        weightKg: weightTonnes * 1000,
                        volume, bay,
                        isBackload: BACKLOAD_KEYWORDS.some(kw => rawDescription.toLowerCase().includes(kw)),
                        tipoDetectado: detectCargoType(rawDescription),
                        ...header,
                    });
                }
            } catch (e) {
                logger.warn(`Falha ao parsear item (legado) na pág ${pageNumber}:`, { error: e });
            }
        }
        pattern4.lastIndex = 0;
    }

    logger.debug(`Página ${pageNumber}: ${items.length} item(ns) extraído(s)`, {
        textLength: text.length,
        sectionCount: sections.length,
    });
    return items;
}

// ─── Classe PDFExtractor ─────────────────────────────────────────────────────

export class PDFExtractor {
    private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024;
    private static readonly ALLOWED_TYPES = ['application/pdf'];
    /** Densidade mínima de caracteres por página para considerar PDF nativo */
    private static readonly MIN_TEXT_DENSITY = 50;

    static validateFile(file: File): { valid: boolean; error?: AppError } {
        if (!this.ALLOWED_TYPES.includes(file.type)) {
            return { valid: false, error: new AppError(ErrorCodes.PDF_INVALID_TYPE) };
        }
        if (file.size > this.MAX_FILE_SIZE) {
            return { valid: false, error: new AppError(ErrorCodes.PDF_TOO_LARGE) };
        }
        if (file.size === 0) {
            return { valid: false, error: new AppError(ErrorCodes.PDF_EMPTY) };
        }
        return { valid: true };
    }

    private static fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                if (reader.result instanceof ArrayBuffer) {
                    resolve(reader.result);
                } else {
                    reject(new AppError(ErrorCodes.PDF_READ_FAILED, 'Resultado da leitura não é um ArrayBuffer.'));
                }
            };
            reader.onerror = () => {
                reject(new AppError(ErrorCodes.PDF_READ_FAILED, 'Erro ao ler o arquivo PDF.'));
            };
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Extrai todo o texto de um PDF nativo (como texto único) e faz o parse.
     * Detecta automaticamente se o texto é insuficiente (PDF escaneado).
     */
    private static async extractTextFromPDF(
        pdf: pdfjsLibType.PDFDocumentProxy,
        signal?: AbortSignal
    ): Promise<{ items: CargoItem[]; isTextPoor: boolean }> {
        let totalChars = 0;
        let fullText   = '';

        logger.info(`Iniciando extração de texto de ${pdf.numPages} página(s)`);

        for (let i = 1; i <= pdf.numPages; i++) {
            if (signal?.aborted) {
                throw new AppError(ErrorCodes.OPERATION_CANCELLED, 'Extração de texto abortada');
            }

            let page;
            try {
                page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const text = textContent.items
                    .map((item: { str: string }) => item.str)
                    .join(' ');

                totalChars += text.length;
                fullText   += '\n' + text;

                logger.debug(`Página ${i}: ${text.length} caracteres extraídos`, {
                    preview: text.substring(0, 200) + (text.length > 200 ? '...' : '')
                });
            } catch (pageError) {
                logger.warn(`Erro ao extrair texto da página ${i}:`, { error: pageError });
            } finally {
                if (page) page.cleanup();
            }
        }

        // Parse de todo o texto de uma vez (o manifesto Petrobras é contínuo entre páginas)
        const header = parseHeaderInfo(fullText);
        const items  = parseManifesto(fullText, 1, header);

        const avgCharsPerPage = totalChars / pdf.numPages;
        const isTextPoor      = avgCharsPerPage < PDFExtractor.MIN_TEXT_DENSITY;

        logger.info('Extração de texto concluída', {
            totalPages: pdf.numPages,
            totalChars,
            avgCharsPerPage: avgCharsPerPage.toFixed(0),
            isTextPoor,
            itemsFound: items.length,
            header,
        });

        return { items, isTextPoor };
    }

    private static async renderPageToImage(
        pdf: pdfjsLibType.PDFDocumentProxy,
        pageNumber: number
    ): Promise<HTMLCanvasElement> {
        const page     = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = document.createElement('canvas');
        canvas.width  = viewport.width;
        canvas.height = viewport.height;

        const canvasContext = canvas.getContext('2d');
        if (!canvasContext) {
            throw new AppError(ErrorCodes.PDF_EXTRACTION_FAILED, 'Falha ao obter contexto 2D do canvas.');
        }

        try {
            await page.render({ canvas, canvasContext, viewport }).promise;
        } finally {
            page.cleanup();
        }

        return canvas;
    }

    private static rotateCanvas(original: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
        const rotated = document.createElement('canvas');
        const ctx = rotated.getContext('2d');
        if (!ctx) return original;

        // Se giro for de 90 ou -90 (270), invertemos as dimensões espaciais
        if (Math.abs(degrees) === 90 || Math.abs(degrees) === 270) {
            rotated.width = original.height;
            rotated.height = original.width;
        } else {
            rotated.width = original.width;
            rotated.height = original.height;
        }

        ctx.translate(rotated.width / 2, rotated.height / 2);
        ctx.rotate((degrees * Math.PI) / 180);
        ctx.drawImage(original, -original.width / 2, -original.height / 2);
        return rotated;
    }

    private static async performOCR(
        pdf: pdfjsLibType.PDFDocumentProxy,
        onProgress?: (progress: number) => void,
        signal?: AbortSignal
    ): Promise<CargoItem[]> {
        logger.info('Iniciando extração via OCR (Tesseract.js)');
        let fullOCRText = '';

        const worker = await createWorker('eng+por', 1, {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    logger.debug(`OCR: ${Math.round(m.progress * 100)}%`);
                    onProgress?.(Math.round(m.progress * 100));
                }
            }
        });

        try {
            for (let i = 1; i <= pdf.numPages; i++) {
                if (signal?.aborted) {
                    throw new AppError(ErrorCodes.OPERATION_CANCELLED, 'OCR abortado');
                }

                logger.info(`OCR processando página ${i} de ${pdf.numPages}`);

                const baseCanvas = await this.renderPageToImage(pdf, i);
                let text = '';
                
                // Heurística de Rotação Espacial (Mitigação para scanners invertidos)
                // O formato natural do manifesto é Paisagem. Logo, Width > Height
                const isPortrait = baseCanvas.height > baseCanvas.width;
                // Se estiver retrato, giramos; caso contário operamos no natural
                const anglesToTry = isPortrait ? [-90, 90] : [0, 180];
                
                for (const angle of anglesToTry) {
                    const canvasToOcr = angle === 0 ? baseCanvas : this.rotateCanvas(baseCanvas, angle);
                    const result = await worker.recognize(canvasToOcr);
                    text = result.data.text;
                    
                    if (angle !== 0) {
                        // Desaloca o canvas rotacionado (temp memory)
                        canvasToOcr.width = 0;
                        canvasToOcr.height = 0;
                    }
                    
                    // Validação semântica: O OCR conseguiu ler alguma palavra chave de manifesto?
                    if (/(MANIFESTO|PETROBRAS|CARGA|EQUIPAMENTO|ATENDIMENTO|ROTEIRO|PLANO|ORIGEM)/i.test(text)) {
                         logger.info(`OCR detectou orientação correta da página ${i} no ângulo ${angle}º`);
                         break; // Sucesso na orientação encontrada
                    }
                }

                // Liberar memória do canvas base
                baseCanvas.width  = 0;
                baseCanvas.height = 0;

                fullOCRText += '\n' + text;

                logger.debug(`OCR página ${i}: caracteres reconhecidos`, {
                    preview: text.substring(0, 200).replace(/\n/g, ' ')
                });
            }

            // Parse único de todo o texto OCR
            const header = parseHeaderInfo(fullOCRText);
            const items  = parseManifesto(fullOCRText, 1, header);

            logger.info('OCR concluído', { totalPages: pdf.numPages, itemsFound: items.length });
            return items;

        } finally {
            await worker.terminate();
        }
    }

    static async extract(
        file: File,
        onOCRProgress?: (progress: number) => void,
        signal?: AbortSignal
    ): Promise<ExtractionResult> {
        let pdf: pdfjsLibType.PDFDocumentProxy | null = null;

        try {
            const validation = this.validateFile(file);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }

            logger.info(`Iniciando extração: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);

            const arrayBuffer = await this.fileToArrayBuffer(file);

            try {
                const pdfjsLib = await import('pdfjs-dist');
                pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
                logger.info(`PDF.js carregado`, { version: pdfjsLib.version });

                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                pdf = await loadingTask.promise;
                logger.info(`PDF carregado com sucesso`, { pages: pdf.numPages });
            } catch (error) {
                logger.error('Erro ao carregar PDF:', error instanceof Error ? error : undefined);
                return { success: false, error: handleApplicationError(error, { code: ErrorCodes.PDF_CORRUPTED }) };
            }

            let items: CargoItem[] = [];
            let ocrAttempted = false;

            // 1ª tentativa: extração de texto nativo
            try {
                const result = await this.extractTextFromPDF(pdf, signal);
                items = result.items;

                if (result.isTextPoor) {
                    logger.info('PDF com texto escasso detectado → acionando OCR como fallback');
                    items = [];
                }
            } catch (extractionError) {
                logger.error('Erro na extração de texto:', extractionError instanceof Error ? extractionError : undefined);
                items = [];
            }

            // 2ª tentativa: OCR (se texto insuficiente)
            if (items.length === 0) {
                logger.info('Nenhum item extraído via texto. Aplicando OCR...');
                ocrAttempted = true;
                try {
                    items = await this.performOCR(pdf, onOCRProgress, signal);
                } catch (ocrError) {
                    logger.error('Erro no OCR:', ocrError instanceof Error ? ocrError : undefined);
                    items = [];
                }
            }

            if (items.length === 0) {
                logger.warn('Nenhum item de carga encontrado após todas as tentativas.');
                return {
                    success: false,
                    error: new AppError(
                        ErrorCodes.PDF_PARSING_FAILED,
                        'Nenhum item de carga encontrado no PDF. Verifique se o formato do manifesto é compatível.'
                    )
                };
            }

            logger.info(`Extração concluída: ${items.length} item(ns) encontrado(s)`);

            return {
                success: true,
                data: {
                    items,
                    metadata: {
                        pages:       pdf.numPages,
                        extractedAt: new Date(),
                        method:      ocrAttempted ? 'ocr' : 'text',
                        fileName:    file.name,
                        fileSize:    file.size,
                    }
                }
            };

        } catch (error) {
            logger.error('Erro geral na extração:', error instanceof Error ? error : undefined);
            return { success: false, error: handleApplicationError(error, { code: ErrorCodes.PDF_EXTRACTION_FAILED }) };
        } finally {
            if (pdf) {
                pdf.destroy();
                logger.debug('PDF destruído e recursos liberados');
            }
        }
    }
}
