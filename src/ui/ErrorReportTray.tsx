import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle, X, ChevronUp, ChevronDown, Trash2, Lightbulb,
  AlertTriangle, AlertOctagon, Info, Network, Database, FileWarning, Cog
} from 'lucide-react';
import { useErrorReporter, type AppError, type ErrorCategory, type ErrorSeverity } from '@/features/errorReporter';
import { cn } from '@/lib/utils';

const SEVERITY_STYLES: Record<ErrorSeverity, {
  ring: string;
  bg: string;
  text: string;
  icon: typeof AlertCircle;
}> = {
  info: {
    ring: 'ring-brand-primary/30',
    bg: 'bg-brand-primary/10',
    text: 'text-brand-primary',
    icon: Info,
  },
  warning: {
    ring: 'ring-status-warning/30',
    bg: 'bg-status-warning/10',
    text: 'text-status-warning',
    icon: AlertTriangle,
  },
  error: {
    ring: 'ring-status-error/30',
    bg: 'bg-status-error/10',
    text: 'text-status-error',
    icon: AlertCircle,
  },
  critical: {
    ring: 'ring-status-error/50',
    bg: 'bg-status-error/15',
    text: 'text-status-error',
    icon: AlertOctagon,
  },
};

const CATEGORY_ICONS: Record<ErrorCategory, typeof AlertCircle> = {
  import: FileWarning,
  network: Network,
  validation: AlertTriangle,
  storage: Database,
  runtime: Cog,
  unknown: AlertCircle,
};

const CATEGORY_LABELS: Record<ErrorCategory, string> = {
  import: 'Importação',
  network: 'Rede',
  validation: 'Validação',
  storage: 'Armazenamento',
  runtime: 'Sistema',
  unknown: 'Outro',
};

function formatTimestamp(d: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'agora há pouco';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min atrás`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h atrás`;
  return d.toLocaleString('pt-BR');
}

interface ErrorCardProps {
  err: AppError;
  onDismiss: (id: string) => void;
  onRemove: (id: string) => void;
}

/** Mapeia severity → label em pt-BR para o badge (em vez de "error"/"critical"
 *  cru, mostra "ERRO"/"CRÍTICO" — coerente com o resto da UI em pt-BR). */
const SEVERITY_LABELS: Record<ErrorSeverity, string> = {
  info: 'Aviso',
  warning: 'Atenção',
  error: 'Erro',
  critical: 'Crítico',
};

function ErrorCard({ err, onDismiss, onRemove }: ErrorCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const sev = SEVERITY_STYLES[err.severity];
  const SevIcon = sev.icon;
  const CatIcon = CATEGORY_ICONS[err.category];
  // Em error/critical o título carrega a cor semântica (vermelho); em
  // info/warning fica neutro (text-primary) — evita ruído cromático.
  const isCritical = err.severity === 'error' || err.severity === 'critical';

  return (
    <div className={cn(
      'rounded-2xl border-2 transition-all p-4 space-y-3',
      err.dismissed
        ? 'bg-sidebar/30 border-subtle opacity-60'
        : `bg-main border-status-error/40 shadow-md`
    )}>
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', sev.bg)}>
          <SevIcon size={18} className={sev.text} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h4 className={cn(
              'text-[13px] font-black uppercase tracking-widest leading-tight',
              isCritical ? 'text-status-error' : 'text-primary'
            )}>
              {err.title}
            </h4>
            <span className={cn(
              'text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md shrink-0',
              sev.bg, sev.text
            )}>
              {SEVERITY_LABELS[err.severity]}
            </span>
          </div>

          {/* Mensagem principal — text-primary para legibilidade (era
              text-secondary, washed out demais para conteúdo de erro). */}
          <p className="text-[12px] font-medium text-primary leading-relaxed">{err.message}</p>

          <div className="flex items-center gap-2 mt-2 text-[10px] font-black text-muted uppercase tracking-widest">
            <CatIcon size={11} />
            <span>{CATEGORY_LABELS[err.category]}</span>
            <span aria-hidden="true">·</span>
            <span>{formatTimestamp(err.timestamp)}</span>
          </div>

          {/* Sugestão — usa brand-primary em vez de yellow/warning para
              evitar choque cromático com a borda vermelha do card. */}
          {err.suggestion && (
            <div className="mt-3 p-3 bg-brand-primary/5 border border-brand-primary/20 rounded-lg flex items-start gap-2">
              <Lightbulb size={12} className="text-brand-primary shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium text-primary leading-relaxed">
                <span className="font-black text-brand-primary uppercase tracking-widest">Sugestão: </span>
                {err.suggestion}
              </p>
            </div>
          )}

          {/* Detalhes técnicos (collapsible) */}
          {err.details && (
            <div className="mt-2">
              <button
                onClick={() => setShowDetails(s => !s)}
                className="focus-ring flex items-center gap-1 text-[10px] font-black text-muted hover:text-primary uppercase tracking-widest transition-colors min-h-[28px]"
              >
                {showDetails ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                {showDetails ? 'Ocultar detalhes técnicos' : 'Ver detalhes técnicos'}
              </button>
              {showDetails && (
                <pre className="mt-2 p-2.5 bg-sidebar border border-subtle rounded-lg text-[10px] font-mono text-secondary whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                  {err.details}
                </pre>
              )}
            </div>
          )}

          {/* Ações */}
          <div className="flex items-center gap-2 mt-3">
            {err.action && (
              <button
                onClick={err.action.onClick}
                className={cn(
                  'focus-ring flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all min-h-[32px]',
                  sev.bg, sev.text, `border ${sev.ring} hover:brightness-110 active:scale-95`
                )}
              >
                {err.action.label}
              </button>
            )}
            {!err.dismissed && (
              <button
                onClick={() => onDismiss(err.id)}
                className="focus-ring flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-muted hover:text-primary hover:bg-sidebar transition-all min-h-[32px]"
              >
                Dispensar
              </button>
            )}
            <button
              onClick={() => onRemove(err.id)}
              className="focus-ring ml-auto p-2 rounded-lg text-muted hover:text-status-error hover:bg-status-error/10 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
              title="Remover deste log"
              aria-label="Remover erro do histórico"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Bandeja flutuante (canto inferior esquerdo) para gestão de erros do app.
 * Mostra um badge pulsante quando há erros não dispensados; expande em painel
 * com lista navegável + sugestões + ações + detalhes técnicos colapsáveis.
 */
export function ErrorReportTray() {
  const errors = useErrorReporter(s => s.errors);
  const dismiss = useErrorReporter(s => s.dismiss);
  const dismissAll = useErrorReporter(s => s.dismissAll);
  const remove = useErrorReporter(s => s.remove);
  const clear = useErrorReporter(s => s.clear);
  const [open, setOpen] = useState(false);

  const activeCount = useMemo(() => errors.filter(e => !e.dismissed).length, [errors]);
  const criticalCount = useMemo(() => errors.filter(e => !e.dismissed && (e.severity === 'critical' || e.severity === 'error')).length, [errors]);

  if (errors.length === 0) return null;

  return createPortal(
    <>
      {/* Botão flutuante (FAB) — canto inferior esquerdo */}
      <button
        onClick={() => setOpen(o => !o)}
        title={activeCount > 0 ? `${activeCount} erro(s) ativo(s)` : 'Histórico de erros'}
        aria-label={activeCount > 0 ? `${activeCount} erros ativos. Abrir log.` : 'Abrir histórico de erros'}
        className={cn(
          'focus-ring fixed bottom-6 left-6 z-[1100] flex items-center gap-2.5 px-4 py-3 rounded-2xl text-white shadow-high transition-all active:scale-95 min-h-[48px]',
          activeCount > 0
            ? 'bg-gradient-to-br from-status-error to-red-700 hover:brightness-110'
            : 'bg-sidebar border border-subtle text-secondary hover:text-primary opacity-80 hover:opacity-100'
        )}
      >
        <AlertCircle size={18} className={activeCount > 0 ? 'animate-pulse' : ''} />
        <div className="flex flex-col items-start leading-none">
          <span className="text-[11px] font-black uppercase tracking-widest">
            {activeCount > 0 ? `${activeCount} erro${activeCount !== 1 ? 's' : ''}` : 'Log de Erros'}
          </span>
          {criticalCount > 0 && (
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-90 mt-0.5">
              {criticalCount} crítico{criticalCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-status-warning border-2 border-main animate-ping" />
        )}
      </button>

      {/* Painel de erros */}
      {open && (
        <div className="fixed bottom-24 left-6 z-[1100] w-[460px] max-w-[calc(100vw-3rem)] max-h-[70vh] bg-main border-2 border-subtle rounded-3xl shadow-high overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200" role="dialog" aria-labelledby="error-log-heading">
          {/* Header */}
          <div className="px-5 py-4 border-b-2 border-subtle bg-sidebar/40 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-status-error/10 border border-status-error/30 flex items-center justify-center">
                <AlertCircle size={18} className="text-status-error" />
              </div>
              <div>
                <h3 id="error-log-heading" className="text-[13px] font-black text-primary uppercase tracking-widest leading-none">Log de Erros do App</h3>
                <p className="text-[10px] font-bold text-secondary mt-1">
                  <span className="font-mono tabular-nums text-primary">{activeCount}</span> ativo{activeCount !== 1 ? 's' : ''}
                  <span aria-hidden="true"> · </span>
                  <span className="font-mono tabular-nums text-muted">{errors.length}</span> total no histórico
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="focus-ring p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-muted hover:text-primary hover:bg-main transition-all"
              title="Fechar"
              aria-label="Fechar log de erros"
            >
              <X size={16} />
            </button>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 no-scrollbar">
            {errors.length === 0 ? (
              <div className="text-center py-12 text-muted text-[11px] font-bold">
                Nenhum erro registrado.
              </div>
            ) : (
              errors.map(err => (
                <ErrorCard key={err.id} err={err} onDismiss={dismiss} onRemove={remove} />
              ))
            )}
          </div>

          {/* Footer */}
          {errors.length > 0 && (
            <div className="px-5 py-3 border-t border-subtle bg-sidebar/40 flex items-center justify-between gap-2 shrink-0">
              <button
                onClick={dismissAll}
                disabled={activeCount === 0}
                className="focus-ring px-2 py-1.5 min-h-[32px] rounded-lg text-[10px] font-black text-muted hover:text-primary uppercase tracking-widest transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Dispensar todos
              </button>
              <button
                onClick={clear}
                className="focus-ring flex items-center gap-1.5 px-2 py-1.5 min-h-[32px] rounded-lg text-[10px] font-black text-muted hover:text-status-error uppercase tracking-widest transition-colors"
              >
                <Trash2 size={12} />
                Limpar histórico
              </button>
            </div>
          )}
        </div>
      )}
    </>,
    document.body
  );
}
