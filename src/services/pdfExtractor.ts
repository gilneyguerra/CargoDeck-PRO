// src/services/pdfExtractor.ts
/**
 * @file Serviço robusto para extração de dados de PDFs de manifestos de carga (CargoDeck-PRO).
 * PERF: Páginas são extraídas em paralelo (Promise.all).
 * PERF: Worker Tesseract é inicializado uma única vez e reutilizado por todas as páginas no modo OCR.
 */
import { AppError, handleApplicationError } from './errorHandler';
import { logger } from '../utils/logger';
import { ErrorCodes } from '../lib/errorCodes';
import { imagePreprocessor } from './imagePreprocessor';

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
    // Novos campos (Seção 5)
    dataExtracao?: string;
    fonteManifesto?: string;
    tamanhoFisico?: {
        larguraPixels: number;
        alturaPixels: number;
        profundidadePixels: number;
        escala: number;
    };
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
    // Remove qualquer caractere que não seja dígito, vírgula ou ponto no final para evitar ruído OCR
    s = s.replace(/[^0-9,.]/g, ''); 
    const commaIndex = s.lastIndexOf(',');
    const dotIndex = s.lastIndexOf('.');
    if (commaIndex > -1 && dotIndex > -1) {
        if (commaIndex > dotIndex) s = s.replace(/\./g, '').replace(',', '.');
        else s = s.replace(/,/g, '');
    } else if (commaIndex > -1) s = s.replace(',', '.');
    return parseFloat(s) || 0;
}



function normalizeDimension(raw: string): number {
    if (!raw) return 0;
    let s = raw.trim()
        .replace(/[lI|L]/g, '1')
        .replace(/[oO]/g, '0')
        .replace(/[£EZ]/g, '2')
        .replace(/[S]/g, '5')
        .replace(/[B]/g, '8');
    
    // Converte vírgula decimal para ponto e remove espaços
    s = s.replace(/\s+/g, '').replace(',', '.');
    // Mantém apenas o primeiro ponto decimal, remove os outros (ruído OCR)
    const parts = s.split('.');
    if (parts.length > 2) {
        s = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Remove qualquer caractere não numérico restante exceto o ponto
    s = s.replace(/[^0-9.]/g, '');
    
    return parseFloat(s) || 0;
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
    
    // 1. Número do Atendimento (Circulado em preto no cabeçalho)
    const atendimentoMatch = fullText.match(/ATENDIMENTO\s*[:-]?\s*(\d{7,12})/i) || fullText.match(/\b(5\d{8,11})\b/);
    if (atendimentoMatch) header.numeroAtendimento = atendimentoMatch[1].trim();

    // 2. Nome da Embarcação (No cabeçalho, circulado em preto)
    // Busca por padrões comuns de nomes de navios ou prefixos
    const embarcacaoMatch = fullText.match(/EMBARCAÇÃO\s*[:-]?\s*([A-ZÁÉÍÓÚÀÂÃÊÕÜ][A-ZÁÉÍÓÚÀÂÃÊÕÜ\s]{2,35})/i) ||
                            fullText.match(/NAVIO\s*[:-]?\s*([A-ZÁÉÍÓÚÀÂÃÊÕÜ][A-ZÁÉÍÓÚÀÂÃÊÕÜ\s]{2,35})/i) ||
                            fullText.match(/EQUIPAMENTO\s+\d+\s+([A-ZÁÉÍÓÚÀÂÃÊÕÜ][A-ZÁÉÍÓÚÀÂÃÊÕÜ\s]{2,35})/m);
    if (embarcacaoMatch) {
        const candidate = embarcacaoMatch[1].trim();
        if (!candidate.match(SHIP_CODE_BLACKLIST)) header.nomeEmbarcacao = candidate;
    }

    // 3. Roteiro Previsto — suporta separadores → / -> / - / espaço duplo
    const roteiroRegex = /(?:Roteiro Previsto(?:\s+de\s+Cargas)?|ROTEIRO(?:\s+PREVISTO)?)\s*[:-]?\s*([A-Z0-9][→a-zA-Z0-9\s\->/]+)/i;
    const roteiroMatch = fullText.match(roteiroRegex);
    if (roteiroMatch) {
        header.roteiroPrevisto = roteiroMatch[1]
            .split(/\s*[→>]\s*|\s*->\s*|\s{2,}/)
            .map(s => s.replace(/^[-\s]+|[-\s]+$/g, '').trim().toUpperCase())
            .filter(s => /^[A-Z0-9]{2,10}$/.test(s));
    }

    // 4. Local de Origem / Destino — aceita "Local de Origem", para na quebra de linha, limite 80 chars
    const origemRegex = /(?:(?:Local\s+de\s+)?Origem|ORIGEM)\s*[:-]?\s*([^\n\r]{2,80})/i;
    const destinoRegex = /(?:(?:Local\s+de\s+)?Destino|DESTINO)\s*[:-]?\s*([^\n\r]{2,80})/i;

    const oMatch = fullText.match(origemRegex);
    const dMatch = fullText.match(destinoRegex);

    if (oMatch) header.origemCarga = oMatch[1].replace(/\s+/g, ' ').trim().toUpperCase();
    if (dMatch) header.destinoCarga = dMatch[1].replace(/\s+/g, ' ').trim().toUpperCase();

    // Fallback: Busca via seção (acrônimos ou nomes) se os padrões explícitos falharem
    if (!header.origemCarga || !header.destinoCarga) {
        const sectionHeaderRegex = /\b([A-Z0-9]{2,6})\s+([A-Z\sÀ-ÿ0-9.-]{3,40}?)\s+([A-Z0-9]{2,6})\s+([A-Z\sÀ-ÿ0-9.-]{3,40})/g;
        let secMatch;
        while ((secMatch = sectionHeaderRegex.exec(fullText)) !== null) {
            const oName = (secMatch[2] || secMatch[1]).trim().toUpperCase();
            const dName = (secMatch[4] || secMatch[3]).trim().toUpperCase();
            
            if (oName.match(SHIP_CODE_BLACKLIST) || dName.match(SHIP_CODE_BLACKLIST)) continue;

            if (!header.origemCarga) header.origemCarga = oName;
            if (!header.destinoCarga) header.destinoCarga = dName;
            break;
        }
    }

    return header;
}

/**
 * Gera um ID único via SHA-256 baseado no identificador e contexto logístico.
 */
async function generateUniqueId(codigo: string, origem: string, destino: string): Promise<string> {
    const base = `${codigo.toUpperCase().replace(/\s/g, '')}${origem.toUpperCase()}${destino.toUpperCase()}`;
    const msgUint8 = new TextEncoder().encode(base);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function detectCargoType(text: string): string | undefined {
    const upper = text.toUpperCase();
    for (const [keyword, tipo] of Object.entries(CARGO_TYPES)) {
        if (upper.includes(keyword)) return tipo;
    }
    return undefined;
}

function validateISO6346(containerId: string): boolean {
    const cleanId = containerId.replace(/[\s-]/g, '').toUpperCase();
    if (cleanId.length !== 11) return false;
    
    const charMap: Record<string, number> = {
        'A':10, 'B':12, 'C':13, 'D':14, 'E':15, 'F':16, 'G':17, 'H':18, 'I':19,
        'J':20, 'K':21, 'L':23, 'M':24, 'N':25, 'O':26, 'P':27, 'Q':28, 'R':29,
        'S':30, 'T':31, 'U':32, 'V':34, 'W':35, 'X':36, 'Y':37, 'Z':38
    };

    try {
        let total = 0;
        for (let i = 0; i < 10; i++) {
            const char = cleanId[i];
            const val = !isNaN(parseInt(char)) ? parseInt(char) : charMap[char];
            if (val === undefined) return false;
            total += val * Math.pow(2, i);
        }
        const checkDigit = (total % 11) % 10;
        return checkDigit === parseInt(cleanId[10]);
    } catch {
        return false;
    }
}

function extractIdentifier(text: string): string | undefined {
    // 1. Regra de Exclusão Crítica (Seção 2): Eslingas e Acessórios
    // Bloqueia identificadores que venham após ESLINGA ou ESL. (Negative Lookbehind simulado por Regex)
    const eslingaPattern = /(?:ESL\.|ESLINGA|ACESSÓRIO)\s*[:\-]?\s*([A-Z0-9]{4,12})/gi;
    let textModified = text;
    let eslingaMatch;
    while ((eslingaMatch = eslingaPattern.exec(text)) !== null) {
        textModified = textModified.replace(eslingaMatch[0], '[[ESLINGA_BLOCKED]]');
    }

    // 2. Regex Otimizada: Procura por códigos em qualquer posição da string
    // [A-Z]{1,4} seguido ou não de espaço e 4 a 9 dígitos
    const identifierPatterns = [
        /([A-Z]{1,4}\s?\d{4,9})/gi,
        /\b(\d{6,10})\b/g // Códigos puramente numéricos
    ];

    for (const pattern of identifierPatterns) {
        const matches = textModified.match(pattern);
        if (matches) {
            for (const match of matches) {
                const clean = match.trim().toUpperCase().replace(/\s/g, '');
                if (clean === 'ESLINGA') continue;
                
                // Validação ISO 6346 para Containers (sempre tem prioridade se tiver 10-11 chars)
                if (clean.length >= 10 && validateISO6346(clean)) return clean;

                // Filtra IDs numéricos de 6 ou 8 dígitos que parecem datas (DDMMYY / DDMMYYYY)
                if (/^\d+$/.test(clean) && (clean.length === 6 || clean.length === 8)) {
                    const dd = parseInt(clean.slice(0, 2), 10);
                    const mm = parseInt(clean.slice(2, 4), 10);
                    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) continue;
                }

                // Se não for container mas tiver formato válido
                if (clean.length >= 4) return clean;
            }
        }
    }

    return undefined;
}

// ─── Parser Principal ────────────────────────────────────────────────────────

async function parseManifesto(text: string, pageNumber: number, header: ManifestHeader): Promise<CargoItem[]> {
    // Máquina de Estados para Contexto Logístico (Seção 3.3 do Guia Detalhado)
    let currentOrigin = header.origemCarga || 'PACU';
    let currentDestination = header.destinoCarga || header.nomeEmbarcacao || 'DESCONHECIDO';

    // Regex para detecção de mudança de seção e Trechos (Seção 2.2 do diagnóstico)
    const originDelimiterRegex = /(?:ORIGEM|Nº\s*TRECHO\s*\d+):\s*([A-Z0-9\sÀ-ÿ.-]{3,40})/gi;
    const destDelimiterRegex = /DESTINO:\s*([A-Z0-9\sÀ-ÿ.-]{3,40})/gi;

    // Mapear posições de mudança de seção (Detecção de Novos Trechos)
    const sectionChanges: { pos: number, origem: string, destino: string }[] = [];
    
    let match;
    while ((match = originDelimiterRegex.exec(text)) !== null) {
        let detectedOrigin = match[1].trim().toUpperCase();
        // Se capturou o prefixo do trecho, tenta limpar
        detectedOrigin = detectedOrigin.replace(/^TRECHO\s*\d+\s*[:-]?\s*/i, '');
        sectionChanges.push({ pos: match.index, origem: detectedOrigin, destino: currentDestination });
    }
    
    // Reset para busca de destino
    destDelimiterRegex.lastIndex = 0;
    while ((match = destDelimiterRegex.exec(text)) !== null) {
        currentDestination = match[1].trim().toUpperCase();
        // Tenta associar ao marker de origem mais próximo
        const nearOrigin = sectionChanges.find(s => Math.abs(s.pos - (match?.index || 0)) < 250);
        if (nearOrigin) {
            nearOrigin.destino = currentDestination;
        } else {
            sectionChanges.push({ pos: match.index, origem: currentOrigin, destino: currentDestination });
        }
    }
    
    sectionChanges.sort((a, b) => a.pos - b.pos);

    function getSectionFor(pos: number) {
        let best = { origem: header.origemCarga || 'PACU', destino: header.destinoCarga || header.nomeEmbarcacao || '' };
        for (const sec of sectionChanges) {
            if (sec.pos <= pos) {
                best = sec;
            } else break;
        }
        return best;
    }

    const allParsedItems: Array<{ index: number, isEmbalagem: boolean, data: Partial<CargoItem>, hasExplicitId?: boolean, rawDesc: string }> = [];

    // Padrão: Embalagens Cadastradas (cestas que contém outras cargas)
    const embalagemPattern = /\bEMBALAGEM CADASTRADA\s+([A-Z]{3,4}\s?\d{6,7}[-]?\d?)\s+(.{3,100}?)\s+([\d.,lI|oO]+)\s*[xX×]\s*([\d.,lI|oO]+)\s*[xX×]\s*([\d.,lI|oO]+)\s+([\d.,lI|oO]+)/gi;
    let embMatch: RegExpExecArray | null;
    while ((embMatch = embalagemPattern.exec(text)) !== null) {
        try {
            const identifier = embMatch[1].replace(/\s+/, ' ').toUpperCase().trim();
            const rawDesc = `EMBALAGEM CADASTRADA ${identifier} ${embMatch[2].trim()}`;
            const length = normalizeDimension(embMatch[3]);
            const width = normalizeDimension(embMatch[4]);
            const height = normalizeDimension(embMatch[5]);
            const rawWeight = normalizeNumber(embMatch[6]);
            
            const sec = getSectionFor(embMatch.index);
            const finalId = await generateUniqueId(identifier, sec.origem, sec.destino || header.destinoCarga || '');

            allParsedItems.push({
                index: embMatch.index,
                isEmbalagem: true,
                hasExplicitId: true,
                rawDesc,
                data: {
                    id: finalId,
                    identifier,
                    description: rawDesc,
                    weight: Number((rawWeight / 1000).toFixed(2)), // Peso em TON
                    weightKg: rawWeight,
                    length, width, height,
                }
            });
        } catch (e) { logger.warn('Erro parse embalagem', e); }
    }

    // Padrão: Cargas Normais (Petrobras/TAGAZ e Genérico)
    // Atualizado com regex sugerida na Seção 7 para dimensões e suporte a múltiplos formatos
    const patterns = [
        // 1. Padrão Petrobras Tradicional
        /\b(\d{3,4})\s+(\d{6,12})\s+\d{1,4}\/\d{1,4}\s+[\d,.]+\s+(UN|BBL|M|M3|FT3|PE3|KG|TON|CX|PC|SC|GL|LT|TN|UND)\s+(.{5,150}?)\s+([\d.,lI|oO]+)\s*[xX×-]\s*([\d.,lI|oO]+)\s*[xX×-]\s*([\d.,lI|oO]+)\s+([\d.,lI|oO]+)\s*(?:KG|TON|TN)?/gi,
        // 2. Padrão Genérico/CBO
        /\b(\d{3,4})\s+(\d{6,12}|[A-Z0-9-]{6,15})\s+(?:\d{1,4}\/\d{1,4}\s+[\d,.]+\s+)?(UN|BBL|M|M3|FT3|PE3|KG|TON|CX|PC|SC|GL|LT|TN|UND)\s+(.{5,150}?)\s+([\d.,lI|oO]+)\s*[xX×-]\s*([\d.,lI|oO]+)\s*[xX×-]\s*([\d.,lI|oO]+)\s+([\d.,lI|oO]+)\s*(?:KG|TON|TN)?/gi
    ];

    for (const pattern of patterns) {
        let m: RegExpExecArray | null;
        while ((m = pattern.exec(text)) !== null) {
            try {
                // Se o pattern for o segundo, os índices mudam
                const isGeneric = pattern.source.includes('[A-Z0-9-]{6,15}');
                const unit = (isGeneric ? m[3] : m[3]).toUpperCase();
                const rawDesc = (isGeneric ? m[4] : m[4]).trim();
                
                if (rawDesc.match(/^(PETROBRAS|MANIFESTO|TRANSPORTE|DATA|HORA|PAG)/i)) continue;

                const length = normalizeDimension(isGeneric ? m[5] : m[5]);
                const width = normalizeDimension(isGeneric ? m[6] : m[6]);
                const height = normalizeDimension(isGeneric ? m[7] : m[7]);
                
                // Ignorar itens de granel (Bulk) com dimensões zero
                if (length === 0 || width === 0) continue;

                const rawWeight = normalizeNumber(isGeneric ? m[8] : m[8]);
                const isTon = unit.includes('TON') || unit === 'TN';
                
                // Normalização de Peso (Seção 3.2): KG para TON (divisão por 1000)
                const weightTonnes = isTon ? rawWeight : Number((rawWeight / 1000).toFixed(2));
                const weightKg = isTon ? Number((rawWeight * 1000).toFixed(0)) : rawWeight;

                const explicitId = extractIdentifier(rawDesc);
                const identifierRaw = (explicitId ?? (isGeneric ? m[2] : m[2])).replace(/[\n\r]+/g, ' ').trim();
                // Limpeza agressiva do identificador para remover ruído do cabeçalho
                const identifier = identifierRaw
                    .replace(/DATA\s*[:\-]?\s*\d{2}\/\d{2}\/\d{4}/gi, '')
                    .replace(/HORA\s*[:\-]?\s*\d{2}:\d{2}(?::\d{2})?/gi, '')
                    .replace(/PAG\s*[:\-]?\s*\d+\/\d+/gi, '')
                    .replace(/\b(PETROBRAS|MANIFESTO|TRANSPORTE|CARGAS|EMPRESA|ATENDIMENTO|EQUIPAMENTO|CBO|FLAMENGO|BASE|PACU|DATA|HORA|PAG|UNIT|UND|BBL|DESCRIÇÃO|ITEM|QTDE|CX|LXA|PESO|VALOR|MDA|GERÊNCIA)\b/gi, '')
                    .replace(/[|\/\-\:\s]+/g, ' ')
                    .trim();

                const id = `${identifier}-${m[1]}`;

                // Evita duplicatas se múltiplos patterns pegarem o mesmo item ou se o identificador já foi visto nesta extração
                if (allParsedItems.some(item => item.data.id === id || (identifier && identifier.length > 3 && item.data.identifier === identifier))) {
                    continue;
                }

                const sec = getSectionFor(m.index);
                const finalId = await generateUniqueId(identifier, sec.origem, sec.destino || header.destinoCarga || '');

                allParsedItems.push({
                    index: m.index,
                    isEmbalagem: false,
                    hasExplicitId: !!explicitId,
                    rawDesc,
                    data: {
                        id: finalId,
                        identifier,
                        description: rawDesc.substring(0, 120),
                        weight: weightTonnes,
                        weightKg: weightKg,
                        volume: length * width * height,
                        length, width, height, bay: pageNumber
                    }
                });
                logger.debug(`Item detectado (${explicitId ? 'ID forte' : 'ID fraco'}): ${identifier} - ${rawDesc.substring(0, 30)}...`);
            } catch (e) { logger.warn('Erro item pat', e); }
        }
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
            const id = item.data.id!;
            
            if (!seenIds.has(id)) {
                seenIds.add(id);
                const weightTonnes = item.data.weight!;

                // Cálculo de tamanho físico (1m = 20px)
                const escala = 20;
                const tamanhoFisico = {
                    larguraPixels: Math.round(item.data.width! * escala),
                    alturaPixels: Math.round(item.data.length! * escala),
                    profundidadePixels: Math.round((item.data.height || 1) * escala),
                    escala
                };

                items.push({
                    ...item.data,
                    id,
                    weight: weightTonnes,
                    weightKg: item.data.weight!,
                    volume: item.data.length! * item.data.width! * (item.data.height || 1),
                    bay: pageNumber,
                    origemCarga: sec.origem,
                    destinoCarga: sec.destino || header.destinoCarga || header.nomeEmbarcacao,
                    isBackload: BACKLOAD_KEYWORDS.some(kw => item.rawDesc.toLowerCase().includes(kw)),
                    tipoDetectado: detectCargoType(item.rawDesc) || 'BASKET',
                    nomeEmbarcacao: header.nomeEmbarcacao, 
                    numeroAtendimento: header.numeroAtendimento, 
                    roteiroPrevisto: header.roteiroPrevisto,
                    dataExtracao: new Date().toISOString(),
                    tamanhoFisico
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

                // Cálculo de tamanho físico (1m = 20px)
                const escala = 20;
                const tamanhoFisico = {
                    larguraPixels: Math.round(item.data.width! * escala),
                    alturaPixels: Math.round(item.data.length! * escala),
                    profundidadePixels: Math.round((item.data.height || 1) * escala),
                    escala
                };

                items.push({
                    ...item.data,
                    origemCarga: sec.origem,
                    destinoCarga: sec.destino || header.destinoCarga || header.nomeEmbarcacao,
                    isBackload: BACKLOAD_KEYWORDS.some(kw => item.rawDesc.toLowerCase().includes(kw)),
                    tipoDetectado: detectCargoType(item.rawDesc),
                    nomeEmbarcacao: header.nomeEmbarcacao, 
                    numeroAtendimento: header.numeroAtendimento, 
                    roteiroPrevisto: header.roteiroPrevisto,
                    dataExtracao: new Date().toISOString(),
                    tamanhoFisico
                } as CargoItem);
            } else {
                logger.debug(`Item ignorado (Duplicidade): ${item.data.id}`);
            }
        }
    }

    // Filtro Final de Integridade (Seção 2.6 do diagnóstico)
    // Garante que campos codigo_identificador, peso_ton e dimensoes estejam minimamente preenchidos
    return items.filter(item => {
        const hasId = item.identifier && item.identifier.trim().length >= 3;
        const hasWeight = (item.weight || 0) > 0;
        const hasDims = (item.length || 0) > 0 && (item.width || 0) > 0;
        
        if (!hasId || !hasWeight || !hasDims) {
            logger.warn(`Carga marcada para revisão por integridade parcial: ${item.identifier || 'SEM_ID'}`);
            // Em aplicação real, poderíamos marcar como 'revisar', aqui apenas filtramos o ruído
            return hasWeight; // Mantém se tiver ao menos peso (pode ser carga tubular sem ID claro)
        }
        return true;
    });
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
     * Renderiza uma página do PDF em um canvas e executa o OCR usando um worker Tesseract
     * previamente inicializado (compartilhado entre todas as páginas).
     * 
     * PERF: O worker é recebido como parâmetro para evitar o custo de criação/destruição
     * a cada página — o custo de spawn de um Web Worker é muito alto.
     */
    private static async ocrPageWithRetry(page: any, worker: any, advanced = true): Promise<string> {
        const angles = [0, 90, 180, 270];
        let bestText = '';
        let bestConfidence = 0;

        for (const angle of angles) {
            const { text, confidence } = await PDFExtractor.ocrPage(page, worker, angle, advanced);
            
            if (confidence > bestConfidence) {
                bestText = text;
                bestConfidence = confidence;
            }

            // Checklist Final (Seção 8): Se atingir > 85%, para imediatamente
            if (confidence > 85) {
                logger.info(`OCR atingiu confiança ideal (${confidence}%) no ângulo ${angle}º.`);
                break;
            }

            // Se no ângulo 0º a confiança for boa (> 60%), não tenta outros para poupar CPU
            if (angle === 0 && confidence > 60) break;
            
            if (advanced && angle !== 270) {
                logger.warn(`Baixa confiança (${confidence}%) detectada. Tentando próxima rotação...`);
            }
        }

        if (bestConfidence < 60) {
            logger.error(`ALERTA: Página com baixa legibilidade (Confiança: ${bestConfidence}%).`);
        }

        return bestText;
    }

    private static async ocrPage(page: any, worker: any, rotationAngle = 0, advanced = true): Promise<{ text: string, confidence: number }> {
        const scale = 2.5; 
        const viewport = page.getViewport({ scale, rotation: rotationAngle });
        
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        
        await page.render({ canvasContext: ctx, viewport }).promise;
        
        let processedCanvas = canvas;
        if (advanced) {
            try {
                processedCanvas = await imagePreprocessor.preprocess(canvas);
            } catch (err) {
                logger.warn('Falha no pré-processamento OpenCV', { error: err });
            }
        }
        
        const imageDataUrl = processedCanvas.toDataURL('image/png');
        const { data: { text, confidence } } = await worker.recognize(imageDataUrl);
        return { text, confidence };
    }

    static async extract(file: File, onProgress?: (p: number) => void, _signal?: AbortSignal): Promise<ExtractionResult> {
        try {
            // PERF: Carregamento dinâmico para evitar aumentar o bundle principal
            const { loadPdfJs } = await import('./pdfLoader');
            const pdfjsLib = await loadPdfJs();
            const version = pdfjsLib.version || '2.16.105';
            
            logger.info(`Motor PDF.js ${version} inicializado com motor local unificado.`);

            const arrayBuffer = await file.arrayBuffer();
            
            let loadingTask;
            try {
                loadingTask = pdfjsLib.getDocument({ 
                    data: arrayBuffer,
                    useWorkerFetch: true,
                    isEvalSupported: false,
                    stopAtErrors: false, // Tenta continuar mesmo com erros leves
                    canvasMaxAreaInBytes: 16777216 * 4
                });
            } catch (err) {
                logger.error('Falha crítica ao carregar documento PDF', err instanceof Error ? err : undefined);
                throw new AppError(ErrorCodes.PDF_READ_FAILED, `Erro ao abrir PDF: ${err instanceof Error ? err.message : 'Falha na inicialização'}`, 'error', err);
            }
            
            const pdf = await loadingTask.promise;

            // ─── PERF: Extraia texto de todas as páginas em paralelo ──────────
            // Promise.all dispara todas as requisições de página simultaneamente,
            // em vez de aguardar página por página sequencialmente.
            const pageTextPromises = Array.from({ length: pdf.numPages }, async (_, i) => {
                const page = await pdf.getPage(i + 1);
                const content = await page.getTextContent();
                return content.items.map((it: any) => it.str).join(' ');
            });

            const pageTexts = await Promise.all(pageTextPromises);
            const fullText = '\n' + pageTexts.join('\n');
            // ─────────────────────────────────────────────────────────────────

            // ─── Detecção de PDF Escaneado (sem texto ou sem metadados válidos) ───────────────────────
            const usefulChars = fullText.replace(/\s+/g, '').length;
            const hasKeywords = /MANIFESTO|TRANSPORTE|CARGA|ORIGEM|DESTINO|DESCRIÇÃO|ATENDIMENTO|EQUIPAMENTO/i.test(fullText);

            if (usefulChars < 100 || !hasKeywords) {
                logger.info(`PDF "${file.name}" parece ser escaneado (${usefulChars} chars, keywords: ${hasKeywords}). Ativando OCR...`);

                // PERF: Inicializa o worker Tesseract UMA ÚNICA VEZ para todas as páginas.
                // Criar/destruir um Web Worker a cada página tem custo altíssimo de CPU/memória.
                const { createWorker } = await import('tesseract.js');
                const worker = await createWorker('por+eng', 1, {
                    logger: (m: any) => {
                        if (m.status === 'recognizing text' && onProgress) {
                            onProgress(Math.round(m.progress * 100));
                        }
                    }
                });

                try {
                    let ocrFullText = '';
                    
                    if (pdf.numPages > 0) {
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            // Utiliza o novo motor resiliente que gerencia rotação e confiança automaticamente
                            const pageText = await PDFExtractor.ocrPageWithRetry(page, worker, true);
                            ocrFullText += '\n' + pageText;

                            if (onProgress) {
                                const globalPct = Math.round((i / pdf.numPages) * 100);
                                onProgress(globalPct);
                            }
                            logger.info(`OCR concluído para página ${i}/${pdf.numPages}.`);
                        }
                    }

                    console.log('=== OCR FULL TEXT START ===');
                    console.log(ocrFullText);
                    console.log('=== OCR FULL TEXT END ===');

                    const header = parseHeaderInfo(ocrFullText);
                    const items = await parseManifesto(ocrFullText, 1, header);
                    return {
                        success: true,
                        data: {
                            items,
                            metadata: { pages: pdf.numPages, extractedAt: new Date(), method: 'ocr', fileName: file.name, fileSize: file.size }
                        }
                    };
                } finally {
                    // Garante que o worker é sempre terminado, mesmo em caso de erro
                    await worker.terminate();
                }
            }
            // ─── Extração Normal (PDF com texto) ─────────────────────────────

            const header = parseHeaderInfo(fullText);
            const items = await parseManifesto(fullText, 1, header);

            return {
                success: true,
                data: {
                    items,
                    metadata: { pages: pdf.numPages, extractedAt: new Date(), method: 'text', fileName: file.name, fileSize: file.size }
                }
            };
        } catch (e) { return { success: false, error: handleApplicationError(e) }; }
    }
}

export type ExtractionResult = 
    | { success: true; data: { items: CargoItem[]; metadata: any }; error?: never }
    | { success: false; error: AppError; data?: never };
