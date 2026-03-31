// src/utils/retry.ts
/**
 * @file Utilitário para retry automático de operações assíncronas.
 * Permite que uma função seja retentada um número configurável de vezes
 * em caso de falha, com um atraso exponencial entre as tentativas.
 */
import { logger } from './logger';
import { AppError, handleApplicationError } from '../services/errorHandler';
import { ErrorCodes } from '../lib/errorCodes';

interface RetryOptions {
    retries?: number; // Número máximo de tentativas (padrão: 3)
    delay?: number;   // Atraso inicial em ms (padrão: 100ms)
    factor?: number;  // Fator de crescimento do atraso (padrão: 2)
    shouldRetry?: (error: unknown) => boolean; // Função para decidir se deve retentar
    onRetry?: (attempt: number, error: unknown, delay: number) => void; // Callback em cada retry
}

/**
 * Envolve uma função assíncrona para adicionar lógica de retry.
 * @param fn A função assíncrona a ser executada e retentada.
 * @param options Opções de retry.
 * @returns O resultado da função ou lança o erro final.
 */
export async function retry<T>(
    fn: () => Promise<T>,
    options?: RetryOptions
): Promise<T> {
    const {
        retries = 3,
        delay = 100,
        factor = 2,
        shouldRetry = (error) => {
            // Por padrão, retenta em erros de rede ou timeout
            const appError = handleApplicationError(error);
            return [ErrorCodes.NETWORK_ERROR, ErrorCodes.API_TIMEOUT].includes(appError.code);
        },
        onRetry = (attempt, error, currentDelay) => {
            logger.warn(`Tentativa ${attempt}/${retries} falhou. Retentando em ${currentDelay}ms.`, { error: handleApplicationError(error), attempt, currentDelay });
        },
    } = options || {};

    let currentDelay = delay;
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt <= retries && shouldRetry(error)) {
                onRetry(attempt, error, currentDelay);
                await new Promise(resolve => setTimeout(resolve, currentDelay));
                currentDelay *= factor;
            } else {
                // Se não deve retentar ou excedeu o número de retries
                throw handleApplicationError(error, { attempt, retries });
            }
        }
    }
    // Este ponto não deve ser alcançado se o erro for sempre lançado no loop
    throw new AppError(ErrorCodes.UNKNOWN_ERROR, 'Erro inesperado no utilitário de retry.');
}