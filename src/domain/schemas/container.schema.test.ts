import { describe, it, expect } from 'vitest';
import {
  ContainerSchema,
  ContainerCreateSchema,
  ContainerItemSchema,
  ContainerItemImportSchema,
} from './container.schema';
import { computeVlTotal } from '../Container';

describe('ContainerSchema', () => {
  const validBase = {
    id: '00000000-0000-0000-0000-000000000001',
    userId: '00000000-0000-0000-0000-000000000002',
    name: 'Container Petrobras 03',
    type: 'container' as const,
    status: 'Ativo' as const,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
  };

  it('aceita container válido', () => {
    expect(ContainerSchema.safeParse(validBase).success).toBe(true);
  });

  it('rejeita nome vazio', () => {
    const r = ContainerSchema.safeParse({ ...validBase, name: '' });
    expect(r.success).toBe(false);
  });

  it('rejeita type fora do enum', () => {
    const r = ContainerSchema.safeParse({ ...validBase, type: 'palete' });
    expect(r.success).toBe(false);
  });

  it('rejeita status fora do enum', () => {
    const r = ContainerSchema.safeParse({ ...validBase, status: 'Pendente' });
    expect(r.success).toBe(false);
  });
});

describe('ContainerCreateSchema', () => {
  it('aplica default Ativo quando status ausente', () => {
    const r = ContainerCreateSchema.safeParse({ name: 'Teste', type: 'cesta' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.status).toBe('Ativo');
  });
});

describe('ContainerItemSchema', () => {
  const validItem = {
    id: '00000000-0000-0000-0000-000000000010',
    containerId: '00000000-0000-0000-0000-000000000001',
    userId: '00000000-0000-0000-0000-000000000002',
    codProd: '30178432',
    descricao: 'CONTAINER',
    ncmSh: '86090000',
    cst: '090',
    cfop: '5949',
    unid: 'UN',
    qtde: 1,
    vlUnitario: 14200.89,
    vlTotal: 14200.89,
    vlDesconto: 0,
    bcIcms: 0, vlIcms: 0, vlIpi: 0,
    aliqIcms: 0, aliqIpi: 0,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
  };

  it('aceita item DANFE válido (formato Constellation 235598)', () => {
    expect(ContainerItemSchema.safeParse(validItem).success).toBe(true);
  });

  it('rejeita NCM com 7 dígitos', () => {
    const r = ContainerItemSchema.safeParse({ ...validItem, ncmSh: '8609000' });
    expect(r.success).toBe(false);
  });

  it('rejeita CFOP com letras', () => {
    const r = ContainerItemSchema.safeParse({ ...validItem, cfop: '59A9' });
    expect(r.success).toBe(false);
  });

  it('aceita NCM/CST/CFOP vazios (string vazia)', () => {
    const r = ContainerItemSchema.safeParse({ ...validItem, ncmSh: '', cst: '', cfop: '' });
    expect(r.success).toBe(true);
  });

  it('rejeita aliqIcms > 100', () => {
    const r = ContainerItemSchema.safeParse({ ...validItem, aliqIcms: 150 });
    expect(r.success).toBe(false);
  });

  it('rejeita qtde negativa', () => {
    const r = ContainerItemSchema.safeParse({ ...validItem, qtde: -1 });
    expect(r.success).toBe(false);
  });
});

describe('ContainerItemImportSchema (Excel/CSV/LLM)', () => {
  it('coerce string numérica para número', () => {
    const r = ContainerItemImportSchema.safeParse({
      codProd: '30197278',
      descricao: 'BOMBONA;QUAD;BR;PLAS;CAP 20L',
      qtde: '10',
      vlUnitario: '66.77',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.qtde).toBe(10);
      expect(r.data.vlUnitario).toBe(66.77);
      expect(r.data.aliqIcms).toBe(0); // default
      expect(r.data.unid).toBe('');
    }
  });

  it('rejeita qtde negativa também no schema de import', () => {
    const r = ContainerItemImportSchema.safeParse({
      codProd: 'X',
      descricao: 'Y',
      qtde: -1,
      vlUnitario: 0,
    });
    expect(r.success).toBe(false);
  });
});

describe('computeVlTotal', () => {
  it('multiplica qtde × vlUnitario e subtrai desconto', () => {
    expect(computeVlTotal(2, 638.06, 0)).toBe(1276.12); // exemplo PURGADOR
  });

  it('arredonda a 2 casas decimais', () => {
    expect(computeVlTotal(3, 1.111, 0)).toBe(3.33);
  });

  it('aplica desconto', () => {
    expect(computeVlTotal(10, 100, 50)).toBe(950);
  });

  it('lida com zero', () => {
    expect(computeVlTotal(0, 100, 0)).toBe(0);
  });
});
