import { describe, it, expect } from 'vitest';
import { CargoSchema, CargoImportSchema } from './cargo.schema';

describe('CargoSchema', () => {
  const validBase = {
    id: 'c-1',
    description: 'Container 20',
    identifier: 'MLTU 280189-9',
    weightTonnes: 12.5,
    widthMeters: 2.4,
    lengthMeters: 6.1,
    quantity: 1,
    category: 'CONTAINER' as const,
    status: 'UNALLOCATED' as const,
  };

  it('aceita carga completa válida', () => {
    expect(CargoSchema.safeParse(validBase).success).toBe(true);
  });

  it('rejeita weightTonnes negativo', () => {
    const r = CargoSchema.safeParse({ ...validBase, weightTonnes: -1 });
    expect(r.success).toBe(false);
  });

  it('rejeita category inválida', () => {
    const r = CargoSchema.safeParse({ ...validBase, category: 'BANANA' });
    expect(r.success).toBe(false);
  });

  it('rejeita description vazia', () => {
    const r = CargoSchema.safeParse({ ...validBase, description: '' });
    expect(r.success).toBe(false);
  });

  it('aceita campos opcionais ausentes', () => {
    const r = CargoSchema.safeParse(validBase);
    expect(r.success).toBe(true);
  });
});

describe('CargoImportSchema (Excel/CSV)', () => {
  it('coerce strings em números', () => {
    const r = CargoImportSchema.safeParse({
      description: 'Skid Hidráulico',
      identifier: 'SK-001',
      weightTonnes: '8.4',
      widthMeters: '2.5',
      lengthMeters: '4.0',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.weightTonnes).toBe(8.4);
      expect(r.data.quantity).toBe(1); // default
      expect(r.data.category).toBe('GENERAL'); // default
    }
  });

  it('rejeita largura zero (deve ser > 0)', () => {
    const r = CargoImportSchema.safeParse({
      description: 'Skid',
      identifier: 'X',
      weightTonnes: 5,
      widthMeters: 0,
      lengthMeters: 1,
    });
    expect(r.success).toBe(false);
  });

  it('rejeita quantity fracionário', () => {
    const r = CargoImportSchema.safeParse({
      description: 'X',
      identifier: 'X',
      weightTonnes: 1,
      widthMeters: 1,
      lengthMeters: 1,
      quantity: 1.5,
    });
    expect(r.success).toBe(false);
  });
});
