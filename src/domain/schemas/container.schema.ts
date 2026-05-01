import { z } from 'zod';

export const ContainerTypeSchema = z.enum(['container', 'cesta', 'skid', 'caixa', 'outro']);
export const ContainerStatusSchema = z.enum(['Ativo', 'Inativo']);

export const ContainerSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1, 'Nome obrigatório').max(120, 'Nome muito longo'),
  type: ContainerTypeSchema,
  status: ContainerStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ContainerCreateSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(120, 'Nome muito longo'),
  type: ContainerTypeSchema,
  status: ContainerStatusSchema.default('Ativo'),
});

/**
 * Validação completa de um item DANFE persistido.
 * - NCM/SH: 8 dígitos numéricos.
 * - CST: 3 dígitos.
 * - CFOP: 4 dígitos.
 * - UNID: até 6 caracteres (UN, PC, KG, MTRS...).
 * - Quantidades e valores: ≥ 0.
 * - Alíquotas: 0–100.
 */
export const ContainerItemSchema = z.object({
  id: z.string().uuid(),
  containerId: z.string().uuid(),
  userId: z.string().uuid(),
  codProd: z.string().min(1, 'COD.PROD obrigatório').max(20, 'COD.PROD muito longo'),
  descricao: z.string().min(1, 'Descrição obrigatória').max(500, 'Descrição muito longa'),
  ncmSh: z.string().regex(/^\d{8}$/, 'NCM/SH deve ter 8 dígitos').or(z.literal('')),
  cst: z.string().regex(/^\d{3}$/, 'CST deve ter 3 dígitos').or(z.literal('')),
  cfop: z.string().regex(/^\d{4}$/, 'CFOP deve ter 4 dígitos').or(z.literal('')),
  unid: z.string().max(6, 'UNID até 6 caracteres'),
  qtde: z.number().nonnegative('QTDE não pode ser negativa'),
  vlUnitario: z.number().nonnegative('VL. UNIT. não pode ser negativo'),
  vlTotal: z.number().nonnegative(),
  vlDesconto: z.number().nonnegative('Desconto não pode ser negativo'),
  bcIcms: z.number().nonnegative(),
  vlIcms: z.number().nonnegative(),
  vlIpi: z.number().nonnegative(),
  aliqIcms: z.number().min(0).max(100, 'ALÍQ. ICMS entre 0 e 100'),
  aliqIpi: z.number().min(0).max(100, 'ALÍQ. IPI entre 0 e 100'),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Schema reduzido para entrada manual / import Excel/CSV / extração LLM.
 * Usa z.coerce.number() para tolerar strings ('12,5' precisa ser pré-normalizado
 * antes — no parser brasileiro). IDs são gerados ao persistir.
 */
export const ContainerItemImportSchema = z.object({
  codProd: z.string().min(1).max(20),
  descricao: z.string().min(1).max(500),
  ncmSh: z.string().default(''),
  cst: z.string().default(''),
  cfop: z.string().default(''),
  unid: z.string().max(6).default(''),
  qtde: z.coerce.number().nonnegative().default(0),
  vlUnitario: z.coerce.number().nonnegative().default(0),
  vlTotal: z.coerce.number().nonnegative().default(0),
  vlDesconto: z.coerce.number().nonnegative().default(0),
  bcIcms: z.coerce.number().nonnegative().default(0),
  vlIcms: z.coerce.number().nonnegative().default(0),
  vlIpi: z.coerce.number().nonnegative().default(0),
  aliqIcms: z.coerce.number().min(0).max(100).default(0),
  aliqIpi: z.coerce.number().min(0).max(100).default(0),
});

export type ContainerCreateInput = z.infer<typeof ContainerCreateSchema>;
export type ContainerItemImport = z.infer<typeof ContainerItemImportSchema>;
