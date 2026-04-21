// src/hooks/useErrorHandler.ts
/**
 * @file Hook customizado para gerenciar e exibir erros na interface do usuário.
 * Fornece uma forma consistente de notificar o usuário sobre problemas.
 */
import { useState, useCallback } from 'react';
import { AppError } from '../services/errorHandler';
import { logger } from '../utils/logger';

/**
 * Define a estrutura do estado de erro para o hook.
 */
interface ErrorState {
    error: AppError | null;
    hasError: boolean;
}

/**
 * Hook para gerenciar e exibir erros na UI.
 * @returns Um objeto contendo o estado de erro e funções para definir/limpar erros.
 */
export function useErrorHandler() {
    const [errorState, setErrorState] = useState<ErrorState>({
        error: null,
        hasError: false,
    });

    /**
     * Define um erro a ser exibido.
     * @param error A instância de AppError a ser definida.
     */
    const setError = useCallback((error: AppError) => {
        logger.error(`Exibindo erro na UI: ${error.message}`, error);
        setErrorState({ error, hasError: true });
    }, []);

    /**
     * Limpa o erro atualmente exibido.
     */
    const clearError = useCallback(() => {
        setErrorState({ error: null, hasError: false });
        logger.debug('Erro da UI limpo.');
    }, []);

    return { ...errorState, setError, clearError };
}