import type { Cargo } from './Cargo';
import type { Bay } from './Bay';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class DeckValidator {
  static canAllocate(cargo: Cargo, bay: Bay): ValidationResult {
    const errors: string[] = [];
    
    // Check constraints
    if (bay.currentWeightTonnes + cargo.weightTonnes > bay.maxWeightTonnes) {
      errors.push(`Excesso de peso (Limite: ${bay.maxWeightTonnes}t)`);
    }

    const cargoArea = cargo.lengthMeters * cargo.widthMeters * cargo.quantity;
    if (bay.currentOccupiedArea + cargoArea > bay.maxAreaSqMeters) {
      errors.push(`Espaço insuficiente na baia.`);
    }

    // Business Rules
    if (cargo.category === 'HAZARDOUS' && bay.allocatedCargoes.some(c => c.category === 'GENERAL')) {
      errors.push(`Carga perigosa exige segregação.`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
