# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Snapshot

CargoDeck Plan / CargoDeck-PRO is a React SPA for **offshore cargo planning** (oil & gas logistics). Operators import vessel manifests (PDF/Excel), allocate cargo to deck bays via drag-and-drop, and export consolidated PDF/CSV reports. Persistence is per-user via Supabase (RLS-scoped); auth is via Supabase Auth.

**UI is 100% pt-BR** — all user-facing strings, comments, and copy are in Brazilian Portuguese. Code identifiers, commits, and this file are in English. Domain vocabulary mixes both: `Cargo`, `Bay`, `Location`, but `Bombordo` (port), `Boreste` (starboard), `Centro`, `Convés` (deck), `manifesto`, `unidade` (vessel).

## Commands

```bash
npm run dev          # vite dev server (default :5173)
npm run build        # tsc -b && vite build  (Vercel runs this)
npm run typecheck    # tsc --noEmit (no build, just types)
npm run lint         # eslint --max-warnings 0 — warnings = fatal in CI
npm run lint:fix     # eslint with --fix
npm test             # vitest in watch mode
npm test -- --run    # vitest single run
npm test -- path/to/file.test.ts   # single test file
npm run format       # prettier on src/
```

CI (`.github/workflows/security.yml`) runs `npm ci` → `npm run lint` → `npm audit --audit-level=high` → TruffleHog secret scan on every push to `main` and `feat/*`.

## Critical Build Rules

1. **Do NOT run `npm install` in the local dev environment** — the user has explicitly requested no automated package installation on this machine. New dependencies go into `package.json` and Vercel installs them at build time. The local `node_modules` may be missing or stale; expect imports of newly-added deps to fail in any local-only check.
2. **`tsconfig.json` is `strict: true`** with `noImplicitAny: false` and `useUnknownInCatchVariables: false` overrides. Every other strict-* flag is on (including `noUnusedLocals` and `noUnusedParameters`). The Vercel build runs `tsc -b` first — any `TS6133`/`TS2774`/`TS2345` is fatal.
3. **Always read [`LESSONS_LEARNED.md`](LESSONS_LEARNED.md) before committing.** It contains 14 numbered failure modes harvested from real Vercel build breaks. Recurring themes: orphaned imports after refactor (TS6133), `(item, i) => {}` with unused `i`, `typeof import('pkg')` for CDN-loaded libs, `Uint8Array<ArrayBufferLike>` vs Web APIs, `cast as Interface` defeating optional-chain guards.
4. **`package-lock.json` matters.** Adding a dep to `package.json` without updating the lock can silently break Vercel `npm ci`. If you add a dep and can't `npm install`, warn the user explicitly so they can run it.
5. Never throw at the top-level of `src/lib/`, `src/services/`, or `src/infrastructure/` modules — `App.tsx` imports them transitively before any component mounts, so a throw bricks the page before `ErrorBoundary` exists. Validate config at first use, not at import. (See lesson #13.)

## Architecture

### State (Zustand + persist)
- **[`src/features/cargoStore.ts`](src/features/cargoStore.ts)** is the heart — a single ~922-line store with `persist(localStorage)`. It owns: `unallocatedCargoes` (Cargo[]), `locations` (CargoLocation[] → bays → allocatedCargoes), manifest header data (ship/atendimento/route), `viewMode` ('deck' | 'modal-generation'), `selectedCargos` (Set), `editingCargo`. Exposes mutation actions (`addCargo`, `moveCargoToBay`, `batchMoveCargoesToSides`, `deleteCargo`, etc.) and `resetToDefault()` for logout.
- **[`src/features/store/selectors.ts`](src/features/store/selectors.ts)** holds **pure read-only selectors** that take a `Pick<CargoState, …>` slice. Use these in components that don't need the whole store. The store itself was deliberately NOT split into physical slices — it persists as a single unit and the API surface is wide; refactoring the create() is high-risk for low gain.
- **Other stores**: `notificationStore` (toasts + `ask()` Promise<boolean> + `showAlert()` + `askInput()`), `errorReporter` (50-cap dedup'd error log feeding the bottom-left ErrorReportTray), `reportSettingsStore` (logo + signatory for PDF), `useFocusTrap` (a11y).

### Data flow
- **Auth + hydration**: `src/hooks/useAuthAndHydration.ts` listens to Supabase auth events. On `SIGNED_IN` it calls `DatabaseService.loadStowagePlan()` and feeds the result into `cargoStore.hydrateFromDb()`. On `SIGNED_OUT` it resets every user-scoped store + localStorage key. The hook is only mounted inside `AppWithProviders`, so signed-out users on the LandingPage never trigger the load.
- **Auto-save**: `src/hooks/useAutoSave.ts` debounces store changes and calls `DatabaseService.saveStowagePlan()` only when `isHydratedFromCloud` is true (avoids overwriting cloud state with empty local state during initial load) and `session?.user` is present.
- **DB**: `src/infrastructure/DatabaseService.ts` uses `.eq('user_id', session.user.id)` and `.upsert({ onConflict: 'user_id, ship_code' })`. RLS at the Postgres level (see `supabase-setup.sql`) is the actual security boundary.

### LLM extraction pipeline
- **[`src/services/llmRouter.ts`](src/services/llmRouter.ts)** — task-typed router (`EXTRACTION` / `VALIDATION` / `CHAT` / `CORRECTION` / `FAQ`) → primary + fallback model on OpenCode Zen (OpenAI-compatible endpoint at `https://opencode.ai/zen/v1/chat/completions`). 3-attempt retry with exponential backoff, temperature ramp per task. Each task has its own system prompt baked in.
- **[`src/services/manifestExtractor.ts`](src/services/manifestExtractor.ts)** — orchestrates `EXTRACTION` → JSON parse with fence-stripping fallback → Zod `safeParse` (warning-only, doesn't bomb the flow) → `transformToCargoObjects` (SHA-256 dedup + ISO 6346 validation + category detection from description keywords). Supports both V2 `sections[]` (origin/destination groups) and legacy `cargasArray[]`.
- **[`src/services/docIndex.ts`](src/services/docIndex.ts)** + **`SYSTEM_PROMPTS.FAQ`** — the FAQ tab in `CargoAssistant` indexes `/docs/**/*.md` + `LESSONS_LEARNED.md` at build time via `import.meta.glob({ query: '?raw', eager: true })`, scores against query tokens (diacritic-stripped), and prepends top-3 excerpts to the LLM prompt.

### File parsing — no SheetJS in package.json
Excel parsing in `src/ui/CargoEditorModal.tsx` uses a **native ZIP+XML parser** built on `DecompressionStream` + `DOMParser`. There is a multi-CDN fallback for the `xlsx` library (unpkg → cdnjs → jsdelivr → sheetjs.com) loaded via `<script>`, but `xlsx` is **not** an npm dep. Lessons #10/#11/#12 document the TS gotchas for typing CDN-loaded libs (no `typeof import('xlsx')` — declare a local interface and cast `(window as any).XLSX as XlsxLib | undefined`).

PDF parsing for OCR uses `pdfjs-dist` 5.x worker + `tesseract.js` 7 (both real npm deps, lazy-initialized as singletons).

### Deck planning UI
- `src/ui/DeckArea.tsx` is the main deck view; `src/ui/ModalGenerationPage.tsx` is the unallocated-cargo grid. `viewMode` in cargoStore toggles between them.
- Drag & drop is `@dnd-kit/core` + `DragOverlay` in `App.tsx`. Bays use composite drop IDs `${bayId}-${side}` (port/center/starboard).
- **Stability is informational, never blocking.** [`src/hooks/useStabilityCalculation.ts`](src/hooks/useStabilityCalculation.ts) returns `'OK' | 'WARNING'` (no `'CRITICAL'`). The operator decides — the app surfaces imbalance visually but never refuses an action. Same principle for bay weight overflow: removed in commit `52c93b4`.

### Modal infrastructure
- All modals use `createPortal(content, document.body)` with `z-[1000]` (or `z-[1100]` for `AlertDialog`, `z-[1200]` for `DraggableCargo` tooltip). `StandardModal` backdrop is `z-1050`.
- Every modal has `useFocusTrap`, `role="dialog"` (or `"alertdialog"`), `aria-modal="true"`, and `aria-labelledby={useId()}`.
- Programmatic prompts: never use `alert()`/`confirm()`/`prompt()`. Use `useNotificationStore`'s `notify()`, `setBanner()`, `ask()`, `showAlert()`, `askInput()` — the corresponding modals (`PromptModal`, `AlertDialog`) are mounted globally via `ToastContainer`.
- Heavy modals are `React.lazy`-loaded (`EditCargoModal`, `CargoEditorModal`, `CargoAssistant`, `ReportSettingsModal`) and gated with `{isOpen && <Suspense fallback={null}>…</Suspense>}` so the chunk only downloads on first open.

### Performance
- `vite.config.ts` declares manualChunks: `pdf` (jspdf), `pdfjs`, `tesseract`, `security` (zod + dompurify), `dnd`, `supabase`, `icons`, `vendor`. Updates here directly affect Lighthouse score.
- `jsPDF` is dynamically imported inside `PdfGeneratorService.generateBlob` so ~80 KB gz only ships when the user actually exports.

### Landing page
- [`src/ui/LandingPage.tsx`](src/ui/LandingPage.tsx) renders before login. The 6 Feature Showcase mocks under [`src/ui/landing/mocks/`](src/ui/landing/mocks/) are pure-JSX simulations (NOT real screenshots) that animate via CSS keyframes defined in the `<style>` block at the bottom of `LandingPage.tsx`. `useScrollReveal` (IntersectionObserver) drives entry animations. `prefers-reduced-motion: reduce` neutralizes everything globally.

## Conventions

- **Path alias**: `@/` → `src/`. Always prefer `@/features/cargoStore` over `../../features/cargoStore`.
- **Design tokens**: Tailwind classes only — never inline hex except inside the `LandingPage.tsx` mocks (where they style the simulated app UI). App tokens live in `src/index.css` (`bg-main`, `bg-sidebar`, `bg-header`, `text-primary`, `text-secondary`, `text-muted`, `border-subtle`, `border-strong`, `brand-primary`, `status-success`/`error`/`warning`). Landing-only tokens: `bg-navy`, `text-cyan-neon`, `text-action`, `text-maritime`.
- **Comments**: minimal. Add only when WHY is non-obvious — hidden constraints, prior bug context, surprising invariant. Don't restate WHAT the code does.
- **Tests**: `vitest` with `environment: 'node'` (no jsdom — DOMPurify and DOM-touching code are not unit tested here). Tests live next to the file they cover (`*.test.ts`). Coverage focus is pure logic: schemas, selectors, store-shape utilities, `useStabilityCalculation`.

## CSP

`vercel.json` defines a strict CSP **without `'unsafe-eval'`**. `worker-src 'self' blob:` is required for Tesseract and pdf.js workers. `connect-src` must include `https://opencode.ai` for the LLM router. If you add a third-party endpoint, update CSP — silent failures look like "the IA stopped responding" with no obvious cause.

## Workflow expectations

- The user expects PT-BR responses unless the topic is purely English (e.g., debugging an English-only error message).
- Each interaction usually ends with a `git push origin main` to trigger Vercel deploy. Confirm before pushing if the changes are large or risky.
- Before every push: re-read recent entries of `LESSONS_LEARNED.md` and grep your own diff for the patterns documented there. New patterns get appended as numbered lessons.
- Do not start the Vite dev server unless asked — local node tooling is unreliable in this environment.
