export type CargoCategory =
  | 'GENERAL'
  | 'CONTAINER'
  | 'HAZARDOUS'
  | 'HEAVY'
  | 'FRAGILE'
  | 'OTHER'
  | 'TUBULAR'
  | 'BASKET'
  | 'EQUIPMENT';

export type CargoStatus = 'UNALLOCATED' | 'ALLOCATED' | 'CONFLICT';

export type CargoPriority = 'normal' | 'high' | 'urgent';

export interface Cargo {
  id: string;
  priority?: CargoPriority;
  description: string;
  identifier: string; // código único da carga (ex: "MLTU 280189-9", "802567-3")
  weightTonnes: number;
  widthMeters: number;
  lengthMeters: number;
  heightMeters?: number; // VCG Calculation
  quantity: number;
  category: CargoCategory;
  status: CargoStatus;

  // Storage Location
  bayId?: string; // ID of the bay where it's allocated (legacy/logical)
  positionInBay?: 'port' | 'center' | 'starboard'; // Transversal Stowage Tracking (legacy/logical)

  // Spatial Placement (Vapozeiro Engine)
  x?: number; // absolute X coordinate in meters relative to the active location (deck)
  y?: number; // absolute Y coordinate in meters relative to the active location (deck)
  isRotated?: boolean; // True if visually rotated 90 degrees (width and length swapped)

  // Operational Properties
  isBackload?: boolean; // If true, cargo is being removed from ship (backload operation)
  isHazardous?: boolean; // If true, cargo is dangerous (mapped from "Carga Perigosa? = SIM" in Excel)

  observations?: string;
  alerts?: string[];
  isRemovable?: boolean; // If true, can be removed during operation (e.g., risers lowered into water)
  color?: string; // Hex color for visual representation
  format?: 'Retangular' | 'Quadrado' | 'Tubular'; // Shape format for graphical representation

  // New detailed manifest data structure (Section 5)
  dimensoes?: {
    comprimento: number;
    largura: number;
    altura: number;
    unidade: 'm';
  };
  peso?: {
    valorOriginal: number; // em KG
    valorEmToneladas: number; 
    unidade: 't';
  };
  tamanhoFisico?: {
    larguraPixels: number;
    alturaPixels: number;
    profundidadePixels: number;
    escala: number;
  };
  dataExtracao?: string; // ISO string
  fonteManifesto?: string;

  // Manifest Data — extracted from PDF header
  nomeEmbarcacao?: string;     // Nome da embarcação (ex: "Navio Alpha")
  numeroAtendimento?: string;  // Número de atendimento (ex: "509442732")
  origemCarga?: string;        // Local de origem (ex: "PBD - Porto da Baía de Guanabara")
  destinoCarga?: string;       // Local de destino (ex: "NS63 - Tidal Action")
  roteiroPrevisto?: string[];  // Roteiro de portos (ex: ["PBG", "PACU", "NS63"])
}

