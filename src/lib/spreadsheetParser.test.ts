import { describe, it, expect } from 'vitest';
import { parseDecimalBR, parseCsvToMatrix } from './spreadsheetParser';

describe('parseDecimalBR', () => {
  it('converte vírgula brasileira em ponto decimal', () => {
    expect(parseDecimalBR('1234,56')).toBe(1234.56);
  });

  it('remove separador de milhar pt-BR', () => {
    expect(parseDecimalBR('14.200,89')).toBe(14200.89);
  });

  it('lida com inteiro sem decimal', () => {
    expect(parseDecimalBR('100')).toBe(100);
  });

  it('lida com string vazia → 0', () => {
    expect(parseDecimalBR('')).toBe(0);
  });

  it('lida com NaN → 0', () => {
    expect(parseDecimalBR('abc')).toBe(0);
  });

  it('preserva números com mais de 3 dígitos no inteiro sem ponto de milhar', () => {
    expect(parseDecimalBR('999,99')).toBe(999.99);
  });

  it('lida com vários pontos seguidos de vírgula (formato pt-BR)', () => {
    expect(parseDecimalBR('1.234.567,89')).toBe(1234567.89);
  });
});

describe('parseCsvToMatrix', () => {
  it('detecta separador ;', () => {
    const m = parseCsvToMatrix('A;B;C\n1;2;3');
    expect(m).toEqual([['A', 'B', 'C'], ['1', '2', '3']]);
  });

  it('detecta separador , quando ; ausente', () => {
    const m = parseCsvToMatrix('A,B,C\n1,2,3');
    expect(m).toEqual([['A', 'B', 'C'], ['1', '2', '3']]);
  });

  it('remove aspas externas das células', () => {
    const m = parseCsvToMatrix('"A";"B"\n"1";"2"');
    expect(m).toEqual([['A', 'B'], ['1', '2']]);
  });

  it('ignora linhas vazias', () => {
    const m = parseCsvToMatrix('A;B\n\n1;2\n\n');
    expect(m).toEqual([['A', 'B'], ['1', '2']]);
  });

  it('preserva células com decimais brasileiros', () => {
    const m = parseCsvToMatrix('VL;QTDE\n1.234,56;10');
    expect(m[1][0]).toBe('1.234,56');
  });
});
