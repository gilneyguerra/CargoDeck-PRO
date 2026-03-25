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
  bayId?: string; // ID of the bay where it's allocated
  positionInBay?: 'port' | 'center' | 'starboard'; // Transversal Stowage Tracking
  observations?: string;
  alerts?: string[];
}
