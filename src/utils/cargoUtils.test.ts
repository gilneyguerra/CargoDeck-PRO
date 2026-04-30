import { describe, it, expect } from 'vitest';
import { calculateBayStats, findDuplicateOnboard } from './cargoUtils';
import type { Cargo } from '@/domain/Cargo';
import type { CargoLocation } from '@/domain/Location';

const makeCargo = (overrides: Partial<Cargo> = {}): Cargo => ({
  id: 'c-1',
  identifier: 'MLTU 280189-9',
  description: 'Container 20',
  weightTonnes: 12.5,
  widthMeters: 2.4,
  lengthMeters: 6.1,
  heightMeters: 2.6,
  quantity: 1,
  category: 'CONTAINER',
  status: 'ALLOCATED',
  ...overrides,
});

const makeLocation = (cargoes: Cargo[] = []): CargoLocation => ({
  id: 'loc-main',
  name: 'Convés Principal',
  config: {} as CargoLocation['config'],
  bays: [
    {
      id: 'bay-1',
      number: 1,
      name: 'Baia 1',
      maxWeightTonnes: 100,
      maxAreaSqMeters: 50,
      allocatedCargoes: cargoes,
      currentWeightTonnes: 0,
      currentOccupiedArea: 0,
    },
  ],
});

describe('calculateBayStats', () => {
  it('retorna zeros para bay vazia', () => {
    const stats = calculateBayStats([]);
    expect(stats.currentWeightTonnes).toBe(0);
    expect(stats.currentOccupiedArea).toBe(0);
  });

  it('soma peso e área respeitando quantity', () => {
    const cargoes = [
      makeCargo({ id: 'a', weightTonnes: 10, lengthMeters: 2, widthMeters: 3, quantity: 2 }),
      makeCargo({ id: 'b', weightTonnes: 5, lengthMeters: 1, widthMeters: 1, quantity: 1 }),
    ];
    const stats = calculateBayStats(cargoes);
    expect(stats.currentWeightTonnes).toBe(25); // 10*2 + 5*1
    expect(stats.currentOccupiedArea).toBe(13); // 2*3*2 + 1*1*1
  });
});

describe('findDuplicateOnboard', () => {
  const dup = makeCargo({
    id: 'existing',
    identifier: 'MLTU 280189-9',
    positionInBay: 'starboard',
  });

  it('retorna null quando identifier vazio', () => {
    expect(findDuplicateOnboard('', 'any', [makeLocation([dup])])).toBeNull();
  });

  it('retorna null quando ID coincide (carga sendo editada)', () => {
    const result = findDuplicateOnboard('MLTU 280189-9', 'existing', [makeLocation([dup])]);
    expect(result).toBeNull();
  });

  it('detecta duplicata com side mapping correto', () => {
    const result = findDuplicateOnboard('MLTU 280189-9', 'novo', [makeLocation([dup])]);
    expect(result).not.toBeNull();
    expect(result?.locationName).toBe('Convés Principal');
    expect(result?.sideName).toBe('Boreste');
  });

  it('faz fallback para Centro quando positionInBay ausente', () => {
    const noPosition = makeCargo({ id: 'existing', identifier: 'BOX-1' });
    const result = findDuplicateOnboard('BOX-1', 'novo', [makeLocation([noPosition])]);
    expect(result?.sideName).toBe('Centro');
  });
});
