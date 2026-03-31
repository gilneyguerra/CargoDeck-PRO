// src/services/pdfExtractor.ts
/**
 * @file Servico robusto para extracao de dados de PDFs na aplicacao CargoDeck-PRO.
 * Lida com validacao de arquivo e extracao de texto via pdfjs-dist.
 */
import type * as pdfjsLibType from 'pdfjs-dist';
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
        const pattern = /(\d+)\s*\|\s*(.+?)\s*\|\s*([\d.]+)\s*t\s*\|\s*([\d.]+)\s*m[³3]\s*\|\s*(\d+)/g;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            try {
                items.push({
                    id: `${pageNumber}-${match[1]}`,
                    description: match[2].trim(),
                    weight: parseFloat(match[3]),
                    volume: parseFloat(match[4]),
                    bay: parseInt(match[5], 10),
                });
            } catch (parseError) {
                logger.warn(`Falha ao parsear linha do manifesto: ${match[0]}`, { pageNumber, parseError });
            }
        }
        return items;
    }

    private static async extractTextFromPDF(pdf: pdfjsLibType.PDFDocumentProxy): Promise<CargoItem[]> {
        const allItems: CargoItem[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
            let page;
            try {
                page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const text = textContent.items
                    .map((item: unknown) => (item as { str: string }).str)
                    .join(' ');
                const pageItems = this.parseManifesto(text, i);
                allItems.push(...pageItems);
            } catch (pageError) {
                logger.warn(`Erro ao extrair texto da pagina ${i}:`, { error: pageError, pageNumber: i });
            } finally {
                if (page) {
                    page.cleanup();
                }
            }
        }
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

            let pdf: pdfjsLibType.PDFDocumentProxy;
            try {
                const pdfjsLib = await import('pdfjs-dist');
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
                pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            } catch (error) {
                return { success: false, error: handleApplicationError(error, { code: ErrorCodes.PDF_CORRUPTED }) };
            }

            let items: CargoItem[];
            try {
                items = await this.extractTextFromPDF(pdf);
            } catch (extractionError) {
                logger.warn('Erro na extracao de texto.', extractionError);
                items = [];
            }

            if (items.length === 0) {
                return { success: false, error: new AppError(ErrorCodes.PDF_PARSING_FAILED, 'Nenhum item de carga encontrado no PDF.') };
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
            return { success: false, error: handleApplicationError(error, { code: ErrorCodes.PDF_EXTRACTION_FAILED }) };
        }
    }
}