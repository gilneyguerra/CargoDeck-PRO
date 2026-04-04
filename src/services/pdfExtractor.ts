// src/services/pdfExtractor.ts
/**
 * @file Servico robusto para extracao de dados de PDFs na aplicacao CargoDeck-PRO.
 * Lida com validacao de arquivo e extracao de texto via pdfjs-dist com fallback OCR via Tesseract.js.
 */
import type * as pdfjsLibType from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import { AppError, handleApplicationError } from './errorHandler';
import { ErrorCodes } from '../lib/errorCodes';
import { logger } from '../utils/logger';

export interface CargoItem {
    id: string;
    identifier: string;
    description: string;
    weight: number;
    volume: number;
    length?: number;
    width?: number;
    height?: number;
    bay: number;
    positionX?: number;
    positionY?: number;
    rotation?: number;
    isBackload?: boolean;
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
        
        const backloadKeywords = [
            'desembarque', 'desembarque', 'removido', 'removida', 'retorno', 
            'backload', 'descarregamento', 'saida', 'saída', 'lixo', 'resíduo',
            'descarga', 'descarga', 'offload', 'off-loading'
        ];

        // Pattern 1: ID | Description | Weight | Volume | Bay (pipe-separated with volume)
        const pattern1 = /(\d+)\s*\|\s*(.+?)\s*\|\s*([\d.]+)\s*t\s*\|\s*([\d.]+)\s*m[³3]\s*\|\s*(\d+)/g;
        // Pattern 2: ID | Description | Weight | Bay (pipe-separated without volume)
        const pattern2 = /(\d+)\s*\|\s*(.+?)\s*\|\s*([\d.]+)\s*t\s*\|\s*(\d+)/g;
        // Pattern 3: ID Description Weight t Bay (space-separated)
        const pattern3 = /(\d+)\s+([^\d]+?)\s+([\d.]+)\s*t\s+(\d+)/g;
        // Pattern 4: ID - Description - Weight t - Bay (dash-separated)
        const pattern4 = /(\d+)\s*[-–—]\s*([A-Za-zÀ-ÿ\s]+?)\s*[-–—]\s*([\d.]+)\s*t\s*[-–—]\s*(\d+)/g;
        // Pattern 5: Container format - ABCD1234567 DESCRIPTION WEIGHT t VOLUME m3 BAY
        // Handles multi-word descriptions by matching until weight pattern
        const pattern5 = /([A-Z]{4}\d{7,})\s+([A-Za-zÀ-ÿ\s]+?)(?=\s+[\d.]+\s*t\s)/g;
        // Pattern 5b: Same as 5 but with explicit = separator
        const pattern5b = /([A-Z]{4}\d{7,})\s*=\s*([A-Za-zÀ-ÿ\s]+?)(?=\s+[\d.]+\s*t\s)/g;
        // Pattern 6: Dimensions pattern - LxWxH format
        const pattern6 = /(\d+)\s*\|\s*(.+?)\s*\|\s*([\d.]+)\s*t\s*\|\s*([\d.]+)\s*m[³3]\s*\|\s*(\d+)\s*\|\s*([\d.]+)\s*[xX]\s*([\d.]+)\s*[xX]\s*([\d.]+)/g;

        const patterns = [
            { pattern: pattern1, hasVolume: true, hasDimensions: false },
            { pattern: pattern2, hasVolume: false, hasDimensions: false },
            { pattern: pattern3, hasVolume: false, hasDimensions: false },
            { pattern: pattern4, hasVolume: false, hasDimensions: false },
            { pattern: pattern5, hasVolume: true, hasDimensions: false, needsSecondParse: true },
            { pattern: pattern5b, hasVolume: true, hasDimensions: false, needsSecondParse: true },
            { pattern: pattern6, hasVolume: true, hasDimensions: true },
        ];
        
        for (const { pattern, hasVolume, hasDimensions, needsSecondParse } of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                try {
                    let description: string;
                    let weight: number;
                    let volume: number;
                    let bay: number;
                    let length: number | undefined;
                    let width: number | undefined;
                    let height: number | undefined;

                    if (needsSecondParse) {
                        // For container patterns, extract metrics from the full line
                        description = match[2].trim();
                        const id = match[1];
                        
                        // Extract weight, volume, and bay from remaining text after description
                        const remainingText = match[0].substring(match[0].indexOf(description) + description.length);
                        const metricsMatch = /([\d.]+)\s*t\s+([\d.]+)\s*m[³3]\s+(\d+)/.exec(remainingText);
                        
                        if (!metricsMatch) {
                            logger.warn(`Could not extract metrics from container line: ${match[0]}`);
                            continue;
                        }
                        
                        weight = parseFloat(metricsMatch[1]);
                        volume = parseFloat(metricsMatch[2]);
                        bay = parseInt(metricsMatch[3], 10);
                    } else {
                        description = match[2].trim();
                        weight = parseFloat(match[3]);
                        volume = hasVolume ? parseFloat(match[4]) : 0;
                        bay = hasVolume ? parseInt(match[5], 10) : parseInt(match[4], 10);

                        if (hasDimensions && match.length >= 9) {
                            length = parseFloat(match[7]);
                            width = parseFloat(match[8]);
                            height = parseFloat(match[9]);
                        }
                    }
                    
                    const isBackload = backloadKeywords.some(keyword => 
                        description.toLowerCase().includes(keyword.toLowerCase())
                    );

                    const item: CargoItem = {
                        id: `${pageNumber}-${match[1]}`,
                        identifier: match[1],
                        description: description,
                        weight: weight,
                        volume: volume,
                        bay: bay,
                        length,
                        width,
                        height,
                        isBackload: isBackload
                    };
                    
                    if (!items.some(existing => existing.id === item.id)) {
                        items.push(item);
                    }
                } catch (parseError) {
                    logger.warn(`Falha ao parsear linha do manifesto: ${match[0]}`, { 
                        pageNumber, 
                        parseError: parseError instanceof Error ? parseError : undefined 
                    });
                }
            }
            pattern.lastIndex = 0;
        }
        
        logger.debug(`Parsed ${items.length} items from page ${pageNumber}`, { textLength: text.length });
        return items;
    }

    private static async extractTextFromPDF(pdf: pdfjsLibType.PDFDocumentProxy, signal?: AbortSignal): Promise<CargoItem[]> {
        const allItems: CargoItem[] = [];
        logger.info(`Starting text extraction from ${pdf.numPages} pages`);
        
        for (let i = 1; i <= pdf.numPages; i++) {
            if (signal?.aborted) {
                throw new AppError(ErrorCodes.OPERATION_CANCELLED, 'Text extraction aborted');
            }

            let page;
            try {
                page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const text = textContent.items
                    .map((item: { str: string }) => item.str)
                    .join(' ');
                
                logger.debug(`Page ${i} text extracted`, { 
                    textLength: text.length,
                    textPreview: text.substring(0, 200) + (text.length > 200 ? '...' : '')
                });
                
                const pageItems = this.parseManifesto(text, i);
                allItems.push(...pageItems);
                
                logger.debug(`Page ${i} items found`, { count: pageItems.length });
            } catch (pageError) {
                logger.warn(`Erro ao extrair texto da pagina ${i}:`, { 
                    pageNumber: i, 
                    pageError: pageError instanceof Error ? pageError : undefined 
                });
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

    private static async renderPageToImage(pdf: pdfjsLibType.PDFDocumentProxy, pageNumber: number): Promise<HTMLCanvasElement> {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 2.0 });
        
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        const canvasContext = canvas.getContext('2d');
        if (!canvasContext) {
            throw new AppError(ErrorCodes.PDF_EXTRACTION_FAILED, 'Failed to get 2D context from canvas. Environment may not support canvas rendering.');
        }
        
        try {
            await page.render({ canvas, canvasContext, viewport }).promise;
        } finally {
            page.cleanup();
        }
        
        return canvas;
    }

    private static async performOCR(pdf: pdfjsLibType.PDFDocumentProxy, onProgress?: (progress: number) => void, signal?: AbortSignal): Promise<CargoItem[]> {
        logger.info('Starting OCR extraction with Tesseract.js');
        const allItems: CargoItem[] = [];
        
        const worker = await createWorker('eng+por', 1, {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    logger.debug(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                    if (onProgress) {
                        onProgress(Math.round(m.progress * 100));
                    }
                }
            }
        });
        
        try {
            for (let i = 1; i <= pdf.numPages; i++) {
                if (signal?.aborted) {
                    throw new AppError(ErrorCodes.OPERATION_CANCELLED, 'OCR extraction aborted');
                }

                logger.info(`OCR processing page ${i} of ${pdf.numPages}`);
                
                const canvas = await this.renderPageToImage(pdf, i);
                const result = await worker.recognize(canvas);
                
                canvas.width = 0;
                canvas.height = 0;
                
                const text = result.data.text;
                
                logger.debug(`OCR page ${i} text extracted`, { 
                    textLength: text.length,
                    textPreview: text.substring(0, 200) + (text.length > 200 ? '...' : '')
                });
                
                const pageItems = this.parseManifesto(text, i);
                allItems.push(...pageItems);
                
                logger.debug(`OCR page ${i} items found`, { count: pageItems.length });
            }
        } finally {
            await worker.terminate();
        }
        
        logger.info(`OCR extraction completed`, { 
            totalPages: pdf.numPages, 
            totalItems: allItems.length 
        });
        return allItems;
    }

    static async extract(file: File, onOCRProgress?: (progress: number) => void, signal?: AbortSignal): Promise<ExtractionResult> {
        let pdf: pdfjsLibType.PDFDocumentProxy | null = null;
        
        try {
            const validation = this.validateFile(file);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }

            logger.info(`Iniciando extracao para o arquivo: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);

            const arrayBuffer = await this.fileToArrayBuffer(file);
            logger.info(`Arquivo convertido para ArrayBuffer`, { size: arrayBuffer.byteLength });

            try {
                const pdfjsLib = await import('pdfjs-dist');
                pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
                logger.info(`PDF.js loaded`, { version: pdfjsLib.version });
                
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                pdf = await loadingTask.promise;
                logger.info(`PDF document loaded successfully`, { pages: pdf.numPages });
            } catch (error) {
                logger.error('Error loading PDF document:', error instanceof Error ? error : undefined, { 
                    rawError: error 
                });
                return { success: false, error: handleApplicationError(error, { code: ErrorCodes.PDF_CORRUPTED }) };
            }

            let items: CargoItem[];
            let ocrAttempted = false;
            
            try {
                items = await this.extractTextFromPDF(pdf, signal);
                logger.info(`Text extraction result`, { itemCount: items.length });
            } catch (extractionError) {
                logger.error('Erro na extracao de texto.', extractionError instanceof Error ? extractionError : undefined, { 
                    context: 'textExtraction' 
                });
                items = [];
            }

            if (items.length === 0) {
                logger.info('Text extraction returned no items. Attempting OCR fallback...');
                ocrAttempted = true;
                try {
                    items = await this.performOCR(pdf, onOCRProgress, signal);
                    logger.info(`OCR extraction result`, { itemCount: items.length });
                } catch (ocrError) {
                    logger.error('Erro na extracao via OCR.', ocrError instanceof Error ? ocrError : undefined, { 
                        context: 'ocrExtraction' 
                    });
                    items = [];
                }
            }

            if (items.length === 0) {
                logger.warn('Nenhum item encontrado após extração de texto e OCR.');
                return { 
                    success: false, 
                    error: new AppError(ErrorCodes.PDF_PARSING_FAILED, 'Nenhum item de carga encontrado no PDF. O arquivo pode estar corrompido ou ter formato incompatível.') 
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
                        method: ocrAttempted ? 'ocr' : 'text',
                        fileName: file.name,
                        fileSize: file.size,
                    }
                }
            };
        } catch (error) {
            logger.error('Erro geral na extração:', error instanceof Error ? error : undefined, { 
                rawError: error 
            });
            return { success: false, error: handleApplicationError(error, { code: ErrorCodes.PDF_EXTRACTION_FAILED }) };
        } finally {
            if (pdf) {
                pdf.destroy();
                logger.debug('PDF document destroyed and resources released');
            }
        }
    }
}
