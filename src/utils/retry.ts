// src/utils/retry.ts
/**
 * @file Utilitario para retry automatico de operacoes assincronas.
 * Permite que uma funcao seja retentada um numero configuravel de vezes
 * em caso de falha, com um atraso exponencial entre as tentativas.
 */
import { logger } from './logger';
import { AppError, handleApplicationError } from '../services/errorHandler';
import { ErrorCodes } from '../lib/errorCodes';

interface RetryOptions {
    retries?: number;
    delay?: number;
    factor?: number;
    shouldRetry?: (error: unknown) => boolean;
    onRetry?: (attempt: number, error: unknown, delay: number) => void;
}

export async function retry<T>(
    fn: () => Promise<T>,
    options?: RetryOptions
): Promise<T> {
    const {
        retries = 3,
        delay = 100,
        factor = 2,
        shouldRetry = (_error: unknown) => {
            return false;
        },
        onRetry = (attempt: number, error: unknown, currentDelay: number) => {
            logger.warn(`Tentativa ${attempt}/${retries} falhou. Retentando em ${currentDelay}ms.`, { error, attempt, currentDelay });
        },
    } = options || {};

    let currentDelay = delay;
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            return await fn();
        } catch (error: unknown) {
            if (attempt <= retries && shouldRetry(error)) {
                onRetry(attempt, error, currentDelay);
                await new Promise(resolve => setTimeout(resolve, currentDelay));
                currentDelay *= factor;
            } else {
                throw handleApplicationError(error, { attempt, retries });
            }
        }
    }
    throw new AppError(ErrorCodes.UNKNOWN_ERROR, 'Erro inesperado no utilitario de retry.');
}