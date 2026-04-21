import type { Cargo } from '@/domain/Cargo';
import type { CargoLocation } from '@/domain/Location';

/**
 * Verifica se uma carga já existe em qualquer baia de qualquer localização.
 */
export function findDuplicateOnboard(
  cargoIdentifier: string,
  cargoId: string,
  locations: CargoLocation[]
): { locationName: string; sideName: string } | null {
  if (!cargoIdentifier) return null;

  for (const loc of locations) {
    for (const bay of loc.bays) {
      const duplicate = bay.allocatedCargoes.find(
        (c) => c.identifier === cargoIdentifier && c.id !== cargoId
      );
      if (duplicate) {
        const sideMapping: Record<string, string> = {
          port: 'Bombordo',
          center: 'Centro',
          starboard: 'Boreste',
        };
        return {
          locationName: loc.name,
          sideName: sideMapping[duplicate.positionInBay || 'center'] || 'Centro',
        };
      }
    }
  }
  return null;
}

/**
 * Calcula totais de uma baia.
 */
export function calculateBayStats(cargoes: Cargo[]) {
  return {
    currentWeightTonnes: cargoes.reduce((acc, c) => acc + (c.weightTonnes * c.quantity), 0),
    currentOccupiedArea: cargoes.reduce((acc, c) => acc + (c.lengthMeters * c.widthMeters * c.quantity), 0),
  };
}
