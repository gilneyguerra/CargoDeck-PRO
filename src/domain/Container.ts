/**
 * @file Tipos do domínio fiscal — unidades de transporte (containers,
 * cestas, skids, caixas) e seus itens DANFE com 15 colunas regulatórias.
 *
 * NÃO confundir com `Cargo` em src/domain/Cargo.ts, que é o domínio
 * offshore (peso em toneladas, dimensões em metros, alocação em baias).
 */

export type ContainerType = 'container' | 'cesta' | 'skid' | 'caixa' | 'outro';

export type ContainerStatus = 'Ativo' | 'Inativo';

export interface Container {
  id: string;
  userId: string;
  name: string;
  type: ContainerType;
  status: ContainerStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * 15 colunas DANFE conforme regulamentação NF-e brasileira.
 * Números são armazenados em precisão suficiente para reproduzir
 * valores fiscais exatos (sem perda em ponto flutuante para os usos
 * práticos: até R$ 999.999.999.999,99).
 */
export interface ContainerItem {
  id: string;
  containerId: string;
  userId: string;

  /** 1. COD.PROD. — identificador único do produto. */
  codProd: string;
  /** 2. DESCRIÇÃO DO PRODUTO/SERVIÇO. */
  descricao: string;
  /** 3. NCM/SH — Nomenclatura Comum do Mercosul (8 dígitos). */
  ncmSh: string;
  /** 4. CST — Código de Situação Tributária (3 dígitos). */
  cst: string;
  /** 5. CFOP — Código Fiscal de Operações e Prestações (4 dígitos). */
  cfop: string;
  /** 6. UNID — unidade de medida (UN, PC, KG, ...). */
  unid: string;
  /** 7. QTDE — quantidade física (até 4 casas decimais). */
  qtde: number;
  /** 8. VL. UNITÁRIO — valor por unidade. */
  vlUnitario: number;
  /** 9. VL. TOTAL — calculado = qtde * vlUnitario - vlDesconto. */
  vlTotal: number;
  /** 10. VL. DESCONTO. */
  vlDesconto: number;
  /** 11. BC. ICMS — base de cálculo do ICMS. */
  bcIcms: number;
  /** 12. VL. ICMS — valor do ICMS. */
  vlIcms: number;
  /** 13. V. IPI — valor do IPI. */
  vlIpi: number;
  /** 14. ALÍQ. ICMS — percentual ICMS (0–100). */
  aliqIcms: number;
  /** 15. ALÍQ. IPI — percentual IPI (0–100). */
  aliqIpi: number;

  createdAt: string;
  updatedAt: string;
}

export interface ContainerWithItems extends Container {
  items: ContainerItem[];
}

/**
 * Recalcula vl_total a partir dos campos primários. Centralizado
 * para que UI, persistência e exportação sigam a mesma fórmula.
 */
export function computeVlTotal(qtde: number, vlUnitario: number, vlDesconto: number): number {
  const total = qtde * vlUnitario - vlDesconto;
  return Math.round(total * 100) / 100;
}

/** Labels legíveis das 15 colunas — reusado em UI de erro e PDF. */
export const CONTAINER_ITEM_LABELS: Record<keyof Pick<
  ContainerItem,
  | 'codProd' | 'descricao' | 'ncmSh' | 'cst' | 'cfop' | 'unid'
  | 'qtde' | 'vlUnitario' | 'vlTotal' | 'vlDesconto'
  | 'bcIcms' | 'vlIcms' | 'vlIpi' | 'aliqIcms' | 'aliqIpi'
>, string> = {
  codProd: 'COD.PROD.',
  descricao: 'DESCRIÇÃO',
  ncmSh: 'NCM/SH',
  cst: 'CST',
  cfop: 'CFOP',
  unid: 'UNID',
  qtde: 'QTDE',
  vlUnitario: 'VL. UNIT.',
  vlTotal: 'VL. TOTAL',
  vlDesconto: 'VL. DESC.',
  bcIcms: 'BC. ICMS',
  vlIcms: 'VL. ICMS',
  vlIpi: 'V. IPI',
  aliqIcms: 'ALÍQ. ICMS',
  aliqIpi: 'ALÍQ. IPI',
};

export const CONTAINER_TYPE_LABELS: Record<ContainerType, string> = {
  container: 'Container',
  cesta: 'Cesta',
  skid: 'Skid',
  caixa: 'Caixa',
  outro: 'Outro',
};
