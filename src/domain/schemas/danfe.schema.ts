import { z } from 'zod';
import { ContainerItemImportSchema } from './container.schema';

/**
 * Schema esperado do output do LLM ao extrair um DANFE.
 * O LLM deve retornar `{ items: [...] }` com 15 colunas DANFE conforme
 * ContainerItemImportSchema. Header (emitente, destinatário, número da NF-e
 * etc.) é opcional — útil para apresentar contexto ao usuário ao revisar.
 */
export const DanfeHeaderSchema = z.object({
  numero: z.string().optional(),
  serie: z.string().optional(),
  dataEmissao: z.string().optional(),
  emitente: z.string().optional(),
  destinatario: z.string().optional(),
  chaveAcesso: z.string().optional(),
  natOperacao: z.string().optional(),
});

export const DanfeJSONSchema = z.object({
  header: DanfeHeaderSchema.optional(),
  items: z.array(ContainerItemImportSchema).min(1, 'O DANFE deve conter ao menos 1 item'),
});

export type DanfeJSON = z.infer<typeof DanfeJSONSchema>;
export type DanfeHeader = z.infer<typeof DanfeHeaderSchema>;
