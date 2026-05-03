/**
 * Skeleton placeholders para os 2 fluxos principais (deck + grid de modais)
 * durante a hidratação inicial do plano vindo do Supabase.
 *
 * Renderizam apenas quando isHydratedFromCloud === false E o store local
 * está vazio (ver gating em DeckArea / ModalGenerationPage). Operadores com
 * cache em localStorage veem o conteúdo direto, sem flicker de skeleton.
 */

/** Skeleton para a página /deck — emula tabs de location + 2-3 baias. */
export function DeckSkeleton() {
  return (
    <div
      className="flex-1 flex flex-col bg-main overflow-hidden"
      role="status"
      aria-label="Carregando plano de estivagem"
      aria-live="polite"
    >
      {/* Tabs row */}
      <div className="px-6 py-3 border-b-2 border-subtle bg-main flex items-center gap-2">
        <div className="h-10 w-32 rounded-xl bg-sidebar/40 animate-pulse" />
        <div className="h-10 w-28 rounded-xl bg-sidebar/40 animate-pulse" />
        <div className="h-10 w-24 rounded-xl bg-sidebar/40 animate-pulse" />
      </div>
      {/* Toolbar row */}
      <div className="px-6 py-4 border-b-2 border-subtle bg-sidebar/30 flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-sidebar/40 animate-pulse" />
        <div className="h-6 w-48 rounded bg-sidebar/40 animate-pulse" />
        <div className="ml-auto h-12 w-44 rounded-2xl bg-sidebar/40 animate-pulse" />
      </div>
      {/* Bay grid */}
      <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-subtle bg-sidebar/30 p-4 flex flex-col gap-3 animate-pulse"
            style={{ animationDelay: `${i * 80}ms`, minHeight: 180 }}
          >
            <div className="h-5 w-1/3 rounded bg-sidebar/60" />
            <div className="flex-1 rounded-lg bg-sidebar/50" />
            <div className="flex gap-2">
              <div className="h-8 flex-1 rounded-lg bg-sidebar/60" />
              <div className="h-8 w-16 rounded-lg bg-sidebar/60" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Carregando…</span>
    </div>
  );
}

/** Skeleton para a página /modais — emula header de criação + grid de cards. */
export function GridSkeleton() {
  return (
    <div
      className="flex-1 flex flex-col bg-main overflow-hidden"
      role="status"
      aria-label="Carregando inventário de modais de transporte"
      aria-live="polite"
    >
      {/* Toolbar header */}
      <div className="px-6 py-4 border-b-2 border-subtle bg-sidebar/30 flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-sidebar/40 animate-pulse" />
        <div className="h-6 w-56 rounded bg-sidebar/40 animate-pulse" />
        <div className="ml-auto h-12 w-44 rounded-2xl bg-sidebar/40 animate-pulse" />
      </div>
      {/* Tabs row */}
      <div className="px-6 py-3 border-b-2 border-subtle bg-main flex items-center gap-2">
        <div className="h-10 w-24 rounded-xl bg-sidebar/40 animate-pulse" />
        <div className="h-10 w-28 rounded-xl bg-sidebar/40 animate-pulse" />
        <div className="h-10 w-20 rounded-xl bg-sidebar/40 animate-pulse" />
      </div>
      {/* Grid header (Selecionar Tudo + Search + creation buttons) */}
      <div className="px-6 pt-6 flex items-center gap-3 flex-wrap">
        <div className="h-9 w-40 rounded-xl bg-sidebar/40 animate-pulse" />
        <div className="h-9 w-60 rounded-xl bg-sidebar/40 animate-pulse" />
        <div className="h-9 w-44 rounded-xl bg-sidebar/40 animate-pulse" />
        <div className="h-9 w-44 rounded-xl bg-sidebar/40 animate-pulse" />
      </div>
      {/* Cards grid */}
      <div className="flex-1 p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-subtle bg-sidebar/30 p-4 flex flex-col gap-3 animate-pulse"
            style={{ animationDelay: `${i * 60}ms`, minHeight: 260 }}
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-sidebar/60" />
              <div className="h-4 w-12 rounded bg-sidebar/60" />
            </div>
            <div className="flex-1 rounded-xl bg-sidebar/50" />
            <div className="h-3 w-3/4 rounded bg-sidebar/60" />
            <div className="grid grid-cols-4 gap-1 -mt-1">
              <div className="h-9 rounded-md bg-sidebar/60" />
              <div className="h-9 rounded-md bg-sidebar/60" />
              <div className="h-9 rounded-md bg-sidebar/60" />
              <div className="h-9 rounded-md bg-sidebar/60" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
