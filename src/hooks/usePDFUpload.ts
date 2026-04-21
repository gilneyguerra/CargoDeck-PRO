// src/hooks/usePDFUpload.ts
/**
 * @file Hook customizado para gerenciar o processo de upload e extração de PDF.
 * Fornece estado de carregamento, progresso, erro e sucesso para componentes de UI.
 */
import { useState, useCallback, useRef } from 'react';
import { PDFExtractor, CargoItem, ExtractionResult } from '../services/pdfExtractor';
import { AppError, handleApplicationError } from '../services/errorHandler';
import { ErrorCodes } from '../lib/errorCodes';
import { logger } from '../utils/logger';

/**
 * Define a estrutura do estado de upload.
 */
interface UploadState {
    loading: boolean;
    error: AppError | null;
    progress: number; // 0-100
    success: boolean;
    fileName: string | null;
    isOCR: boolean; // Indicates if OCR is being used
}

/**
 * Hook para gerenciar o upload e extração de arquivos PDF.
 * @returns Um objeto contendo o estado de upload e funções para iniciar/resetar o processo.
 */
export function usePDFUpload() {
    const [state, setState] = useState<UploadState>({
        loading: false,
        error: null,
        progress: 0,
        success: false,
        fileName: null,
        isOCR: false,
    });

    // Usado para garantir que apenas uma operação de upload esteja ativa por vez
    const abortControllerRef = useRef<AbortController | null>(null);

    const upload = useCallback(async (file: File): Promise<CargoItem[] | null> => {
        // Resetar estado e iniciar carregamento
        setState({ loading: true, error: null, progress: 0, success: false, fileName: file.name, isOCR: false });
        logger.info(`Iniciando upload e extração para: ${file.name}`);

        // Criar um novo AbortController para esta operação
        if (abortControllerRef.current) {
            abortControllerRef.current.abort(); // Aborta qualquer operação anterior
        }
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        try {
            // Simular progresso inicial (validação e leitura do arquivo)
            setState(prev => ({ ...prev, progress: 10 }));

            // Verificar se a operação foi abortada
            if (signal.aborted) {
                throw new AppError(ErrorCodes.OPERATION_CANCELLED, 'Operação de upload cancelada.');
            }

            // 1. Validar arquivo
            const validation = PDFExtractor.validateFile(file);
            if (!validation.valid) {
                throw validation.error; // Lança o AppError específico
            }
            setState(prev => ({ ...prev, progress: 15 }));

            // 2. Extrair dados do PDF (com callback de progresso para OCR)
            const extractionResult: ExtractionResult = await PDFExtractor.extract(
                file, 
                (ocrProgress) => {
                    // Map OCR progress to 30-90 range in the UI
                    const mappedProgress = 30 + (ocrProgress * 0.6);
                    setState(prev => ({ 
                        ...prev, 
                        progress: Math.round(mappedProgress),
                        isOCR: true 
                    }));
                },
                signal
            );

            if (signal.aborted) {
                throw new AppError(ErrorCodes.OPERATION_CANCELLED, 'Operação de extração cancelada.');
            }

            if (!extractionResult.success) {
                throw extractionResult.error; // Lança o AppError retornado pelo extrator
            }

            // Simular progresso final
            setState(prev => ({ ...prev, progress: 95 }));

            // Processamento bem-sucedido
            setState(prev => ({
                ...prev,
                progress: 100,
                success: true,
                loading: false,
            }));
            logger.info(`Extração de ${file.name} concluída com sucesso.`, { 
                metadata: extractionResult.data?.metadata,
                method: extractionResult.data?.metadata?.method 
            });
            return extractionResult.data?.items || null;
        } catch (rawError) {
            const error = handleApplicationError(rawError, { fileName: file.name, context: 'usePDFUpload' });
            setState(prev => ({
                ...prev,
                error,
                loading: false,
                progress: 0,
                success: false,
            }));
            return null;
        } finally {
            // Limpar o AbortController após a conclusão (sucesso ou falha)
            abortControllerRef.current = null;
        }
    }, []);

    const reset = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort(); // Aborta qualquer operação pendente
        }
        setState({ loading: false, error: null, progress: 0, success: false, fileName: null, isOCR: false });
        logger.info('Estado de upload resetado.');
    }, []);

    return { ...state, upload, reset };
}