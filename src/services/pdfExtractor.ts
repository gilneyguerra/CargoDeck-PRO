// src/services/pdfExtractor.ts
/**
 * @file Serviço robusto para extração de dados de PDFs na aplicação CargoDeck-PRO.
 * Lida com validação de arquivo, extração de texto via pdfjs-dist e OCR via tesseract.js,
 * com tratamento de erros e liberação de recursos.
 */
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import { AppError, handleApplicationError } from './errorHandler';
import { ErrorCodes } from '../lib/errorCodes';
import { logger } from '../utils/logger';

// Configurar o worker de pdfjs-dist
// Certifique-se de que o caminho para o worker.min.js esteja correto
pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Define a estrutura de um item de carga extraído do PDF.
 */
export interface CargoItem {
    id: string;
    description: string;
    weight: number;
    volume: number;
    bay: number;
    positionX?: number; // Posição no convés
    positionY?: number; // Posição no convés
    rotation?: number;  // Rotação no convés
}

/**
 * Define a estrutura dos metadados da extração.
 */
interface ExtractionMetadata {
    pages: number;
    extractedAt: Date;
    method: 'text' | 'ocr';
    fileName: string;
    fileSize: number;
}

/**
 * Define o resultado da operação de extração.
 */
export interface ExtractionResult {
    success: boolean;
    data?: {
        items: CargoItem[];
        metadata: ExtractionMetadata;
    };
    error?: AppError;
}

export class PDFExtractor {
    private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    private static readonly ALLOWED_TYPES = ['application/pdf'];
    private static readonly OCR_MAX_PAGES = 5; // Limitar OCR a um número razoável de páginas

    /**
     * Valida o arquivo PDF antes de iniciar o processamento.
     * @param file O objeto File a ser validado.
     * @returns Um objeto indicando se o arquivo é válido e um erro, se houver.
     */
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

    /**
     * Converte um objeto File em um ArrayBuffer.
     * @param file O objeto File a ser convertido.
     * @returns Uma Promise que resolve com o ArrayBuffer do arquivo.
     */
    private static fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                if (reader.result instanceof ArrayBuffer) {
                    resolve(reader.result);
                } else {
                    reject(new AppError(ErrorCodes.PDF_READ_FAILED, 'Resultado da leitura do arquivo não é um ArrayBuffer.'));
                }
            };
            reader.onerror = () => {
                reject(new AppError(ErrorCodes.PDF_READ_FAILED, 'Erro ao ler o arquivo PDF.'));
            };
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Extrai itens de carga de uma string de texto, usando um padrão de manifesto Petrobras.
     * Este é um parser de exemplo e deve ser ajustado conforme o formato exato do seu PDF.
     * @param text O texto extraído de uma página do PDF.
     * @param pageNumber O número da página de onde o texto foi extraído.
     * @returns Uma array de CargoItem.
     */
    private static parseManifesto(text: string, pageNumber: number): CargoItem[] {
        const items: CargoItem[] = [];
        // Adapte este regex para o formato exato do seu manifesto Petrobras.
        const pattern = /(\d+)\s*\|\s*(.+?)\s*\|\s*([\d.]+)\s*t\s*\|\s*([\d.]+)\s*m[³3]\s*\|\s*(\d+)/g;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            try {
                items.push({
                    id: `${pageNumber}-${match[1]}`, // ID único para cada item
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

    /**
     * Extrai texto de um PDF usando pdfjs-dist.
     * @param pdf O objeto PDFDocumentProxy.
     * @returns Uma Promise que resolve com uma array de CargoItem.
     */
    private static async extractTextFromPDF(pdf: pdfjsLib.PDFDocumentProxy): Promise<CargoItem[]> {
        const allItems: CargoItem[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
            let page;
            try {
                page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const text = textContent.items
                    .map((item: any) => item.str) // 'any' é usado aqui porque textContent.items pode ter tipos variados
                    .join(' ');
                const pageItems = this.parseManifesto(text, i);
                allItems.push(...pageItems);
            } catch (pageError) {
                logger.warn(`Erro ao extrair texto da página ${i}:`, pageError, { pageNumber: i });
            } finally {
                if (page) {
                    page.cleanup(); // Libera recursos da página
                }
            }
        }
        return allItems;
    }

    /**
     * Extrai texto de um PDF usando OCR (Tesseract.js).
     * @param pdf O objeto PDFDocumentProxy.
     * @returns Uma Promise que resolve com uma array de CargoItem.
     */
    private static async extractTextWithOCR(pdf: pdfjsLib.PDFDocumentProxy): Promise<CargoItem[]> {
        const allItems: CargoItem[] = [];
        logger.info(`Iniciando OCR para até ${this.OCR_MAX_PAGES} páginas.`);
        for (let i = 1; i <= Math.min(pdf.numPages, this.OCR_MAX_PAGES); i++) {
            let page;
            try {
                page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 2 }); // Aumentar escala para melhor OCR
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                if (!context) {
                    throw new AppError(ErrorCodes.PDF_OCR_FAILED, 'Não foi possível obter contexto 2D do canvas para OCR.');
                }
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({ canvasContext: context, viewport }).promise;
                // Realizar OCR
                const { data: { text } } = await Tesseract.recognize(canvas, 'por', {
                    logger: m => logger.debug(`Tesseract: ${m.status} - ${Math.round(m.progress * 100)}%`, { ...m, page: i })
                });
                const pageItems = this.parseManifesto(text, i);
                allItems.push(...pageItems);
                logger.info(`OCR concluído para página ${i}. Itens encontrados: ${pageItems.length}`);
            } catch (ocrError) {
                logger.error(`OCR falhou na página ${i}:`, ocrError, { pageNumber: i });
            } finally {
                if (page) {
                    page.cleanup(); // Libera recursos da página
                }
            }
        }
        return allItems;
    }

    /**
     * Função principal para extrair dados de um arquivo PDF.
     * Tenta extração de texto primeiro, e se falhar, tenta OCR.
     * @param file O objeto File do PDF.
     * @returns Uma Promise que resolve com ExtractionResult.
     */
    static async extract(file: File): Promise<ExtractionResult> {
        try {
            // 1. Validar arquivo
            const validation = this.validateFile(file);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }

            logger.info(`Iniciando extração para o arquivo: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);

            // 2. Converter para ArrayBuffer
            const arrayBuffer = await this.fileToArrayBuffer(file);

            // 3. Carregar PDF
            let pdf: pdfjsLib.PDFDocumentProxy;
            try {
                pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            } catch (error) {
                return { success: false, error: handleApplicationError(error, { code: ErrorCodes.PDF_CORRUPTED }) };
            }

            // 4. Tentar extração de texto
            let items: CargoItem[] = [];
            let method: 'text' | 'ocr' = 'text';
            try {
                items = await this.extractTextFromPDF(pdf);
                if (items.length === 0) {
                    logger.warn('Nenhum item encontrado via extração de texto. Tentando OCR...');
                    method = 'ocr';
                    items = await this.extractTextWithOCR(pdf);
                }
            } catch (extractionError) {
                logger.warn('Erro na extração de texto, tentando OCR.', extractionError);
                method = 'ocr';
                items = await this.extractTextWithOCR(pdf);
            }

            if (items.length === 0) {
                return { success: false, error: new AppError(ErrorCodes.PDF_PARSING_FAILED, 'Não foi possível extrair nenhum item de carga do PDF.') };
            }

            logger.info(`Extração concluída com sucesso. Método: ${method}. Itens encontrados: ${items.length}`);

            return {
                success: true,
                data: {
                    items,
                    metadata: {
                        pages: pdf.numPages,
                        extractedAt: new Date(),
                        method,
                        fileName: file.name,
                        fileSize: file.size,
                    },
                },
            };
        } catch (error) {
            // Captura qualquer erro não tratado e o converte em AppError
            return { success: false, error: handleApplicationError(error, { code: ErrorCodes.PDF_EXTRACTION_FAILED }) };
        }
    }
}