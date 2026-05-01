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
    isChunkLoadError: boolean;
}

/**
 * Detecta erros de carregamento de chunk lazy — geralmente causados por
 * deploy novo enquanto o usuário tem uma aba antiga aberta. O Vite gera
 * hashes únicos para cada chunk; se o navegador tem o `index.html` antigo
 * em cache mas o Vercel já purgou os chunks correspondentes, o `import()`
 * dinâmico falha com a mensagem abaixo.
 */
function isChunkLoadError(error: unknown): boolean {
    if (!error) return false;
    const msg = error instanceof Error ? error.message : String(error);
    return /Failed to fetch dynamically imported module/i.test(msg)
        || /ChunkLoadError/i.test(msg)
        || /Loading chunk \d+ failed/i.test(msg);
}

const RELOAD_FLAG = 'cargodeck-chunk-reload-attempted';

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    public state: ErrorBoundaryState = {
        hasError: false,
        error: null,
        isChunkLoadError: false,
    };

    /**
     * Este método é chamado após um erro ser lançado por um componente filho.
     * Ele atualiza o estado para que a próxima renderização exiba a UI de fallback.
     */
    public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        const chunk = isChunkLoadError(error);

        // Auto-reload no primeiro chunk-load-error da sessão. Se já tentou
        // recarregar e o erro persiste, mostra a UI manual (evita loop).
        if (chunk) {
            try {
                if (!sessionStorage.getItem(RELOAD_FLAG)) {
                    sessionStorage.setItem(RELOAD_FLAG, '1');
                    window.location.reload();
                }
            } catch { /* sessionStorage indisponível: cai pra UI manual */ }
        }

        return {
            hasError: true,
            error: handleApplicationError(error, { code: ErrorCodes.COMPONENT_RENDER_ERROR }),
            isChunkLoadError: chunk,
        };
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

    private handleHardReload = () => {
        try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* noop */ }
        // location.reload() faz GET com cache normal. Se o problema persiste,
        // o usuário pode usar Ctrl+Shift+R; aqui usamos reload simples para
        // não confundir com mudanças de comportamento.
        window.location.reload();
    };

    public render(): ReactNode {
        if (this.state.hasError) {
            // Você pode renderizar qualquer UI de fallback customizada
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Caso especial: erro de carregamento de chunk → mensagem amigável
            // explicando que é uma atualização do app, não um bug.
            if (this.state.isChunkLoadError) {
                return (
                    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-50 text-slate-800 p-4 font-sans">
                        <div className="max-w-md text-center space-y-4">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-3xl">
                                🔄
                            </div>
                            <h1 className="text-2xl font-bold">Versão atualizada disponível</h1>
                            <p className="text-base text-slate-600 leading-relaxed">
                                Uma nova versão do CargoDeck Plan foi publicada enquanto você navegava.
                                Recarregue para continuar.
                            </p>
                            <button
                                onClick={this.handleHardReload}
                                className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 transition-colors font-bold"
                            >
                                Recarregar agora
                            </button>
                            <p className="text-xs text-slate-500 mt-6">
                                Se o problema persistir, pressione <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-[10px] font-mono">Ctrl + Shift + R</kbd>.
                            </p>
                        </div>
                    </div>
                );
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
                    {import.meta.env.DEV && this.state.error && (
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