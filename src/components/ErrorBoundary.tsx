// src/components/ErrorBoundary.tsx
/**
 * @file Componente React Error Boundary para capturar erros na árvore de componentes.
 * Impede que um erro em uma parte da UI quebre toda a aplicação, exibindo uma UI de fallback.
 */
import { Component, ErrorInfo, ReactNode } from 'react';
import { AppError, handleApplicationError } from '../services/errorHandler';
import { ErrorCodes } from '../lib/errorCodes';
import { logger } from '../utils/logger';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode; // UI de fallback customizada
    onError?: (error: AppError, errorInfo: ErrorInfo) => void; // Callback para erros
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: AppError | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    public state: ErrorBoundaryState = {
        hasError: false,
        error: null,
    };

    /**
     * Este método é chamado após um erro ser lançado por um componente filho.
     * Ele atualiza o estado para que a próxima renderização exiba a UI de fallback.
     */
    public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        // Atualiza o estado para que a próxima renderização mostre a UI de fallback.
        return { hasError: true, error: handleApplicationError(error, { code: ErrorCodes.COMPONENT_RENDER_ERROR }) };
    }

    /**
     * Este método é chamado após um erro ser lançado.
     * É um bom lugar para logar informações sobre o erro.
     */
    public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        const appError = handleApplicationError(error, { code: ErrorCodes.COMPONENT_RENDER_ERROR, componentStack: errorInfo.componentStack });
        logger.error('Erro capturado pelo ErrorBoundary:', appError, { errorInfo });

        if (this.props.onError) {
            this.props.onError(appError, errorInfo);
        }
    }

    public render(): ReactNode {
        if (this.state.hasError) {
            // Você pode renderizar qualquer UI de fallback customizada
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 text-red-800 p-4">
                    <h1 className="text-3xl font-bold mb-4">Ocorreu um erro inesperado!</h1>
                    <p className="text-lg mb-2">
                        {this.state.error?.message || 'Algo deu muito errado na aplicação.'}
                    </p>
                    <p className="text-sm text-red-600 mb-4">
                        Código do Erro: {this.state.error?.code || ErrorCodes.UNKNOWN_ERROR}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-colors"
                    >
                        Recarregar Aplicação
                    </button>
                    {(import.meta as any).env?.DEV && this.state.error && (
                        <details className="mt-8 p-4 bg-red-100 rounded-lg text-left w-full max-w-lg">
                            <summary className="font-semibold cursor-pointer">Detalhes Técnicos (Apenas em Desenvolvimento)</summary>
                            <pre className="mt-2 whitespace-pre-wrap break-words text-sm">
                                {this.state.error.stack}
                                <br />
                                {this.state.error.originalError != null && (
                                    <>
                                        <br />
                                        Original Error: {String(this.state.error.originalError)}
                                    </>
                                )}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}