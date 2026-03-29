export type CargoCategory = 'GENERAL' | 'CONTAINER' | 'HAZARDOUS' | 'HEAVY' | 'FRAGILE' | 'OTHER';

export type CargoStatus = 'UNALLOCATED' | 'ALLOCATED' | 'CONFLICT';

export interface Cargo {
  id: string;
  description: string;
  identifier: string; // e.g., container number, item code
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

  observations?: string;
  alerts?: string[];
  isRemovable?: boolean; // If true, can be removed during operation (e.g., risers lowered into water)
  color?: string; // Hex color for visual representation
  format?: 'Retangular' | 'Quadrado' | 'Tubular'; // Shape format for graphical representation
}
