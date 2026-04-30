/**
 * @file Seletores puros sobre CargoState. Todos recebem o state e retornam
 * dados derivados — nenhum efeito colateral, nenhum hook. Servem tanto para
 * `useCargoStore(selectX)` quanto para uso direto em testes/relatórios.
 */
import type { Cargo } from '@/domain/Cargo';
import type { CargoLocation } from '@/domain/Location';
import type { CargoState } from '../cargoStore';

/** Lista plana de TODAS as cargas (não alocadas + alocadas em todos os conveses/baias). */
export function selectAllCargoes(state: Pick<CargoState, 'unallocatedCargoes' | 'locations'>): Cargo[] {
  const all: Cargo[] = [...state.unallocatedCargoes];
  for (const loc of state.locations) {
    for (const bay of loc.bays) {
      all.push(...bay.allocatedCargoes);
    }
  }
  return all;
}

/** Soma do peso (toneladas × quantidade) de todas as cargas alocadas. */
export function selectTotalAllocatedWeight(state: Pick<CargoState, 'locations'>): number {
  let total = 0;
  for (const loc of state.locations) {
    for (const bay of loc.bays) {
      for (const cargo of bay.allocatedCargoes) {
        total += (cargo.weightTonnes || 0) * (cargo.quantity || 1);
      }
    }
  }
  return total;
}

/** Soma do peso das cargas não alocadas. */
export function selectTotalUnallocatedWeight(
  state: Pick<CargoState, 'unallocatedCargoes'>
): number {
  return state.unallocatedCargoes.reduce(
    (s, c) => s + (c.weightTonnes || 0) * (c.quantity || 1),
    0
  );
}

/** Quantidade de cargas no inventário não alocado. */
export function selectUnallocatedCount(state: Pick<CargoState, 'unallocatedCargoes'>): number {
  return state.unallocatedCargoes.length;
}

/** Quantidade total de cargas alocadas em conveses/baias. */
export function selectAllocatedCount(state: Pick<CargoState, 'locations'>): number {
  let count = 0;
  for (const loc of state.locations) {
    for (const bay of loc.bays) {
      count += bay.allocatedCargoes.length;
    }
  }
  return count;
}

/** Cargas perigosas (HAZARDOUS ou flag isHazardous) em qualquer lugar. */
export function selectHazardousCargoes(
  state: Pick<CargoState, 'unallocatedCargoes' | 'locations'>
): Cargo[] {
  return selectAllCargoes(state).filter(
    (c) => c.isHazardous || c.category === 'HAZARDOUS'
  );
}

/** Convés ativo (ou null se nenhum). */
export function selectActiveLocation(
  state: Pick<CargoState, 'locations' | 'activeLocationId'>
): CargoLocation | null {
  if (!state.activeLocationId) return null;
  return state.locations.find((l) => l.id === state.activeLocationId) ?? null;
}

/** Distribuição transversal das cargas alocadas (somatório por bordo). */
export function selectTransverseDistribution(
  state: Pick<CargoState, 'locations'>
): { port: number; center: number; starboard: number } {
  const dist = { port: 0, center: 0, starboard: 0 };
  for (const loc of state.locations) {
    for (const bay of loc.bays) {
      for (const cargo of bay.allocatedCargoes) {
        const w = (cargo.weightTonnes || 0) * (cargo.quantity || 1);
        const side = cargo.positionInBay || 'center';
        dist[side] += w;
      }
    }
  }
  return dist;
}
