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
        
        const pattern1 = /(\d+)\s*\|\s*(.+?)\s*\|\s*([\d.]+)\s*t\s*\|\s*([\d.]+)\s*m[³3]\s*\|\s*(\d+)/g;
        const pattern2 = /(\d+)\s*\|\s*(.+?)\s*\|\s*([\d.]+)\s*t\s*\|\s*(\d+)/g;
        const pattern3 = /(\d+)\s+([^\d]+?)\s+([\d.]+)\s*t\s+(\d+)/g;
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
                    
                    if (!items.some(existing => existing.id === item.id)) {
                        items.push(item);
                    }
                } catch (parseError) {
                    logger.warn(`Falha ao parsear linha do manifesto: ${match[0]}`, { pageNumber, parseError });
                }
            }
            pattern.lastIndex = 0;
        }
        
        logger.debug(`Parsed ${items.length} items from page ${pageNumber}`, { textLength: text.length });
        return items;
    }

    private static async extractTextFromPDF(pdf: pdfjsLibType.PDFDocumentProxy): Promise<CargoItem[]> {
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

    private static async renderPageToImage(pdf: pdfjsLibType.PDFDocumentProxy, pageNumber: number): Promise<HTMLCanvasElement> {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 2.0 });
        
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({ canvas: canvas as any, viewport: viewport as any }).promise;
        return canvas;
    }

    private static async performOCR(pdf: pdfjsLibType.PDFDocumentProxy, onProgress?: (progress: number) => void): Promise<CargoItem[]> {
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
                logger.info(`OCR processing page ${i} of ${pdf.numPages}`);
                
                const canvas = await this.renderPageToImage(pdf, i);
                const result = await worker.recognize(canvas);
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

    static async extract(file: File, onOCRProgress?: (progress: number) => void): Promise<ExtractionResult> {
        try {
            const validation = this.validateFile(file);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }

            logger.info(`Iniciando extracao para o arquivo: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);

            const arrayBuffer = await this.fileToArrayBuffer(file);
            logger.info(`Arquivo convertido para ArrayBuffer`, { size: arrayBuffer.byteLength });

            let pdf: pdfjsLibType.PDFDocumentProxy;
            try {
                // Import pdfjs-dist dynamically to avoid bundling issues
                const pdfjsLib = await import('pdfjs-dist');
                // Configure worker for production - using local worker file
                pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
                logger.info(`PDF.js loaded`, { version: pdfjsLib.version });
                
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                pdf = await loadingTask.promise;
                logger.info(`PDF document loaded successfully`, { pages: pdf.numPages });
            } catch (error) {
                logger.error('Error loading PDF document:', error);
                return { success: false, error: handleApplicationError(error, { code: ErrorCodes.PDF_CORRUPTED }) };
            }

            let items: CargoItem[];
            let ocrAttempted = false;
            
            // Step 1: Try text extraction
            try {
                items = await this.extractTextFromPDF(pdf);
                logger.info(`Text extraction result`, { itemCount: items.length });
            } catch (extractionError) {
                logger.error('Erro na extracao de texto.', extractionError);
                items = [];
            }

            // Step 2: If text extraction failed, try OCR
            if (items.length === 0) {
                logger.info('Text extraction returned no items. Attempting OCR fallback...');
                ocrAttempted = true;
                try {
                    items = await this.performOCR(pdf, onOCRProgress);
                    logger.info(`OCR extraction result`, { itemCount: items.length });
                } catch (ocrError) {
                    logger.error('Erro na extracao via OCR.', ocrError);
                    items = [];
                }
            }

            // Step 3: If both methods failed, return error
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
            logger.error('Erro geral na extração:', error);
            return { success: false, error: handleApplicationError(error, { code: ErrorCodes.PDF_EXTRACTION_FAILED }) };
        }
    }
}