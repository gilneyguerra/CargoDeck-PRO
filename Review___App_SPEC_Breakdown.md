I have the following comments after thorough review of file. Implement the comments by following the instructions verbatim.

---
## Comment 1: Auto-save can overwrite existing cloud plans before hydration completes, causing silent remote data loss after login.

In `src/hooks/useAutoSave.ts`, gate auto-save behind an explicit hydration-ready condition from the store (for example, a new `isHydratedFromCloud` flag). In `src/hooks/useAuthAndHydration.ts`, set this flag only after load attempt completes (success or empty result). In `src/infrastructure/DatabaseService.ts`, keep save idempotent but do not rely on it to resolve startup races. Ensure auto-save is skipped until hydration has finished for the current authenticated session.

### Relevant Files
- c:\Users\gguerra\Desktop\CargoDeck-PRO-master\src\hooks\useAutoSave.ts
- c:\Users\gguerra\Desktop\CargoDeck-PRO-master\src\hooks\useAuthAndHydration.ts
- c:\Users\gguerra\Desktop\CargoDeck-PRO-master\src\infrastructure\DatabaseService.ts
---
## Comment 2: Cargo deletion lookup runs after local mutation, so remote deletion frequently never executes and cloud state drifts.

In `src/features/cargoStore.ts` inside `deleteCargo`, capture the target cargo and source context before mutating state. Execute backend deletion using the captured identifier regardless of post-mutation lookup. Keep local-first UX, but add a compensating retry/log path if backend deletion fails. Do not depend on querying already-mutated state to discover the deleted cargo.

### Relevant Files
- c:\Users\gguerra\Desktop\CargoDeck-PRO-master\src\features\cargoStore.ts
- c:\Users\gguerra\Desktop\CargoDeck-PRO-master\src\infrastructure\DatabaseService.ts
---
## Comment 3: Bay weight and area totals are recomputed from stale arrays during cargo updates, producing incorrect capacity indicators.

In `src/features/cargoStore.ts` within `updateCargo`, compute a local `updatedAllocatedCargoes` per bay first. Recalculate `currentWeightTonnes` and `currentOccupiedArea` from that updated array, then return the bay with both the updated list and recomputed aggregates. Apply the same invariant pattern in other mutators where aggregate fields depend on cargo lists.

### Relevant Files
- c:\Users\gguerra\Desktop\CargoDeck-PRO-master\src\features\cargoStore.ts
---
## Comment 4: Changing bay count recreates bays with empty cargo and zero max area, causing hidden data loss and invalid limits.

In `src/features/cargoStore.ts` inside `updateActiveLocationConfig`, do not silently drop allocated cargo when bay count changes. Either migrate all affected cargo to `unallocatedCargoes` with user confirmation or remap them deterministically to new bays. Initialize new bay `maxAreaSqMeters` using deck dimensions (`bayLengthMeters` and section widths or equivalent policy), never zero by default. Reflect this behavior in `src/ui/DeckSettingsModal.tsx` with a clear warning/confirmation before destructive changes.

### Relevant Files
- c:\Users\gguerra\Desktop\CargoDeck-PRO-master\src\features\cargoStore.ts
- c:\Users\gguerra\Desktop\CargoDeck-PRO-master\src\ui\DeckSettingsModal.tsx
- c:\Users\gguerra\Desktop\CargoDeck-PRO-master\src\ui\DeckArea.tsx
---
## Comment 5: Side occupancy calculations ignore cargo quantity, underreporting used area and masking real overload conditions in UI.

In `src/ui/DeckArea.tsx` within `DroppableBaySide`, update `currentOccupiedArea` calculation to include `cargo.quantity`. Ensure area formulas match store invariants used in `src/features/cargoStore.ts`. Review any other UI summaries in `DeckArea` and related components for the same quantity omission and normalize the formula consistently.

### Relevant Files
- c:\Users\gguerra\Desktop\CargoDeck-PRO-master\src\ui\DeckArea.tsx
- c:\Users\gguerra\Desktop\CargoDeck-PRO-master\src\features\cargoStore.ts
---