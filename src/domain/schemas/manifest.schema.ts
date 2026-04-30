import { z } from 'zod';

export const ManifestoNaveSchema = z.object({
  nome: z.string().min(1),
  equipamento: z.string().optional(),
  data: z.string().optional(),
  hora: z.string().optional(),
  base: z.string().optional(),
  empresa: z.string().optional(),
});

export const ManifestoRotaSchema = z.object({
  origem: z.string().min(1),
  destino: z.string().min(1),
  mudancasSequenciais: z
    .array(
      z.object({
        pagina: z.number(),
        novaOrigem: z.string(),
        novoDestino: z.string(),
      })
    )
    .optional(),
});

export const ManifestoCargaSchema = z.object({
  numero: z.string(),
  descricao: z.string().min(1),
  codigoID: z.string(),
  dimensoes: z.object({
    c: z.number().nonnegative(),
    l: z.number().nonnegative(),
    a: z.number().nonnegative(),
  }),
  peso_ton: z.number().nonnegative(),
  peso_kg_original: z.number().optional(),
  destinoFinal: z.string(),
  hash: z.string().optional(),
});

export const ManifestoSectionSchema = z.object({
  origin: z.string(),
  destination: z.string(),
  items: z.array(ManifestoCargaSchema),
});

export const ManifestoMetadadosSchema = z.object({
  llmUsado: z.string(),
  confiancaScore: z.number(),
  revisoesSugeridas: z.array(z.string()),
});

export const ManifestoJSONSchema = z
  .object({
    sections: z.array(ManifestoSectionSchema).optional(),
    cargasArray: z.array(ManifestoCargaSchema).optional(),
    naveData: ManifestoNaveSchema,
    rotaData: ManifestoRotaSchema,
    metadadosExtracao: ManifestoMetadadosSchema.optional(),
  })
  .refine(
    (data) =>
      (data.sections && data.sections.length > 0) ||
      (data.cargasArray && data.cargasArray.length > 0),
    {
      message: 'Manifesto deve conter ao menos uma carga em sections[] ou cargasArray[].',
    }
  );

export type ManifestoJSONValidated = z.infer<typeof ManifestoJSONSchema>;
