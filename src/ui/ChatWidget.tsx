import { lazy, Suspense, useMemo } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useAssistantStore } from '@/features/assistantStore';
import { useCargoStore } from '@/features/cargoStore';
import { cn } from '@/lib/utils';

/**
 * @file Chat widget flutuante — FAB (floating action button) que abre
 * o `CargoAssistant` (IA) em qualquer rota da app. Fica fixado no
 * canto inferior direito, sempre visível.
 *
 * Estado (open/close) vive em `assistantStore` para sobreviver à
 * navegação entre rotas. O componente CargoAssistant é lazy-loaded —
 * só baixa o chunk quando o usuário abre pela primeira vez.
 */

const CargoAssistant = lazy(() =>
  import('./CargoAssistant').then(m => ({ default: m.CargoAssistant }))
);

export function ChatWidget() {
  const { open, setOpen, toggle } = useAssistantStore();

  // selectedCargos: passa o conjunto atual selecionado (se houver), permitindo
  // o assistente responder com contexto. Sem seleção, lista vazia → assistente
  // responde sobre o app em geral.
  //
  // CUIDADO: selector zustand não pode retornar `.filter()` direto (ref nova
  // em toda chamada → loop infinito → React error #185). Usa dois selectors
  // primitivos com refs estáveis e deriva via useMemo.
  const unallocatedCargoes = useCargoStore(s => s.unallocatedCargoes);
  const selectedSet = useCargoStore(s => s.selectedCargos);
  const selectedCargos = useMemo(
    () => unallocatedCargoes.filter(c => selectedSet.has(c.id)),
    [unallocatedCargoes, selectedSet],
  );

  return (
    <>
      {/* FAB — sempre visível, canto inferior direito. z-index abaixo do
          modal (1000) mas acima do conteúdo (~10). */}
      <button
        onClick={toggle}
        title={open ? 'Fechar Assistente IA' : 'Abrir Assistente IA'}
        aria-label={open ? 'Fechar Assistente IA' : 'Abrir Assistente IA'}
        className={cn(
          'fixed bottom-6 right-6 z-[900] w-14 h-14 rounded-full',
          'flex items-center justify-center group cursor-pointer',
          'shadow-xl shadow-brand-primary/40 hover:shadow-2xl hover:shadow-brand-primary/60',
          'transition-[transform,box-shadow,background-color] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]',
          'hover:-translate-y-0.5 active:translate-y-0',
          open
            ? 'bg-status-error text-white'
            : 'bg-gradient-to-br from-brand-primary to-indigo-600 text-white',
        )}
      >
        {/* Anel pulsante para chamar atenção (só quando fechado e ocioso) */}
        {!open && (
          <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-brand-primary/40 animate-ping opacity-40" />
        )}
        {open ? (
          <X size={22} className="relative" />
        ) : (
          <Sparkles size={22} className="relative group-hover:rotate-12 transition-transform duration-300" />
        )}
        {/* Badge "online" indica que a IA está acessível */}
        {!open && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-status-success border-2 border-main animate-pulse" />
        )}
      </button>

      {/* Modal do assistente — renderiza quando aberto. Lazy chunk garante
          zero custo até o primeiro uso. */}
      {open && (
        <Suspense fallback={null}>
          <CargoAssistant
            isOpen={open}
            onClose={() => setOpen(false)}
            selectedCargos={selectedCargos}
          />
        </Suspense>
      )}
    </>
  );
}
