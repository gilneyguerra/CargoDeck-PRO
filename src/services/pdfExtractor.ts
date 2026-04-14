// src/services/pdfExtractor.ts
/**
 * @file Serviço robusto para extração de dados de PDFs de manifestos de carga (CargoDeck-PRO).
 */
import { AppError, handleApplicationError } from './errorHandler';
import { logger } from '../utils/logger';
import { ErrorCodes } from '../lib/errorCodes';

// ─── Interfaces Públicas ────────────────────────────────────────────────────

export interface CargoItem {
    id: string;
    identifier: string;
    description: string;
    weight: number;            // Peso em TONELADAS
    weightKg: number;
    volume: number;
    length?: number;
    width?: number;
    height?: number;
    bay: number;
    positionX?: number;
    positionY?: number;
    rotation?: number;
    isBackload?: boolean;
    tipoDetectado?: string;
    nomeEmbarcacao?: string;
    numeroAtendimento?: string;
    origemCarga?: string;
    destinoCarga?: string;
    roteiroPrevisto?: string[];
}

interface ManifestHeader {
    nomeEmbarcacao?: string;
    numeroAtendimento?: string;
    origemCarga?: string;
    destinoCarga?: string;
    roteiroPrevisto?: string[];
}

// ─── Utilitários de Normalização ────────────────────────────────────────────

function normalizeNumber(raw: string): number {
    let s = raw.trim().replace(/[lI|]/g, '1').replace(/[oO]/g, '0');
    const commaIndex = s.lastIndexOf(',');
    const dotIndex = s.lastIndexOf('.');
    if (commaIndex > -1 && dotIndex > -1) {
        if (commaIndex > dotIndex) s = s.replace(/\./g, '').replace(',', '.');
        else s = s.replace(/,/g, '');
    } else if (commaIndex > -1) s = s.replace(',', '.');
    return parseFloat(s) || 0;
}

function kgToTonnes(kg: number): number { return kg / 1000; }

function normalizeDimension(raw: string): number {
    const s = raw.trim().replace(/[lI|]/g, '1').replace(/[oO]/g, '0');
    return parseFloat(s.replace(',', '.')) || 0;
}

// ─── Constantes e Blacklist ──────────────────────────────────────────────────

const BACKLOAD_KEYWORDS = ['desembarque', 'removido', 'removida', 'retorno', 'backload', 'descarga', 'offload'];

const SHIP_CODE_BLACKLIST = /^(PETROBRAS|MANIFESTO|BASE|EMPRESA|RECEBIMENTO|UN|UND|KG|TON|TN|PC|SC|CX|GL|LT|FT3|M3|BBL|OUT|OBS|DATA|HORA|PAG|PARA|PORTO|LOCAL|AREA|ATENDIMENTO|ROTEIRO|ORIGEM|DESTINO|DE|DO|DA|NA|NO|EM|AO|OS|AS|IT|AT|RT|EMB|SUB)$/i;

const CARGO_TYPES: Record<string, string> = {
    'CONTAINER': 'CONTAINER', 'CONT ': 'CONTAINER', 'CESTA': 'BASKET', 'BASKET': 'BASKET',
    'TUBULAR': 'TUBULAR', 'RISER': 'TUBULAR', 'PIPE': 'TUBULAR', 'TUBO': 'TUBULAR',
    'BOP': 'EQUIPMENT', 'SKID': 'EQUIPMENT', 'EQUIPAMENTO': 'EQUIPMENT', 'TANQUE': 'EQUIPMENT'
};

// ─── Extração do Cabeçalho ───────────────────────────────────────────────────

function parseHeaderInfo(fullText: string): ManifestHeader {
    const header: ManifestHeader = {};
    const atendimentoMatch = fullText.match(/ATENDIMENTO\s*[:\-]\s*(\d{7,12})/i) || fullText.match(/\b(5\d{8})\b/);
    if (atendimentoMatch) header.numeroAtendimento = atendimentoMatch[1].trim();

    const embarcacaoMatch = fullText.match(/EQUIPAMENTO\s+\d+\s+([A-ZÁÉÍÓÚÀÂÃÊÕÜ][A-ZÁÉÍÓÚÀÂÃÊÕÜ\s]{2,35})/m);
    if (embarcacaoMatch) {
        const candidate = embarcacaoMatch[1].trim();
        if (!candidate.match(SHIP_CODE_BLACKLIST)) header.nomeEmbarcacao = candidate;
    }

    const roteiroMatch = fullText.match(/Roteiro\s+previsto\s+([A-Z0-9]{2,6}(?:\s*->\s*[A-Z0-9]{2,6}){2,})/i);
    let validCodes = new Set<string>();
    if (roteiroMatch) {
        header.roteiroPrevisto = roteiroMatch[1].split(/\s*->\s*/).map(s => s.trim().toUpperCase());
        validCodes = new Set(header.roteiroPrevisto);
    }

    const sectionHeaderRegex = /\b([A-Z0-9]{2,6})\s+([A-Z\sÀ-ÿ0-9.-]{3,35}?)\s+([A-Z0-9]{2,6})\s+([A-Z\sÀ-ÿ0-9.-]{3,35})/g;
    let secMatch;
    while ((secMatch = sectionHeaderRegex.exec(fullText)) !== null) {
        const origemAcronym = secMatch[1].trim().toUpperCase();
        const destinoAcronym = secMatch[3].trim().toUpperCase();
        
        if (origemAcronym.match(SHIP_CODE_BLACKLIST) || destinoAcronym.match(SHIP_CODE_BLACKLIST)) continue;
        
        if (validCodes.size > 0 && (!validCodes.has(origemAcronym) || !validCodes.has(destinoAcronym))) {
            continue;
        }

        header.origemCarga = origemAcronym;
        header.destinoCarga = destinoAcronym;
        break; // Tenta pegar o primeiro válido
    }

    return header;
}

function detectCargoType(text: string): string | undefined {
    const upper = text.toUpperCase();
    for (const [keyword, tipo] of Object.entries(CARGO_TYPES)) {
        if (upper.includes(keyword)) return tipo;
    }
    return undefined;
}

function extractIdentifier(text: string): string | undefined {
    // 1. Padrões comuns de prefixo + número (ex: U2 JF0158, T10 JF0049, KD123, SOS-12)
    const containerMatch = text.match(/\b([A-Z0-9]{2,4}\s?[A-Z]{2}\s?\d{4,7})\b/i) || 
                           text.match(/\b([A-Z]{2,4}[-]?\d{3,7})\b/i);
    if (containerMatch) return containerMatch[1].replace(/\s+/, ' ').toUpperCase().trim();

    // 2. Padrões puramente alfanuméricos de 6-11 chars (evitando números de manifesto)
    const alphanumeric = text.match(/\b([A-Z]{3,4}\s?\d{6,7}[-]?\d?)\b/);
    if (alphanumeric) return alphanumeric[1].replace(/\s+/, ' ').trim();

    // 3. Padrão numérico final (como o 12239030 do exemplo)
    const numericMatch = text.match(/\b(\d{5,9}-\d{1,2})\b/) || text.match(/\b(\d{7,9})\b/);
    return numericMatch?.[1];
}

// ─── Parser Principal ────────────────────────────────────────────────────────

function parseManifesto(text: string, pageNumber: number, header: ManifestHeader): CargoItem[] {
    const validCodes = new Set(header.roteiroPrevisto || []);
    const sectionHeaderRegex = /\b([A-Z0-9]{2,6})\s+([A-Z\sÀ-ÿ0-9.-]{3,35}?)\s+([A-Z0-9]{2,6})\s+([A-Z\sÀ-ÿ0-9.-]{3,35})/g;
    
    const sectionHeaders = [...text.matchAll(sectionHeaderRegex)]
        .filter(sh => {
            const origemAcronym = sh[1].trim().toUpperCase();
            const destinoAcronym = sh[3].trim().toUpperCase();
            if (origemAcronym.match(SHIP_CODE_BLACKLIST) || destinoAcronym.match(SHIP_CODE_BLACKLIST)) return false;
            if (validCodes.size > 0 && (!validCodes.has(origemAcronym) || !validCodes.has(destinoAcronym))) return false;
            return true;
        })
        .map(sh => ({ pos: sh.index ?? 0, origem: sh[1].trim(), destino: sh[3].trim() }));

    function getSectionFor(pos: number) {
        let best = { origem: header.origemCarga ?? '', destino: header.destinoCarga ?? '' };
        for (const sec of sectionHeaders) {
            if (sec.pos <= pos) best = sec;
            else break;
        }
        return best;
    }

    const allParsedItems: Array<{ index: number, isEmbalagem: boolean, data: Partial<CargoItem>, hasExplicitId?: boolean, rawDesc: string }> = [];

    // Padrão: Embalagens Cadastradas (cestas que contém outras cargas)
    const embalagemPattern = /\bEMBALAGEM CADASTRADA\s+([A-Z]{3,4}\s?\d{6,7}[-]?\d?)\s+(.{3,100}?)\s+([\d.,lI|oO]+)\s*[xX×]\s*([\d.,lI|oO]+)\s*[xX×]\s*([\d.,lI|oO]+)\s+([\d.,lI|oO]+)/gi;
    let embMatch: RegExpExecArray | null;
    while ((embMatch = embalagemPattern.exec(text)) !== null) {
        try {
            const identifier = embMatch[1].replace(/\s+/, ' ').trim();
            const rawDesc = `EMBALAGEM CADASTRADA ${identifier} ${embMatch[2].trim()}`;
            const length = normalizeDimension(embMatch[3]);
            const width = normalizeDimension(embMatch[4]);
            const height = normalizeDimension(embMatch[5]);
            const rawWeight = normalizeNumber(embMatch[6]);
            
            allParsedItems.push({
                index: embMatch.index,
                isEmbalagem: true,
                hasExplicitId: true,
                rawDesc,
                data: {
                    identifier,
                    description: rawDesc,
                    weight: rawWeight, // Peso em KG por enquanto
                    length, width, height,
                }
            });
        } catch (e) { logger.warn('Erro parse embalagem', e); }
    }

    // Padrão: Cargas Normais
    const petrobrasPattern = /\b(\d{3,4})\s+(\d{6,12})\s+\d{4}\/\d{4}\s+[\d,.]+\s+(UN|BBL|M|M3|FT3|PE3|KG|TON|CX|PC|SC|GL|LT|TN|UND)\s+(.{5,150}?)\s+([\d.,lI|oO]+)\s*[xX×]\s*([\d.,lI|oO]+)\s*[xX×]\s*([\d.,lI|oO]+)\s+([\d.,lI|oO]+)/gi;
    let m: RegExpExecArray | null;
    while ((m = petrobrasPattern.exec(text)) !== null) {
        try {
            const unit = m[3].toUpperCase();
            const rawDesc = m[4].trim();
            if (rawDesc.match(/^(PETROBRAS|MANIFESTO|TRANSPORTE|DATA|HORA|PAG)/i)) continue;

            const length = normalizeDimension(m[5]);
            const width = normalizeDimension(m[6]);
            const height = normalizeDimension(m[7]);
            
            // Ignorar itens de granel (Bulk) com dimensões zero
            if (length === 0 || width === 0) continue;

            const rawWeight = normalizeNumber(m[8]);
            const isTon = unit.includes('TON') || unit === 'TN';
            const weightTonnes = isTon ? rawWeight : kgToTonnes(rawWeight);

            const explicitId = extractIdentifier(rawDesc);
            const hasExplicitId = !!explicitId;
            const identifier = explicitId ?? m[2];
            const id = `${identifier}-${m[1]}`;

            allParsedItems.push({
                index: m.index,
                isEmbalagem: false,
                hasExplicitId,
                rawDesc,
                data: {
                    id,
                    identifier,
                    description: rawDesc.substring(0, 120),
                    weight: weightTonnes,
                    weightKg: isTon ? weightTonnes * 1000 : rawWeight,
                    volume: length * width * height,
                    length, width, height, bay: pageNumber
                }
            });
        } catch (e) { logger.warn('Erro item pat1', e); }
    }

    // Processar os items extraídos na ordem em que aparecem no PDF
    allParsedItems.sort((a, b) => a.index - b.index);

    const items: CargoItem[] = [];
    const seenIds = new Set<string>();
    let skipLooseItemsMode = false;

    for (const item of allParsedItems) {
        if (item.isEmbalagem) {
            skipLooseItemsMode = true; // Ativa skipping, sub-itens serão ignorados
            const sec = getSectionFor(item.index);
            const id = `${item.data.identifier}-EMB-${item.index}`;
            
            if (!seenIds.has(id)) {
                seenIds.add(id);
                // rawWeight das cestas quase sempre vem em KG no manifesto
                const weightTonnes = kgToTonnes(item.data.weight!);

                items.push({
                    ...item.data,
                    id,
                    weight: weightTonnes,
                    weightKg: item.data.weight!,
                    volume: item.data.length! * item.data.width! * (item.data.height || 1),
                    bay: pageNumber,
                    origemCarga: sec.origem,
                    destinoCarga: sec.destino,
                    isBackload: BACKLOAD_KEYWORDS.some(kw => item.rawDesc.toLowerCase().includes(kw)),
                    tipoDetectado: detectCargoType(item.rawDesc) || 'BASKET',
                    nomeEmbarcacao: header.nomeEmbarcacao, 
                    numeroAtendimento: header.numeroAtendimento, 
                    roteiroPrevisto: header.roteiroPrevisto
                } as CargoItem);
            }
        } else {
            // Item normal
            if (item.hasExplicitId) {
                // Ao encontrar outro contêiner mãe na sequência, desabilita skipping
                skipLooseItemsMode = false;
            } else if (skipLooseItemsMode) {
                // Item solto (ex. "TUBO PROD") localizado debaixo da "EMBALAGEM CADASTRADA" 
                continue; 
            }

            if (!seenIds.has(item.data.id!)) {
                seenIds.add(item.data.id!);
                const sec = getSectionFor(item.index);
                items.push({
                    ...item.data,
                    origemCarga: sec.origem,
                    destinoCarga: sec.destino,
                    isBackload: BACKLOAD_KEYWORDS.some(kw => item.rawDesc.toLowerCase().includes(kw)),
                    tipoDetectado: detectCargoType(item.rawDesc),
                    nomeEmbarcacao: header.nomeEmbarcacao, 
                    numeroAtendimento: header.numeroAtendimento, 
                    roteiroPrevisto: header.roteiroPrevisto
                } as CargoItem);
            }
        }
    }

    return items;
}

export class PDFExtractor {
    static validateFile(file: File): { valid: true } | { valid: false; error: AppError } {
        if (file.type !== 'application/pdf') {
            return { valid: false, error: new AppError(ErrorCodes.PDF_INVALID_TYPE) };
        }
        if (file.size > 50 * 1024 * 1024) {
            return { valid: false, error: new AppError(ErrorCodes.PDF_TOO_LARGE) };
        }
        return { valid: true };
    }

    /**
     * Extrai texto de uma página usando canvas + Tesseract OCR.
     * Chamado como fallback quando a extração de texto nativa retorna vazio.
     */
    private static async ocrPage(page: any, onProgress?: (p: number) => void): Promise<string> {
        const { createWorker } = await import('tesseract.js');
        
        const scale = 2.0; // Renderiza em 2x para melhor precisão do OCR
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        
        await page.render({ canvasContext: ctx, viewport }).promise;
        const imageDataUrl = canvas.toDataURL('image/png');
        
        const worker = await createWorker('por+eng', 1, {
            logger: (m: any) => {
                if (m.status === 'recognizing text' && onProgress) {
                    onProgress(Math.round(m.progress * 100));
                }
            }
        });
        
        try {
            const { data: { text } } = await worker.recognize(imageDataUrl);
            return text;
        } finally {
            await worker.terminate();
        }
    }

    static async extract(file: File, onProgress?: (p: number) => void, _signal?: AbortSignal): Promise<ExtractionResult> {
        try {
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                fullText += '\n' + content.items.map((it: any) => it.str).join(' ');
            }

            // ─── Detecção de PDF Escaneado (sem texto) ───────────────────────
            // Se o texto extraído for muito pequeno (< 100 chars úteis), o PDF é
            // provavelmente uma imagem escaneada. Ativamos o fallback de OCR.
            const usefulChars = fullText.replace(/\s+/g, '').length;
            if (usefulChars < 100) {
                logger.info(`PDF "${file.name}" parece ser escaneado (apenas ${usefulChars} chars úteis). Ativando OCR...`);
                
                fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const pageText = await PDFExtractor.ocrPage(page, (pct) => {
                        if (onProgress) {
                            // Mapeia progresso da página na faixa global
                            const globalPct = Math.round(((i - 1) / pdf.numPages + pct / 100 / pdf.numPages) * 100);
                            onProgress(globalPct);
                        }
                    });
                    fullText += '\n' + pageText;
                    logger.info(`OCR página ${i}/${pdf.numPages} concluída.`);
                }
                
                const header = parseHeaderInfo(fullText);
                const items = parseManifesto(fullText, 1, header);
                return { success: true, data: { items, metadata: { pages: pdf.numPages, extractedAt: new Date(), method: 'ocr', fileName: file.name, fileSize: file.size } } };
            }
            // ─── Extração Normal (PDF com texto) ─────────────────────────────

            const header = parseHeaderInfo(fullText);
            const items = parseManifesto(fullText, 1, header);

            return { success: true, data: { items, metadata: { pages: pdf.numPages, extractedAt: new Date(), method: 'text', fileName: file.name, fileSize: file.size } } };
        } catch (e) { return { success: false, error: handleApplicationError(e) }; }
    }
}

export type ExtractionResult = 
    | { success: true; data: { items: CargoItem[]; metadata: any }; error?: never }
    | { success: false; error: AppError; data?: never };
