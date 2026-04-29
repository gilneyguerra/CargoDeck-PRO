import type { Cargo, CargoCategory } from '@/domain/Cargo';
import { routeTask } from './llmRouter';
import { sha256 } from '@/lib/sha256';

export interface ManifestoNaveData {
  nome: string;
  equipamento?: string;
  data?: string;
  hora?: string;
  base?: string;
  empresa?: string;
}

export interface ManifestoRotaData {
  origem: string;
  destino: string;
  mudancasSequenciais?: Array<{ pagina: number; novaOrigem: string; novoDestino: string }>;
}

export interface ManifestoCarga {
  numero: string;
  descricao: string;
  codigoID: string;
  dimensoes: { c: number; l: number; a: number };
  peso_ton: number;
  peso_kg_original?: number;
  destinoFinal: string;
  hash?: string;
}

// Schema V2 — cargas agrupadas por seção origem/destino (spec seção 9)
export interface ManifestoSection {
  origin: string;
  destination: string;
  items: ManifestoCarga[];
}

export interface ManifestoJSON {
  // Novo schema com sections (spec seção 9)
  sections?: ManifestoSection[];
  // Schema legado — mantido para compatibilidade com o prompt anterior
  cargasArray?: ManifestoCarga[];

  naveData: ManifestoNaveData;
  rotaData: ManifestoRotaData;
  metadadosExtracao: { llmUsado: string; confiancaScore: number; revisoesSugeridas: string[] };
}

export interface ValidationResult {
  status: 'VALIDADO' | 'ALERTAS';
  alertas: string[];
}

export interface StabilityReport {
  isBalanced: boolean;
  portWeight: number;
  centerWeight: number;
  starboardWeight: number;
  totalWeight: number;
  imbalancePercent: number;
  alertMessage: string | null;
}

// ─── Normalização: achatamento sections → cargasArray ─────────────────────────

export function flattenManifestoJSON(json: ManifestoJSON): ManifestoCarga[] {
  if (json.sections && json.sections.length > 0) {
    return json.sections.flatMap(section =>
      section.items.map(item => ({
        ...item,
        destinoFinal: item.destinoFinal || section.destination,
      }))
    );
  }
  return json.cargasArray ?? [];
}

// ─── Parsing seguro ────────────────────────────────────────────────────────────

function stripJsonFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

function parseJsonSafe<T>(text: string): T | null {
  try {
    return JSON.parse(stripJsonFences(text)) as T;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]) as T; } catch { /* noop */ }
    }
    return null;
  }
}

// ─── Operações principais ─────────────────────────────────────────────────────

export async function extractManifestoJSON(rawText: string): Promise<ManifestoJSON> {
  const response = await routeTask('EXTRACTION', rawText);
  const parsed = parseJsonSafe<ManifestoJSON>(response.content);

  // Aceita tanto o novo formato sections[] quanto o legado cargasArray[]
  const hasSections = parsed?.sections && Array.isArray(parsed.sections) && parsed.sections.length > 0;
  const hasLegacy = parsed?.cargasArray && Array.isArray(parsed.cargasArray);

  if (!parsed || (!hasSections && !hasLegacy)) {
    throw new Error('O modelo não retornou um JSON válido. Tente novamente ou cole o texto novamente.');
  }

  parsed.metadadosExtracao = parsed.metadadosExtracao ?? {
    llmUsado: response.modelUsed,
    confiancaScore: 0.8,
    revisoesSugeridas: [],
  };
  parsed.metadadosExtracao.llmUsado = response.modelUsed;

  return parsed;
}

export async function validateManifestoData(data: ManifestoJSON): Promise<ValidationResult> {
  const response = await routeTask('VALIDATION', JSON.stringify(data, null, 2));
  const parsed = parseJsonSafe<ValidationResult>(response.content);
  if (!parsed) return { status: 'VALIDADO', alertas: [] };
  return parsed;
}

export async function applyCorrectionFromChat(
  json: ManifestoJSON,
  correction: string
): Promise<ManifestoJSON> {
  const prompt = `JSON atual:\n${JSON.stringify(json, null, 2)}\n\nCorreção do usuário:\n${correction}`;
  const response = await routeTask('CORRECTION', prompt);
  const parsed = parseJsonSafe<ManifestoJSON>(response.content);
  if (!parsed) return json;

  const hasSections = parsed.sections && Array.isArray(parsed.sections) && parsed.sections.length > 0;
  const hasLegacy = parsed.cargasArray && Array.isArray(parsed.cargasArray);
  if (!hasSections && !hasLegacy) return json;

  return parsed;
}

// ─── Cálculo de estabilidade (spec seção 11) ──────────────────────────────────

export function calculateStabilityBalance(cargoes: Cargo[]): StabilityReport {
  // Distribuição estimada: cargas no port têm x<0.4*total, starboard x>0.6*total, else center
  // Sem posição definida, aplica distribuição proporcional por índice
  const total = cargoes.length;
  if (total === 0) {
    return { isBalanced: true, portWeight: 0, centerWeight: 0, starboardWeight: 0, totalWeight: 0, imbalancePercent: 0, alertMessage: null };
  }

  let portWeight = 0;
  let centerWeight = 0;
  let starboardWeight = 0;

  for (const cargo of cargoes) {
    const w = cargo.weightTonnes || 0;
    if (cargo.positionInBay === 'port') portWeight += w;
    else if (cargo.positionInBay === 'starboard') starboardWeight += w;
    else centerWeight += w;
  }

  const totalWeight = portWeight + centerWeight + starboardWeight;

  if (totalWeight === 0) {
    return { isBalanced: true, portWeight, centerWeight, starboardWeight, totalWeight, imbalancePercent: 0, alertMessage: null };
  }

  // Calcula desequilíbrio entre bombordo e boreste excluindo carga central
  const sideTotal = portWeight + starboardWeight;
  let imbalancePercent = 0;
  if (sideTotal > 0) {
    imbalancePercent = Math.abs(portWeight - starboardWeight) / sideTotal * 100;
  }

  const isBalanced = imbalancePercent <= 15;
  const alertMessage = isBalanced
    ? null
    : `⚠️ Desequilíbrio de ${imbalancePercent.toFixed(1)}% entre bombordo (${portWeight.toFixed(2)}t) e boreste (${starboardWeight.toFixed(2)}t). Redistribua as cargas para manter estabilidade.`;

  return { isBalanced, portWeight, centerWeight, starboardWeight, totalWeight, imbalancePercent, alertMessage };
}

// ─── Transformação → domínio Cargo ────────────────────────────────────────────

function detectCategory(descricao: string): CargoCategory {
  const d = descricao.toUpperCase();
  if (d.includes('CONTAINER') || d.includes('CONT ') || d.includes('CNTR')) return 'CONTAINER';
  if (d.includes('TUBULAR') || d.includes('TUBO') || d.includes('DUTO')) return 'TUBULAR';
  if (d.includes('BASKET') || d.includes('CESTO') || d.includes('EMBALAGEM')) return 'BASKET';
  if (d.includes('EQUIP') || d.includes('MOTOR') || d.includes('BOMBA') || d.includes('COMPRESSOR')) return 'EQUIPMENT';
  if (d.includes('QUIMICO') || d.includes('QUÍMICO') || d.includes('HAZMAT') || d.includes('PERIGOSO')) return 'HAZARDOUS';
  if (d.includes('FRAGIL') || d.includes('FRÁGIL') || d.includes('VIDRO')) return 'FRAGILE';
  return 'GENERAL';
}

function isValidISO6346(code: string): boolean {
  const match = code.replace(/[\s-]/g, '').match(/^([A-Z]{4})(\d{6})(\d)$/);
  if (!match) return false;
  const charMap: Record<string, number> = {};
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((c, i) => { charMap[c] = i < 11 ? i + 10 : i + 11; });
  const body = (match[1] + match[2]).split('');
  let sum = 0;
  body.forEach((c, i) => {
    const val = /\d/.test(c) ? parseInt(c) : (charMap[c] ?? 0);
    sum += val * Math.pow(2, i);
  });
  const check = sum % 11 % 10;
  return check === parseInt(match[3]);
}

// Retorna total de cargas (de sections ou cargasArray)
export function countCargas(json: ManifestoJSON): number {
  return flattenManifestoJSON(json).length;
}

export async function transformToCargoObjects(json: ManifestoJSON): Promise<Cargo[]> {
  const seenHashes = new Set<string>();
  const cargoes: Cargo[] = [];
  const items = flattenManifestoJSON(json);

  for (const item of items) {
    // Hash baseado em id + descrição + peso (spec seção 11)
    const hashKey = `${item.codigoID}|${item.descricao}|${item.peso_ton}`;
    const hash = await sha256(hashKey);

    const isDuplicate = seenHashes.has(hash);
    seenHashes.add(hash);

    const alerts: string[] = [];
    if (isDuplicate) alerts.push('Duplicata detectada nesta importação');
    if (item.codigoID && /^[A-Z]{4}\d/.test(item.codigoID.replace(/[\s-]/g, ''))) {
      if (!isValidISO6346(item.codigoID.replace(/[\s-]/g, ''))) {
        alerts.push('Código pode não ser ISO 6346 válido');
      }
    }

    const cargo: Cargo = {
      id: crypto.randomUUID(),
      identifier: item.codigoID || item.numero,
      description: item.descricao,
      weightTonnes: Number(item.peso_ton) || 0,
      lengthMeters: Number(item.dimensoes?.c) || 1,
      widthMeters: Number(item.dimensoes?.l) || 1,
      heightMeters: Number(item.dimensoes?.a) || 1,
      quantity: 1,
      category: detectCategory(item.descricao),
      status: 'UNALLOCATED',
      color: '#3b82f6',
      format: 'Retangular',
      nomeEmbarcacao: json.naveData?.nome,
      origemCarga: json.rotaData?.origem,
      destinoCarga: item.destinoFinal || json.rotaData?.destino,
      observations: item.numero ? `Nº Manifesto: ${item.numero}` : undefined,
      alerts: alerts.length > 0 ? alerts : undefined,
    };

    cargoes.push(cargo);
  }

  return cargoes;
}
