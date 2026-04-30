import { describe, it, expect } from 'vitest';
import {
  selectAllCargoes,
  selectTotalAllocatedWeight,
  selectTotalUnallocatedWeight,
  selectUnallocatedCount,
  selectAllocatedCount,
  selectHazardousCargoes,
  selectActiveLocation,
  selectTransverseDistribution,
} from './selectors';
import type { Cargo } from '@/domain/Cargo';
import type { CargoLocation } from '@/domain/Location';

const mkCargo = (over: Partial<Cargo> = {}): Cargo => ({
  id: 'c-' + Math.random().toString(36).slice(2, 8),
  identifier: 'BOX-1',
  description: 'X',
  weightTonnes: 10,
  widthMeters: 1,
  lengthMeters: 1,
  quantity: 1,
  category: 'GENERAL',
  status: 'UNALLOCATED',
  ...over,
});

const mkLoc = (id: string, name: string, baysCargoes: Cargo[][] = []): CargoLocation => ({
  id,
  name,
  config: {} as CargoLocation['config'],
  bays: baysCargoes.map((cargoes, i) => ({
    id: `${id}-bay-${i + 1}`,
    number: i + 1,
    name: `Baia ${i + 1}`,
    maxWeightTonnes: 100,
    maxAreaSqMeters: 50,
    allocatedCargoes: cargoes,
    currentWeightTonnes: 0,
    currentOccupiedArea: 0,
  })),
});

describe('selectors', () => {
  const unallocatedCargoes = [
    mkCargo({ id: 'u1', weightTonnes: 5 }),
    mkCargo({ id: 'u2', weightTonnes: 8, quantity: 2 }),
  ];

  const locations = [
    mkLoc('L1', 'Convés Principal', [
      [mkCargo({ id: 'a1', weightTonnes: 10, positionInBay: 'port' })],
      [mkCargo({ id: 'a2', weightTonnes: 12, positionInBay: 'starboard', isHazardous: true })],
    ]),
    mkLoc('L2', 'Riser Deck', [
      [mkCargo({ id: 'a3', weightTonnes: 4, positionInBay: 'center' })],
    ]),
  ];

  const state = { unallocatedCargoes, locations, activeLocationId: 'L1' };

  it('selectAllCargoes: concatena todas as cargas', () => {
    expect(selectAllCargoes(state)).toHaveLength(5);
  });

  it('selectTotalAllocatedWeight respeita quantity', () => {
    expect(selectTotalAllocatedWeight(state)).toBe(10 + 12 + 4);
  });

  it('selectTotalUnallocatedWeight inclui multiplicador', () => {
    expect(selectTotalUnallocatedWeight(state)).toBe(5 + 8 * 2);
  });

  it('counts batem com tamanhos das listas', () => {
    expect(selectUnallocatedCount(state)).toBe(2);
    expect(selectAllocatedCount(state)).toBe(3);
  });

  it('selectHazardousCargoes captura por flag e por categoria', () => {
    const haz = selectHazardousCargoes({
      unallocatedCargoes: [mkCargo({ id: 'h1', category: 'HAZARDOUS' })],
      locations,
    });
    expect(haz.map((c) => c.id).sort()).toEqual(['a2', 'h1']);
  });

  it('selectActiveLocation retorna a localidade certa', () => {
    expect(selectActiveLocation(state)?.name).toBe('Convés Principal');
  });

  it('selectActiveLocation retorna null quando id ausente', () => {
    expect(
      selectActiveLocation({ locations, activeLocationId: null })
    ).toBeNull();
  });

  it('selectTransverseDistribution distribui peso por bordo', () => {
    const dist = selectTransverseDistribution(state);
    expect(dist.port).toBe(10);
    expect(dist.starboard).toBe(12);
    expect(dist.center).toBe(4);
  });
});
