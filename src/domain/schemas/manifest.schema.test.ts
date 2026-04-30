import { describe, it, expect } from 'vitest';
import { ManifestoJSONSchema } from './manifest.schema';

const baseManifesto = {
  naveData: { nome: 'Navio Alpha' },
  rotaData: { origem: 'PBG', destino: 'NS63' },
};

const sampleCarga = {
  numero: '1',
  descricao: 'Container 20',
  codigoID: 'MLTU 280189-9',
  dimensoes: { c: 6.1, l: 2.4, a: 2.6 },
  peso_ton: 12.5,
  destinoFinal: 'NS63',
};

describe('ManifestoJSONSchema', () => {
  it('aceita manifesto com cargasArray legacy', () => {
    const r = ManifestoJSONSchema.safeParse({
      ...baseManifesto,
      cargasArray: [sampleCarga],
    });
    expect(r.success).toBe(true);
  });

  it('aceita manifesto com sections (formato V2)', () => {
    const r = ManifestoJSONSchema.safeParse({
      ...baseManifesto,
      sections: [
        {
          origin: 'PBG',
          destination: 'NS63',
          items: [sampleCarga],
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it('rejeita manifesto sem cargas (sections vazio E cargasArray vazio)', () => {
    const r = ManifestoJSONSchema.safeParse({
      ...baseManifesto,
      sections: [],
      cargasArray: [],
    });
    expect(r.success).toBe(false);
  });

  it('rejeita rotaData sem origem', () => {
    const r = ManifestoJSONSchema.safeParse({
      naveData: { nome: 'Alpha' },
      rotaData: { origem: '', destino: 'NS63' },
      cargasArray: [sampleCarga],
    });
    expect(r.success).toBe(false);
  });

  it('rejeita peso_ton negativo', () => {
    const r = ManifestoJSONSchema.safeParse({
      ...baseManifesto,
      cargasArray: [{ ...sampleCarga, peso_ton: -1 }],
    });
    expect(r.success).toBe(false);
  });

  it('aceita metadadosExtracao opcional', () => {
    const r = ManifestoJSONSchema.safeParse({
      ...baseManifesto,
      cargasArray: [sampleCarga],
      metadadosExtracao: {
        llmUsado: 'minimax-m2.5',
        confiancaScore: 0.85,
        revisoesSugeridas: [],
      },
    });
    expect(r.success).toBe(true);
  });
});
