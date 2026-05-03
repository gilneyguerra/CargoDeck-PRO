import { useEffect, useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { useCargoStore } from '@/features/cargoStore';

/**
 * Indicador discreto de auto-save no header global.
 *
 * Estados:
 * - saving:   spinner + "Salvando…"
 * - saved:    check + "Salvo HH:MM" (visível por 4s após cada save bem-sucedido)
 * - idle:     null (operador nunca alterou nada nesta sessão)
 *
 * Lê isSaving e lastSavedAt do cargoStore via selectors granulares — não
 * re-renderiza com mudanças de cargas/locations.
 */
export function SaveIndicator() {
  const isSaving = useCargoStore(s => s.isSaving);
  const lastSavedAt = useCargoStore(s => s.lastSavedAt);

  // "Salvo" é informação transitória: aparece 4s e some, evita poluir o
  // header quando o operador já viu a confirmação. Próximo save reinicia.
  const [showSaved, setShowSaved] = useState(false);
  useEffect(() => {
    if (lastSavedAt === null) return;
    setShowSaved(true);
    const t = setTimeout(() => setShowSaved(false), 4000);
    return () => clearTimeout(t);
  }, [lastSavedAt]);

  if (isSaving) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest text-secondary bg-sidebar/50 border border-subtle">
        <Loader2 size={12} className="animate-spin text-brand-primary" />
        <span>Salvando…</span>
      </div>
    );
  }

  if (showSaved && lastSavedAt) {
    const time = new Date(lastSavedAt).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest text-status-success bg-status-success/10 border border-status-success/30 animate-in fade-in duration-200">
        <Check size={12} />
        <span>Salvo {time}</span>
      </div>
    );
  }

  return null;
}
