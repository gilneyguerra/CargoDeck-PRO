import { create } from 'zustand';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ErrorCategory = 'import' | 'network' | 'validation' | 'storage' | 'runtime' | 'unknown';
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AppError {
  id: string;
  timestamp: Date;
  category: ErrorCategory;
  severity: ErrorSeverity;
  /** Título curto exibido em destaque (ex.: "Falha ao importar Excel") */
  title: string;
  /** Mensagem principal — descreve o que aconteceu de forma direta */
  message: string;
  /** Stack trace, payload da resposta, ou outro detalhe técnico (oculto por padrão) */
  details?: string;
  /** Sugestão de correção em linguagem operacional (ex.: "Salve a planilha como .csv UTF-8 e tente de novo") */
  suggestion?: string;
  /** Ação direta que o usuário pode disparar (ex.: "Tentar novamente", "Abrir suporte") */
  action?: { label: string; onClick: () => void };
  /** Quando true, o erro foi marcado como visto/dispensado pelo usuário */
  dismissed: boolean;
  /** Origem identificadora para deduplicação (ex.: 'pdf-upload', 'cloud-save') */
  source?: string;
}

interface ErrorReporterState {
  errors: AppError[];
  /** Reporta um novo erro; retorna o id atribuído */
  report: (input: Omit<AppError, 'id' | 'timestamp' | 'dismissed'>) => string;
  /** Marca um erro como dispensado (não some da lista — fica oculto até clear()) */
  dismiss: (id: string) => void;
  /** Marca todos os erros como dispensados */
  dismissAll: () => void;
  /** Remove permanentemente um erro */
  remove: (id: string) => void;
  /** Limpa todos os erros (dispensados ou não) */
  clear: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

const MAX_RETAINED = 50; // limite para evitar memory bloat em sessões longas

export const useErrorReporter = create<ErrorReporterState>((set) => ({
  errors: [],

  report: (input) => {
    const id = Math.random().toString(36).slice(2, 11);
    const newError: AppError = {
      ...input,
      id,
      timestamp: new Date(),
      dismissed: false,
    };
    set((state) => {
      // Deduplicar por source: substitui erro anterior do mesmo source não-dispensado
      let nextErrors = state.errors;
      if (newError.source) {
        const existing = state.errors.find(e => e.source === newError.source && !e.dismissed);
        if (existing) {
          nextErrors = state.errors.map(e => e.id === existing.id ? newError : e);
        } else {
          nextErrors = [newError, ...state.errors];
        }
      } else {
        nextErrors = [newError, ...state.errors];
      }
      // Trim para evitar acúmulo infinito
      if (nextErrors.length > MAX_RETAINED) nextErrors = nextErrors.slice(0, MAX_RETAINED);
      return { errors: nextErrors };
    });
    return id;
  },

  dismiss: (id) => {
    set((state) => ({
      errors: state.errors.map(e => e.id === id ? { ...e, dismissed: true } : e),
    }));
  },

  dismissAll: () => {
    set((state) => ({
      errors: state.errors.map(e => ({ ...e, dismissed: true })),
    }));
  },

  remove: (id) => {
    set((state) => ({
      errors: state.errors.filter(e => e.id !== id),
    }));
  },

  clear: () => set({ errors: [] }),
}));

// ─── Helpers de uso comum ────────────────────────────────────────────────────

/**
 * Atalho para reportar exceções capturadas em try/catch.
 * Extrai mensagem/stack automaticamente.
 */
export function reportException(
  err: unknown,
  meta: {
    title: string;
    category: ErrorCategory;
    severity?: ErrorSeverity;
    suggestion?: string;
    source?: string;
    action?: AppError['action'];
  }
): string {
  const message = err instanceof Error ? err.message : String(err);
  const details = err instanceof Error && err.stack ? err.stack : undefined;
  return useErrorReporter.getState().report({
    title: meta.title,
    message,
    details,
    category: meta.category,
    severity: meta.severity ?? 'error',
    suggestion: meta.suggestion,
    source: meta.source,
    action: meta.action,
  });
}
