// src/services/errorHandler.ts
/**
 * @file Serviço centralizado para tratamento de erros na aplicação CargoDeck-PRO.
 * Define uma classe de erro customizada e funções utilitárias para padronizar
 * a captura, categorização e comunicação de erros.
 */
import { ErrorCode, ErrorCodes, ErrorMessages } from '../lib/errorCodes';
import { logger } from '../utils/logger';

/**
 * Classe de erro customizada para a aplicação.
 * Permite categorizar erros com um código específico e um nível de severidade.
 */
export class AppError extends Error {
    public readonly code: ErrorCode;
    public readonly severity: 'info' | 'warning' | 'error';
    public readonly originalError?: unknown;

    constructor(
        code: ErrorCode,
        message?: string,
        severity: 'info' | 'warning' | 'error' = 'error',
        originalError?: unknown
    ) {
        super(message || ErrorMessages[code] || ErrorMessages[ErrorCodes.UNKNOWN_ERROR]);
        this.name = 'AppError';
        this.code = code;
        this.severity = severity;
        this.originalError = originalError;

        // Captura o stack trace corretamente em V8 (Chrome, Node.js)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }
    }
}

/**
 * Converte um erro desconhecido em uma instância de AppError.
 * Útil para garantir que todos os erros sejam tratados de forma consistente.
 */
export function toAppError(error: unknown, defaultCode: ErrorCode = ErrorCodes.UNKNOWN_ERROR): AppError {
    if (error instanceof AppError) {
        return error;
    }

    let message = 'Erro desconhecido.';
    
    try {
        if (error instanceof Error) {
            message = error.message;
        } else if (typeof error === 'string') {
            message = error;
        } else {
            message = JSON.stringify(error);
        }
    } catch {
        message = String(error);
    }

    // Se a mensagem for vazia ou "undefined" ou "[object Object]", usa o fallback do código
    if (!message || message === 'undefined' || message === '[object Object]' || message === '{}') {
        message = ErrorMessages[defaultCode] || 'Erro inesperado na operação.';
    }

    // Melhora mensagens de erro conhecidas
    if (message.includes('PDFJS') || message.includes('Worker')) {
        return new AppError(ErrorCodes.PDF_CORRUPTED, `Falha no motor PDF: ${message}`, 'error', error);
    }

    return new AppError(defaultCode, message, 'error', error);
}

/**
 * Lida com um erro, logando-o e retornando uma instância de AppError.
 * Esta função é o ponto central para processar erros antes de exibi-los ou reagir a eles.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleApplicationError(error: unknown, context?: Record<string, any>): AppError {
    const appError = toAppError(error);

    // Loga o erro com base na severidade
    switch (appError.severity) {
        case 'info':
            logger.info(appError.message, { ...context, code: appError.code, original: appError.originalError });
            break;
        case 'warning':
            logger.warn(appError.message, { ...context, code: appError.code, original: appError.originalError });
            break;
        case 'error':
        default:
            logger.error(
                appError.message,
                appError.originalError instanceof Error ? appError.originalError : undefined,
                { ...context, code: appError.code }
            );
            break;
    }

    return appError;
}