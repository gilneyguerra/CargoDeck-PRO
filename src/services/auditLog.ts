import type { ManifestoJSON } from './manifestExtractor';

export interface AuditEntry {
  id: string;
  timestamp: string;
  nomeNavio: string;
  rota: string;
  totalCargas: number;
  llmUsado: string;
  confiancaScore: number;
  alertas: string[];
}

const STORAGE_KEY = 'cargodeck-audit-log';
const MAX_ENTRIES = 100;

export function saveExtractionLog(json: ManifestoJSON, cargoCount: number): void {
  try {
    const entry: AuditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      nomeNavio: json.naveData?.nome || 'N/D',
      rota: `${json.rotaData?.origem || '?'} → ${json.rotaData?.destino || '?'}`,
      totalCargas: cargoCount,
      llmUsado: json.metadadosExtracao?.llmUsado || 'gemini',
      confiancaScore: json.metadadosExtracao?.confiancaScore ?? 0,
      alertas: json.metadadosExtracao?.revisoesSugeridas ?? [],
    };

    const existing = getExtractionLogs();
    const updated = [entry, ...existing].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage may be unavailable — silently ignore
  }
}

export function getExtractionLogs(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AuditEntry[];
  } catch {
    return [];
  }
}

export function clearExtractionLogs(): void {
  localStorage.removeItem(STORAGE_KEY);
}
