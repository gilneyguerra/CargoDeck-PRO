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

const SHIP_CODE_BLACKLIST = /^(PETROBRAS|MANIFESTO|BASE|EMPRESA|RECEBIMENTO|UN|UND|KG|TON|TN|PC|SC|CX|GL|LT|FT3|M3|BBL|OUT|OBS|DATA|HORA|PAG|PARA|PORTO|LOCAL|AREA|ATENDIMENTO|ROTEIRO)$/i;

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
    if (roteiroMatch) {
        header.roteiroPrevisto = roteiroMatch[1].split(/\s*->\s*/).map(s => s.trim().toUpperCase());
    }

    const sectionHeaderMatch = fullText.match(/\b([A-Z]{2,6})\s{2,}([A-Z\sÀ-ÿ]{3,35})\s{3,}([A-Z]{2,6})\s{2,}([A-Z\sÀ-ÿ]{3,35})/);
    if (sectionHeaderMatch && !sectionHeaderMatch[1].match(SHIP_CODE_BLACKLIST)) {
        header.origemCarga = sectionHeaderMatch[1].trim();
        header.destinoCarga = sectionHeaderMatch[3].trim();
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
    const containerMatch = text.match(/\b([A-Z]{3,4}\s?\d{6,7}[-]?\d?)\b/);
    if (containerMatch) return containerMatch[1].replace(/\s+/, ' ').trim();
    const numericMatch = text.match(/\b(\d{5,9}-\d{1,2})\b/) || text.match(/\b(\d{5,9})\b/);
    return numericMatch?.[1];
}

// ─── Parser Principal ────────────────────────────────────────────────────────

function parseManifesto(text: string, pageNumber: number, header: ManifestHeader, currentShipCode?: string): CargoItem[] {
    const items: CargoItem[] = [];
    const seenIds = new Set<string>();

    const sectionHeaderRegex = /\b([A-Z]{2,6})\s{2,}([A-Z\sÀ-ÿ]{3,35})\s{3,}([A-Z]{2,6})\s{2,}([A-Z\sÀ-ÿ]{3,35})/g;
    const sectionHeaders = [...text.matchAll(sectionHeaderRegex)]
        .filter(sh => !sh[1].match(SHIP_CODE_BLACKLIST) && !sh[3].match(SHIP_CODE_BLACKLIST))
        .map(sh => ({ pos: sh.index ?? 0, origem: sh[1].trim(), destino: sh[3].trim() }));

    function getSectionFor(pos: number) {
        let best = { origem: header.origemCarga ?? '', destino: header.destinoCarga ?? '' };
        for (const sec of sectionHeaders) {
            if (sec.pos <= pos) best = sec;
            else break;
        }
        return best;
    }

    // Padrão 1: Com dimensões
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
            const rawWeight = normalizeNumber(m[8]);
            const isTon = unit.includes('TON') || unit === 'TN';
            const weightTonnes = isTon ? rawWeight : kgToTonnes(rawWeight);

            const identifier = extractIdentifier(rawDesc) ?? m[2];
            const sec = getSectionFor(m.index ?? 0);
            const id = `${identifier}-${m[1]}`;

            if (!seenIds.has(id)) {
                seenIds.add(id);
                items.push({
                    id, identifier, description: rawDesc.substring(0, 120),
                    weight: weightTonnes, weightKg: isTon ? weightTonnes * 1000 : rawWeight,
                    volume: length * width * height, length, width, height, bay: pageNumber,
                    origemCarga: sec.origem, destinoCarga: sec.destino,
                    isBackload: !!(currentShipCode && sec.origem.includes(currentShipCode) && !sec.destino.includes(currentShipCode)) || BACKLOAD_KEYWORDS.some(kw => rawDesc.toLowerCase().includes(kw)),
                    tipoDetectado: detectCargoType(rawDesc),
                    nomeEmbarcacao: header.nomeEmbarcacao, numeroAtendimento: header.numeroAtendimento, roteiroPrevisto: header.roteiroPrevisto
                });
            }
        } catch (e) { logger.warn('Erro item pat1', e); }
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

    static async extract(file: File, _onProgress?: (p: number) => void, _signal?: AbortSignal, currentShipCode?: string): Promise<ExtractionResult> {
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

            const header = parseHeaderInfo(fullText);
            const items = parseManifesto(fullText, 1, header, currentShipCode);

            return { success: true, data: { items, metadata: { pages: pdf.numPages, extractedAt: new Date(), method: 'text', fileName: file.name, fileSize: file.size } } };
        } catch (e) { return { success: false, error: handleApplicationError(e) }; }
    }
}

export type ExtractionResult = 
    | { success: true; data: { items: CargoItem[]; metadata: any }; error?: never }
    | { success: false; error: AppError; data?: never };
