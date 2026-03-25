import { create } from 'zustand';
import type { Cargo } from '@/domain/Cargo';
import type { CargoLocation } from '@/domain/Location';
import { DEFAULT_DECK_CONFIG } from '@/domain/DeckConfig';
import type { DeckConfig } from '@/domain/DeckConfig';

export type { CargoState };

interface CargoState {
  manifestsLoaded: boolean;
  unallocatedCargoes: Cargo[];
  locations: CargoLocation[];
  activeLocationId: string | null;
  shipOperationCode: string;
  manifestShipName: string | null;
  manifestVoyage: string | null;
  
  // Actions
  setShipOperationCode: (code: string) => void;
  setExtractedCargoes: (cargoes: Cargo[]) => void;
  setManifestDetails: (shipName: string, voyage: string) => void;
  addLocation: (name: string) => void;
  setActiveLocation: (id: string) => void;
  updateActiveLocationConfig: (config: Partial<DeckConfig>) => void;
  moveCargoToBay: (cargoId: string, bayId: string) => void;
  removeCargoFromBay: (cargoId: string) => void;
   hydrateFromDb: (payload: Partial<CargoState>) => void;
}

const createInitialBays = () => Array.from({ length: 10 }, (_, i) => ({
  id: `bay-${crypto.randomUUID()}`,
  number: i + 1,
  name: `Baia ${i + 1}`,
  maxWeightTonnes: 100,
  maxAreaSqMeters: 50,
  allocatedCargoes: [],
  currentWeightTonnes: 0,
  currentOccupiedArea: 0
}));

const initialLocationId = crypto.randomUUID();

export const useCargoStore = create<CargoState>((set) => ({
  manifestsLoaded: false,
  unallocatedCargoes: [],
  shipOperationCode: 'NS44', // Default from example
  manifestShipName: null,
  manifestVoyage: null,
  locations: [
    {
      id: initialLocationId,
      name: 'Convés Principal',
      config: DEFAULT_DECK_CONFIG,
      bays: createInitialBays()
    }
  ],
  activeLocationId: initialLocationId,

  setShipOperationCode: (code) => set({ shipOperationCode: code.toUpperCase() }),

  setManifestDetails: (shipName, voyage) => set({ manifestShipName: shipName, manifestVoyage: voyage }),

  setExtractedCargoes: (cargoes) => set((state) => ({ 
    unallocatedCargoes: [...state.unallocatedCargoes, ...cargoes], 
    manifestsLoaded: true 
  })),

  addLocation: (name) => set((state) => {
    const newLoc: CargoLocation = {
      id: crypto.randomUUID(),
      name,
      config: DEFAULT_DECK_CONFIG,
      bays: createInitialBays()
    };
    return { locations: [...state.locations, newLoc], activeLocationId: newLoc.id };
  }),

  setActiveLocation: (id) => set({ activeLocationId: id }),

  updateActiveLocationConfig: (config) => set((state) => ({
    locations: state.locations.map(loc => {
      if (loc.id === state.activeLocationId) {
         const newConfig = { ...loc.config, ...config };
         
         let newBays = [...loc.bays];
         if (newConfig.numberOfBays !== loc.bays.length) {
            newBays = Array.from({ length: newConfig.numberOfBays }, (_, i) => ({
              id: `bay-${crypto.randomUUID()}`,
              number: i + 1,
              name: `Baia ${i + 1}`,
              maxWeightTonnes: 150, 
              maxAreaSqMeters: 0,
              allocatedCargoes: [],
              currentWeightTonnes: 0,
              currentOccupiedArea: 0
            }));
         }
         return { ...loc, config: newConfig, bays: newBays };
      }
      return loc;
    })
  })),

  removeCargoFromBay: (cargoId) => set((state) => {
    let foundCargo: Cargo | undefined;
    const newLocations = state.locations.map(loc => {
      const newBays = loc.bays.map(b => {
        const hasCargo = b.allocatedCargoes.find(c => c.id === cargoId);
        if (hasCargo) foundCargo = hasCargo;
        const newCargoes = b.allocatedCargoes.filter(c => c.id !== cargoId);
        return {
          ...b,
          allocatedCargoes: newCargoes,
          currentWeightTonnes: newCargoes.reduce((acc, c) => acc + c.weightTonnes, 0),
          currentOccupiedArea: newCargoes.reduce((acc, c) => acc + (c.lengthMeters * c.widthMeters), 0)
        };
      });
      return { ...loc, bays: newBays };
    });

    if (foundCargo) {
      return {
        locations: newLocations,
        unallocatedCargoes: [...state.unallocatedCargoes, { ...foundCargo, status: 'UNALLOCATED', bayId: undefined }]
      };
    }
    return state;
  }),

  moveCargoToBay: (cargoId, bayId) => set((state) => {
    let targetCargo: Cargo | undefined = state.unallocatedCargoes.find(c => c.id === cargoId);
    let newUnallocated = state.unallocatedCargoes;

    let targetBayId = bayId;
    let positionInBay: 'port' | 'center' | 'starboard' = 'center';
    
    if (bayId.endsWith('-port')) { targetBayId = bayId.replace('-port', ''); positionInBay = 'port'; }
    else if (bayId.endsWith('-center')) { targetBayId = bayId.replace('-center', ''); positionInBay = 'center'; }
    else if (bayId.endsWith('-starboard')) { targetBayId = bayId.replace('-starboard', ''); positionInBay = 'starboard'; }

    if (!targetCargo) {
      for (const loc of state.locations) {
        for (const b of loc.bays) {
          const found = b.allocatedCargoes.find(c => c.id === cargoId);
          if (found) {
            targetCargo = found;
            break;
          }
        }
      }
    }

    if (!targetCargo) return state;

    newUnallocated = newUnallocated.filter(c => c.id !== cargoId);

    const newLocations = state.locations.map(loc => {
      const newBays = loc.bays.map(b => {
        const isSource = b.allocatedCargoes.some(c => c.id === cargoId);
        const isTarget = b.id === targetBayId;
        
        let newCargoes = [...b.allocatedCargoes];
        
        if (isSource && !isTarget) {
          newCargoes = newCargoes.filter(c => c.id !== cargoId);
        }
        if (isTarget && !isSource) {
          newCargoes.push({ ...targetCargo!, status: 'ALLOCATED', bayId: targetBayId, positionInBay });
        }
        if (isTarget && isSource) {
           const idx = newCargoes.findIndex(c => c.id === cargoId);
           if (idx !== -1) {
              newCargoes[idx] = { ...newCargoes[idx], positionInBay };
           }
        }

        return { 
          ...b, 
          allocatedCargoes: newCargoes,
          currentWeightTonnes: newCargoes.reduce((acc, c) => acc + c.weightTonnes, 0),
          currentOccupiedArea: newCargoes.reduce((acc, c) => acc + (c.lengthMeters * c.widthMeters), 0)
        };
      });
      return { ...loc, bays: newBays };
    });

    return {
      ...state,
      unallocatedCargoes: newUnallocated,
      locations: newLocations
    };
  }),

   hydrateFromDb: (payload: Partial<CargoState>) => set((state) => ({
     unallocatedCargoes: payload.unallocatedCargoes ?? state.unallocatedCargoes,
     locations: payload.locations ?? state.locations,
     shipOperationCode: payload.shipOperationCode ?? state.shipOperationCode,
     manifestShipName: payload.manifestShipName ?? state.manifestShipName,
     manifestVoyage: payload.manifestVoyage ?? state.manifestVoyage,
     manifestsLoaded: payload.manifestsLoaded ?? state.manifestsLoaded,
     activeLocationId: payload.locations && payload.locations.length > 0 ? payload.locations[0].id : state.activeLocationId
   })),
}));
