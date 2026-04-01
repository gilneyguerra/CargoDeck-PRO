// src/services/pdfExtractor.ts
/**
 * @file Servico robusto para extracao de dados de PDFs na aplicacao CargoDeck-PRO.
 * Lida com validacao de arquivo e extracao de texto via pdfjs-dist.
 */
import * as pdfjsLib from 'pdfjs-dist';
import { AppError, handleApplicationError } from './errorHandler';
import { ErrorCodes } from '../lib/errorCodes';
import { logger } from '../utils/logger';

// Configure worker once at module load time
if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
}

export interface CargoItem {
    id: string;
    description: string;
    weight: number;
    volume: number;
    bay: number;
    positionX?: number;
    positionY?: number;
    rotation?: number;
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

export class PDFExtractor {
    private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024;
    private static readonly ALLOWED_TYPES = ['application/pdf'];

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
                    reject(new AppError(ErrorCodes.PDF_READ_FAILED, 'Resultado da leitura do arquivo nao e um ArrayBuffer.'));
                }
            };
            reader.onerror = () => {
                reject(new AppError(ErrorCodes.PDF_READ_FAILED, 'Erro ao ler o arquivo PDF.'));
            };
            reader.readAsArrayBuffer(file);
        });
    }

    private static parseManifesto(text: string, pageNumber: number): CargoItem[] {
        const items: CargoItem[] = [];
        
        // Pattern 1: Format "number | description | weight t | volume m³ | bay"
        const pattern1 = /(\d+)\s*\|\s*(.+?)\s*\|\s*([\d.]+)\s*t\s*\|\s*([\d.]+)\s*m[³3]\s*\|\s*(\d+)/g;
        
        // Pattern 2: Format "number | description | weight t | bay" (without volume)
        const pattern2 = /(\d+)\s*\|\s*(.+?)\s*\|\s*([\d.]+)\s*t\s*\|\s*(\d+)/g;
        
        // Pattern 3: Format "number description weight t bay" (with spaces instead of pipes)
        const pattern3 = /(\d+)\s+([^\d]+?)\s+([\d.]+)\s*t\s+(\d+)/g;
        
        // Pattern 4: Try to extract any structured data with numbers and descriptions
        const pattern4 = /(\d+)\s*[-–—]\s*([A-Za-zÀ-ÿ\s]+?)\s*[-–—]\s*([\d.]+)\s*t\s*[-–—]\s*(\d+)/g;
        
        const patterns = [
            { pattern: pattern1, hasVolume: true },
            { pattern: pattern2, hasVolume: false },
            { pattern: pattern3, hasVolume: false },
            { pattern: pattern4, hasVolume: false },
        ];
        
        for (const { pattern, hasVolume } of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                try {
                    const item: CargoItem = {
                        id: `${pageNumber}-${match[1]}`,
                        description: match[2].trim(),
                        weight: parseFloat(match[3]),
                        volume: hasVolume ? parseFloat(match[4]) : 0,
                        bay: hasVolume ? parseInt(match[5], 10) : parseInt(match[4], 10),
                    };
                    
                    // Avoid duplicates
                    if (!items.some(existing => existing.id === item.id)) {
                        items.push(item);
                    }
                } catch (parseError) {
                    logger.warn(`Falha ao parsear linha do manifesto: ${match[0]}`, { pageNumber, parseError });
                }
            }
            pattern.lastIndex = 0; // Reset regex state
        }
        
        logger.debug(`Parsed ${items.length} items from page ${pageNumber}`, { textLength: text.length });
        return items;
    }

    private static async extractTextFromPDF(pdf: pdfjsLib.PDFDocumentProxy): Promise<CargoItem[]> {
        const allItems: CargoItem[] = [];
        logger.info(`Starting text extraction from ${pdf.numPages} pages`);
        
        for (let i = 1; i <= pdf.numPages; i++) {
            let page;
            try {
                page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const text = textContent.items
                    .map((item: unknown) => (item as { str: string }).str)
                    .join(' ');
                
                logger.debug(`Page ${i} text extracted`, { 
                    textLength: text.length,
                    textPreview: text.substring(0, 200) + (text.length > 200 ? '...' : '')
                });
                
                const pageItems = this.parseManifesto(text, i);
                allItems.push(...pageItems);
                
                logger.debug(`Page ${i} items found`, { count: pageItems.length });
            } catch (pageError) {
                logger.warn(`Erro ao extrair texto da pagina ${i}:`, { error: pageError, pageNumber: i });
            } finally {
                if (page) {
                    page.cleanup();
                }
            }
        }
        
        logger.info(`Text extraction completed`, { 
            totalPages: pdf.numPages, 
            totalItems: allItems.length 
        });
        return allItems;
    }

    static async extract(file: File): Promise<ExtractionResult> {
        try {
            const validation = this.validateFile(file);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }

            logger.info(`Iniciando extracao para o arquivo: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);

            const arrayBuffer = await this.fileToArrayBuffer(file);
            logger.info(`Arquivo convertido para ArrayBuffer`, { size: arrayBuffer.byteLength });

            let pdf: pdfjsLib.PDFDocumentProxy;
            try {
                logger.info(`PDF.js version: ${pdfjsLib.version}`);
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                pdf = await loadingTask.promise;
                logger.info(`PDF document loaded successfully`, { pages: pdf.numPages });
            } catch (error) {
                logger.error('Error loading PDF document:', error);
                return { success: false, error: handleApplicationError(error, { code: ErrorCodes.PDF_CORRUPTED }) };
            }

            let items: CargoItem[];
            try {
                items = await this.extractTextFromPDF(pdf);
                logger.info(`Text extraction result`, { itemCount: items.length });
            } catch (extractionError) {
                logger.error('Erro na extracao de texto.', extractionError);
                items = [];
            }

            if (items.length === 0) {
                logger.warn('Nenhum item encontrado na extração de texto.');
                return { 
                    success: false, 
                    error: new AppError(ErrorCodes.PDF_PARSING_FAILED, 'Nenhum item de carga encontrado no PDF. O arquivo pode ser uma imagem escaneada ou ter formato incompatível.') 
                };
            }

            logger.info(`Extracao concluida com sucesso. Itens encontrados: ${items.length}`);

            return {
                success: true,
                data: {
                    items,
                    metadata: {
                        pages: pdf.numPages,
                        extractedAt: new Date(),
                        method: 'text',
                        fileName: file.name,
                        fileSize: file.size,
                    },
                },
            };
        } catch (error) {
            logger.error('Erro geral na extração:', error);
            return { success: false, error: handleApplicationError(error, { code: ErrorCodes.PDF_EXTRACTION_FAILED }) };
        }
    }
}