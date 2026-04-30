import { z } from 'zod';

export const CargoCategorySchema = z.enum([
  'GENERAL',
  'CONTAINER',
  'HAZARDOUS',
  'HEAVY',
  'FRAGILE',
  'OTHER',
  'TUBULAR',
  'BASKET',
  'EQUIPMENT',
]);

export const CargoStatusSchema = z.enum(['UNALLOCATED', 'ALLOCATED', 'CONFLICT']);

export const CargoPrioritySchema = z.enum(['normal', 'high', 'urgent']);

export const CargoPositionSchema = z.enum(['port', 'center', 'starboard']);

/**
 * Schema completo de Cargo (alinhado com src/domain/Cargo.ts).
 * Usado para validação em fronteiras: hidratação de DB, importação Excel/CSV,
 * payloads de manifesto após o LLM.
 */
export const CargoSchema = z.object({
  id: z.string().min(1),
  priority: CargoPrioritySchema.optional(),
  description: z.string().min(1, 'Descrição obrigatória'),
  identifier: z.string().min(1, 'Identificador obrigatório'),
  weightTonnes: z.number().nonnegative('Peso deve ser ≥ 0'),
  widthMeters: z.number().nonnegative('Largura deve ser ≥ 0'),
  lengthMeters: z.number().nonnegative('Comprimento deve ser ≥ 0'),
  heightMeters: z.number().nonnegative().optional(),
  quantity: z.number().int().positive('Quantidade deve ser ≥ 1'),
  category: CargoCategorySchema,
  status: CargoStatusSchema,

  bayId: z.string().optional(),
  positionInBay: CargoPositionSchema.optional(),

  x: z.number().optional(),
  y: z.number().optional(),
  isRotated: z.boolean().optional(),
  isBackload: z.boolean().optional(),
  isHazardous: z.boolean().optional(),

  observations: z.string().optional(),
  alerts: z.array(z.string()).optional(),
  isRemovable: z.boolean().optional(),
  color: z.string().optional(),
  format: z.enum(['Retangular', 'Quadrado', 'Tubular']).optional(),

  nomeEmbarcacao: z.string().optional(),
  numeroAtendimento: z.string().optional(),
  origemCarga: z.string().optional(),
  destinoCarga: z.string().optional(),
  roteiroPrevisto: z.array(z.string()).optional(),
});

/**
 * Schema reduzido para criação manual / importação Excel.
 * Campos id/status são preenchidos pelo store; o resto vem do usuário.
 */
export const CargoImportSchema = z.object({
  description: z.string().min(1, 'Descrição obrigatória'),
  identifier: z.string().min(1, 'Identificador obrigatório'),
  weightTonnes: z.coerce.number().nonnegative('Peso deve ser ≥ 0'),
  widthMeters: z.coerce.number().positive('Largura deve ser > 0'),
  lengthMeters: z.coerce.number().positive('Comprimento deve ser > 0'),
  heightMeters: z.coerce.number().nonnegative().optional(),
  quantity: z.coerce.number().int().positive().default(1),
  category: CargoCategorySchema.default('GENERAL'),
  isHazardous: z.boolean().optional(),
  priority: CargoPrioritySchema.optional(),
  observations: z.string().optional(),
  destinoCarga: z.string().optional(),
  origemCarga: z.string().optional(),
});

export type CargoValidated = z.infer<typeof CargoSchema>;
export type CargoImportInput = z.infer<typeof CargoImportSchema>;
