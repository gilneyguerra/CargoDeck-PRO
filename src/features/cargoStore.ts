import { create } from 'zustand';
import type { Cargo } from '@/domain/Cargo';
import type { CargoLocation } from '@/domain/Location';
import { DEFAULT_DECK_CONFIG } from '@/domain/DeckConfig';
import type { DeckConfig } from '@/domain/DeckConfig';
import { DatabaseService } from '@/infrastructure/DatabaseService';
import { v4 as uuidv4 } from 'uuid';
import { historyStore } from './historyStore';

export interface CargoState {
    manifestsLoaded: boolean;
    unallocatedCargoes: Cargo[];
    locations: CargoLocation[];
    activeLocationId: string | null;
    shipOperationCode: string;
    manifestShipName: string | null;
    manifestVoyage: string | null;
    searchTerm: string;
    editingCargo: Cargo | null;
    
    setShipOperationCode: (code: string) => void;
    setExtractedCargoes: (cargoes: Cargo[]) => void;
    setManifestDetails: (shipName: string, voyage: string) => void;
    addLocation: (name: string) => void;
    addManualCargo: (cargoData: Omit<Cargo, 'id' | 'status'>) => void;
    updateCargo: (id: string, updates: Partial<Cargo>) => void;
    setActiveLocation: (id: string) => void;
    updateActiveLocationConfig: (config: Partial<DeckConfig>) => void;
    moveCargoToBay: (cargoId: string, bayId: string, positionInBay?: 'port' | 'center' | 'starboard', x?: number, y?: number, isRotated?: boolean) => void;
    updateCargoPosition: (cargoId: string, x: number, y: number, isRotated?: boolean) => void;
    deleteCargo: (cargoId: string) => Promise<void>;
    setSearchTerm: (term: string) => void;
    getAllCargo: () => Cargo[];
    editLocation: (id: string, updates: Partial<CargoLocation>) => void;
    deleteLocation: (id: string) => void;
    clearAllCargoes: () => void;
    clearUnallocatedCargoes: () => Promise<void>;
    hydrateFromDb: (payload: Partial<CargoState>) => void;
    setEditingCargo: (cargo: Cargo | null) => void;
}

const createInitialBays = () => Array.from({ length: 10 }, (_, i) => ({
    id: uuidv4(),
    number: i + 1,
    name: `Baia ${i + 1}`,
    maxWeightTonnes: 100,
    maxAreaSqMeters: 50,
    allocatedCargoes: [],
    currentWeightTonnes: 0,
    currentOccupiedArea: 0
}));

const initialLocationId = uuidv4();

export const useCargoStore = create<CargoState>((set, get) => ({
    manifestsLoaded: false,
    unallocatedCargoes: [],
    shipOperationCode: 'NS44',
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
    searchTerm: '',
    editingCargo: null,
    
    getAllCargo: () => {
        const state = get();
        const allCargo = [...state.unallocatedCargoes];
        state.locations.forEach(loc => {
            loc.bays.forEach(bay => {
                allCargo.push(...bay.allocatedCargoes);
            });
        });
        return allCargo;
    },

    setEditingCargo: (cargo) => set({ editingCargo: cargo }),

    setShipOperationCode: (code) => set({ shipOperationCode: code.toUpperCase() }),
    setSearchTerm: (term) => set({ searchTerm: term }),

    setManifestDetails: (shipName, voyage) => set({ 
        manifestShipName: shipName, 
        manifestVoyage: voyage 
    }),

    setExtractedCargoes: (cargoes) => set((state) => ({ 
        unallocatedCargoes: [...state.unallocatedCargoes, ...cargoes], 
        manifestsLoaded: true 
    })),

    addManualCargo: (cargoData) => set((state) => ({
        unallocatedCargoes: [...state.unallocatedCargoes, {
            ...cargoData,
            id: uuidv4(),
            status: 'UNALLOCATED',
            isRemovable: cargoData.isRemovable ?? false,
            format: cargoData.format ?? 'Retangular',
            color: cargoData.color ?? '#3b82f6'
        }]
    })),

    updateCargo: (id, updates) => set((state) => {
        const newUnallocated = state.unallocatedCargoes.map(c => 
            c.id === id ? { ...c, ...updates } : c
        );
        const newLocations = state.locations.map(loc => ({
            ...loc,
            bays: loc.bays.map(bay => {
                const updatedCargoes = bay.allocatedCargoes.map(c =>
                    c.id === id ? { ...c, ...updates } : c
                );
                return {
                    ...bay,
                    allocatedCargoes: updatedCargoes,
                    currentWeightTonnes: updatedCargoes.reduce((acc, c) =>
                        acc + (c.weightTonnes * c.quantity), 0),
                    currentOccupiedArea: updatedCargoes.reduce((acc, c) =>
                        acc + (c.lengthMeters * c.widthMeters * c.quantity), 0)
                };
            })
        }));
        return {
            unallocatedCargoes: newUnallocated,
            locations: newLocations
        };
    }),

    addLocation: (name) => set((state) => {
        const newLoc: CargoLocation = {
            id: uuidv4(),
            name,
            config: DEFAULT_DECK_CONFIG,
            bays: createInitialBays()
        };
        return { 
            locations: [...state.locations, newLoc], 
            activeLocationId: newLoc.id 
        };
    }),

    setActiveLocation: (id) => set({ activeLocationId: id }),

    updateActiveLocationConfig: (config) => set((state) => ({
        locations: state.locations.map(loc => {
            if (loc.id === state.activeLocationId) {
                const newConfig = { ...loc.config, ...config };
                let newBays = [...loc.bays];
                if (newConfig.numberOfBays !== loc.bays.length) {
                    newBays = Array.from({ length: newConfig.numberOfBays }, (_, i) => ({
                        id: uuidv4(),
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
    
    editLocation: (id, updates) => set((state) => ({
        locations: state.locations.map(loc => 
            loc.id === id ? { ...loc, ...updates } : loc
        ),
        ...(updates.id && { activeLocationId: updates.id })
    })),
    
    deleteLocation: (id) => set((state) => {
        if (state.locations.length <= 1) {
            return state;
        }
        const locations = state.locations.filter(loc => loc.id !== id);
        const activeLocationId = state.activeLocationId === id 
            ? locations[0].id 
            : state.activeLocationId;
        return { locations, activeLocationId };
    }),

    clearAllCargoes: () => set((state) => ({
        unallocatedCargoes: [],
        locations: state.locations.map(loc => ({
            ...loc,
            bays: loc.bays.map(bay => ({
                ...bay,
                allocatedCargoes: [],
                currentWeightTonnes: 0,
                currentOccupiedArea: 0
            }))
        }))
    })),

    clearUnallocatedCargoes: async () => {
        const state = useCargoStore.getState();
        const cargoesToDelete = [...state.unallocatedCargoes];
        
        // Clear local state immediately for better UX
        set({ unallocatedCargoes: [] });
        
        // Delete from database in background without waiting
        for (const cargo of cargoesToDelete) {
            try {
                await DatabaseService.deleteCargo(cargo.id);
            } catch (e) {
                console.error('Failed to delete cargo from DB:', e);
            }
        }
    },

    updateCargoPosition: (cargoId, x, y, isRotated) => set((state) => {
        const updateIn = (cargoes: Cargo[]) =>
            cargoes.map(c => c.id === cargoId ? { ...c, x, y, isRotated: isRotated ?? c.isRotated } : c);
        return {
            unallocatedCargoes: updateIn(state.unallocatedCargoes),
            locations: state.locations.map(loc => ({
                ...loc,
                bays: loc.bays.map(bay => ({
                    ...bay,
                    allocatedCargoes: updateIn(bay.allocatedCargoes)
                }))
            }))
        };
    }),

    moveCargoToBay: (cargoId, bayId, positionInBay, x, y, isRotated) => set((state) => {
        let cargoToMove: Cargo | undefined;
        let sourceBayId: string | undefined;
        let sourceLocationId: string | undefined;

        cargoToMove = state.unallocatedCargoes.find(c => c.id === cargoId);
        if (!cargoToMove) {
            outer: for (const loc of state.locations) {
                for (const bay of loc.bays) {
                    const found = bay.allocatedCargoes.find(c => c.id === cargoId);
                    if (found) {
                        cargoToMove = found;
                        sourceBayId = bay.id;
                        sourceLocationId = loc.id;
                        break outer;
                    }
                }
            }
        }

        if (!cargoToMove) {
            return state;
        }

        let newUnallocated = state.unallocatedCargoes;
        let newLocations = state.locations;

        if (sourceLocationId !== undefined) {
            newLocations = state.locations.map(loc => {
                if (loc.id === sourceLocationId) {
                    return {
                        ...loc,
                        bays: loc.bays.map(bay => {
                            if (bay.id === sourceBayId) {
                                const filtered = bay.allocatedCargoes.filter(c => c.id !== cargoId);
                                return {
                                    ...bay,
                                    allocatedCargoes: filtered,
                                    currentWeightTonnes: filtered.reduce((acc, c) => acc + (c.weightTonnes * c.quantity), 0),
                                    currentOccupiedArea: filtered.reduce((acc, c) => acc + (c.lengthMeters * c.widthMeters * c.quantity), 0)
                                };
                            }
                            return bay;
                        })
                    };
                }
                return loc;
            });
        } else {
            newUnallocated = state.unallocatedCargoes.filter(c => c.id !== cargoId);
        }

        newLocations = newLocations.map(loc => {
            return {
                ...loc,
                bays: loc.bays.map(bay => {
                    if (bay.id === bayId) {
                        return {
                            ...bay,
                            allocatedCargoes: [...bay.allocatedCargoes, {
                                ...cargoToMove,
                                bayId: bay.id,
                                status: 'ALLOCATED',
                                positionInBay: positionInBay ?? 'center',
                                x: x,
                                y: y,
                                isRotated: isRotated ?? false
                            }],
                            currentWeightTonnes: bay.allocatedCargoes.reduce((acc, c) => acc + (c.weightTonnes * c.quantity), 0) + (cargoToMove.weightTonnes * cargoToMove.quantity),
                            currentOccupiedArea: bay.allocatedCargoes.reduce((acc, c) => acc + (c.lengthMeters * c.widthMeters * c.quantity), 0) + (cargoToMove.lengthMeters * cargoToMove.widthMeters * cargoToMove.quantity)
                        };
                    }
                    return bay;
                })
            };
        });

        return {
            ...state,
            unallocatedCargoes: newUnallocated,
            locations: newLocations
        };
    }),

    deleteCargo: async (cargoId) => {
        set((state) => {
            const newUnallocated = state.unallocatedCargoes.filter(c => c.id !== cargoId);
            const newLocations = state.locations.map(loc => {
                const newBays = loc.bays.map(bay => {
                    const filteredCargoes = bay.allocatedCargoes.filter(c => c.id !== cargoId);
                    return {
                        ...bay,
                        allocatedCargoes: filteredCargoes,
                        currentWeightTonnes: filteredCargoes.reduce((acc, c) => acc + (c.weightTonnes * c.quantity), 0),
                        currentOccupiedArea: filteredCargoes.reduce((acc, c) => acc + (c.lengthMeters * c.widthMeters * c.quantity), 0)
                    };
                });
                return { ...loc, bays: newBays };
            });
            return { unallocatedCargoes: newUnallocated, locations: newLocations };
        });
        
        const stateBeforeDelete = useCargoStore.getState();
        const foundCargo = stateBeforeDelete.unallocatedCargoes.find(c => c.id === cargoId) || 
                          stateBeforeDelete.locations.flatMap(loc => loc.bays).flatMap(bay => bay.allocatedCargoes).find(c => c.id === cargoId);
        
        if (foundCargo) {
            try {
                await DatabaseService.deleteCargo(foundCargo.id);
            } catch (error) {
                console.error('Failed to delete cargo from database:', error);
            }
        }
    },

    hydrateFromDb: (payload) => set((state) => ({
        unallocatedCargoes: payload.unallocatedCargoes ?? state.unallocatedCargoes,
        locations: payload.locations ?? state.locations,
        shipOperationCode: payload.shipOperationCode ?? state.shipOperationCode,
        manifestShipName: payload.manifestShipName ?? state.manifestShipName,
        manifestVoyage: payload.manifestVoyage ?? state.manifestVoyage,
        manifestsLoaded: payload.manifestsLoaded ?? state.manifestsLoaded,
        activeLocationId: payload.locations && payload.locations.length > 0 
            ? payload.locations[0].id 
            : state.activeLocationId
    })),
}));
