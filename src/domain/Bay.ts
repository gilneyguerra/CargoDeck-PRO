import type { Cargo } from './Cargo';

export interface Bay {
  id: string;
  number: number;         // visual sequence
  name: string;
  maxWeightTonnes: number;
  maxAreaSqMeters: number;
  allocatedCargoes: Cargo[];
  // computed
  currentWeightTonnes: number;
  currentOccupiedArea: number;
  alerts?: string[];
}
