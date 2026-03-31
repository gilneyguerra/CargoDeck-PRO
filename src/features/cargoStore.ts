// src/features/cargoStore.ts
/**
 * @file Store Zustand para gerenciar o estado das cargas na aplicação CargoDeck-PRO.
 * Inclui persistência de estado via localStorage e logging de ações.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Cargo } from '@/domain/Cargo';
import type { CargoLocation } from '@/domain/Location';
import type { DeckConfig } from '@/domain/DeckConfig';
import { DEFAULT_DECK_CONFIG } from '@/domain/DeckConfig';
import { DatabaseService } from '@/infrastructure/DatabaseService';
import { v4 as uuidv4 } from 'uuid';

import { logger } from '../utils/logger';
import { handleApplicationError } from '../services/errorHandler';

/**
 * Define a estrutura do estado do store de cargas.
 */
interface CargoState {
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

export const useCargoStore = create<CargoState>()(
    persist(
        (set, get) => ({
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

            setExtractedCargoes: (cargoes) => {
                try {
                    set((state) => ({ 
                        unallocatedCargoes: [...state.unallocatedCargoes, ...cargoes], 
                        manifestsLoaded: true 
                    }));
                    logger.info(`Adicionadas ${cargoes.length} cargas extraídas do PDF.`, { 
                        cargoCount: cargoes.length,
                        totalUnallocated: get().unallocatedCargoes.length
                    });
                } catch (error) {
                    logger.error('Falha ao adicionar cargas extraídas:', error);
                    throw handleApplicationError(error, { 
                        context: 'setExtractedCargoes',
                        cargoCount: cargoes.length
                    });
                }
            },

            addManualCargo: (cargoData) => {
                try {
                    set((state) => ({
                        unallocatedCargoes: [...state.unallocatedCargoes, {
                            ...cargoData,
                            id: uuidv4(),
                            status: 'UNALLOCATED',
                            isRemovable: cargoData.isRemovable ?? false,
                            format: cargoData.format ?? 'Retangular',
                            color: cargoData.color ?? '#3b82f6'
                        }]
                    }));
                    logger.info('Carga manual adicionada.', { 
                        cargoData: { ...cargoData, id: '<generated>' },
                        totalUnallocated: get().unallocatedCargoes.length
                    });
                } catch (error) {
                    logger.error('Falha ao adicionar carga manual:', error);
                    throw handleApplicationError(error, { 
                        context: 'addManualCargo',
                        cargoData
                    });
                }
            },

            updateCargo: (id, updates) => {
                try {
                    set((state) => {
                        const newUnallocated = state.unallocatedCargoes.map(c => 
                            c.id === id ? { ...c, ...updates } : c
                        );
const newLocations = state.locations.map(loc => ({
                             ...loc,
                             bays: loc.bays.map(bay => ({
                                 ...bay,
                                 allocatedCargoes: bay.allocatedCargoes.map(c =>
                                     c.id === id ? { ...c, ...updates } : c
                                 ),
                                 currentWeightTonnes: bay.allocatedCargoes.reduce((acc, c) =>
                                     acc + (c.weightTonnes * c.quantity), 0),
                                 currentOccupiedArea: bay.allocatedCargoes.reduce((acc, c) =>
                                     acc + (c.lengthMeters * c.widthMeters * c.quantity), 0)
                             }))
                         }));
                         
                         return {
                             unallocatedCargoes: newUnallocated,
                             locations: newLocations
                         };
                     });
                     logger.info(`Carga ${id} atualizada.`, { id, updates });
                } catch (error) {
                    logger.error(`Falha ao atualizar carga ${id}:`, error);
                    throw handleApplicationError(error, { 
                        context: 'updateCargo',
                        id,
                        updates
                    });
                }
            },

            addLocation: (name) => {
                try {
                    set((state) => {
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
                    });
                    logger.info(`Nova localização adicionada: ${name}`, { 
                        locationName: name,
                        totalLocations: get().locations.length
                    });
                } catch (error) {
                    logger.error('Falha ao adicionar localização:', error);
                    throw handleApplicationError(error, { 
                        context: 'addLocation',
                        name
                    });
                }
            },

            setActiveLocation: (id) => {
                try {
                    set({ activeLocationId: id });
                    logger.debug(`Local ativo alterado para: ${id}`, { 
                        locationId: id,
                        previousLocationId: get().activeLocationId
                    });
                } catch (error) {
                    logger.error('Falha ao definir local ativo:', error);
                    throw handleApplicationError(error, { 
                        context: 'setActiveLocation',
                        locationId: id
                    });
                }
            },

            updateActiveLocationConfig: (config) => {
                try {
                    set((state) => ({
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
                    }));
                    logger.info('Configuração do local ativo atualizada.', { 
                        locationId: get().activeLocationId,
                        config
                    });
                } catch (error) {
                    logger.error('Falha ao atualizar configuração do local:', error);
                    throw handleApplicationError(error, { 
                        context: 'updateActiveLocationConfig',
                        config
                    });
                }
            },

            editLocation: (id, updates) => {
                try {
                    set((state) => ({
                        locations: state.locations.map(loc => 
                            loc.id === id ? { ...loc, ...updates } : loc
                        ),
                        ...(updates.id && { activeLocationId: updates.id })
                    }));
                    logger.info(`Localização ${id} editada.`, { id, updates });
                } catch (error) {
                    logger.error(`Falha ao editar localização ${id}:`, error);
                    throw handleApplicationError(error, { 
                        context: 'editLocation',
                        id,
                        updates
                    });
                }
            },

            deleteLocation: (id) => {
                try {
                    set((state) => {
                        if (state.locations.length <= 1) {
                            return state;
                        }
                        const locations = state.locations.filter(loc => loc.id !== id);
                        const activeLocationId = state.activeLocationId === id 
                            ? locations[0].id 
                            : state.activeLocationId;
                        return { locations, activeLocationId };
                    });
                    logger.info(`Localização ${id} removida.`, { 
                        locationId: id,
                        remainingLocations: get().locations.length
                    });
                } catch (error) {
                    logger.error(`Falha ao remover localização ${id}:`, error);
                    throw handleApplicationError(error, { 
                        context: 'deleteLocation',
                        locationId: id
                    });
                }
            },

            clearAllCargoes: () => {
                try {
                    set((state) => ({
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
                    }));
                    logger.info('Todas as cargas foram limpas.', { 
                        totalLocations: get().locations.length
                    });
                } catch (error) {
                    logger.error('Falha ao limpar todas as cargas:', error);
                    throw handleApplicationError(error, { 
                        context: 'clearAllCargoes'
                    });
                }
            },

            clearUnallocatedCargoes: async () => {
                try {
                    const state = get();
                    const cargoesToDelete = [...state.unallocatedCargoes];
                    
                    // Clear local state immediately for better UX
                    set({ unallocatedCargoes: [] });
                    
                    logger.info(`Iniciando remoção de ${cargoesToDelete.length} cargas não alocadas.`, { 
                        cargoCount: cargoesToDelete.length
                    });
                    
                    // Delete from database in background without waiting
                    for (const cargo of cargoesToDelete) {
                        try {
                            await DatabaseService.deleteCargo(cargo.id);
                        } catch (e) {
                            logger.warn(`Falha ao remover carga ${cargo.id} do banco de dados (continuando):`, e);
                        }
                    }
                    
                    logger.info(`Remoção de cargas não alocadas concluída.`, { 
                        attemptedCount: cargoesToDelete.length
                    });
                } catch (error) {
                    logger.error('Falha ao limpar cargas não alocadas:', error);
                    throw handleApplicationError(error, { 
                        context: 'clearUnallocatedCargoes'
                    });
                }
            },

            updateCargoPosition: (cargoId, x, y, isRotated) => {
                try {
                    set((state) => {
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
                    });
                    logger.debug(`Posição da carga ${cargoId} atualizada.`, { 
                        cargoId,
                        x,
                        y,
                        isRotated
                    });
                } catch (error) {
                    logger.error(`Falha ao atualizar posição da carga ${cargoId}:`, error);
                    throw handleApplicationError(error, { 
                        context: 'updateCargoPosition',
                        cargoId,
                        x,
                        y,
                        isRotated
                    });
                }
            },

            moveCargoToBay: (cargoId, bayId, positionInBay, x, y, isRotated) => {
                try {
                    // Save state before operation for potential undo/redo functionality
                    // In a more advanced implementation, we could save to history here
                    
                    set((state) => {
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
                            logger.warn(`Tentativa de mover carga inexistente: ${cargoId}`);
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
                    });
                    logger.info(`Carga ${cargoId} movida para baia ${bayId}.`, { 
                        cargoId,
                        bayId,
                        positionInBay,
                        x,
                        y,
                        isRotated
                    });
                } catch (error) {
                    logger.error(`Falha ao mover carga ${cargoId} para baia ${bayId}:`, error);
                    throw handleApplicationError(error, { 
                        context: 'moveCargoToBay',
                        cargoId,
                        bayId,
                        positionInBay,
                        x,
                        y,
                        isRotated
                    });
                }
            },

            deleteCargo: async (cargoId) => {
                try {
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
                    
                    const stateBeforeDelete = get();
                    const foundCargo = stateBeforeDelete.unallocatedCargoes.find(c => c.id === cargoId) || 
                                       stateBeforeDelete.locations.flatMap(loc => loc.bays).flatMap(bay => bay.allocatedCargoes).find(c => c.id === cargoId);
                    
                    if (foundCargo) {
                        try {
                            await DatabaseService.deleteCargo(foundCargo.id);
                            logger.info(`Carga ${cargoId} removida completamente.`, { 
                                cargoId: foundCargo.id,
                                description: foundCargo.description
                            });
                        } catch (error) {
                            logger.error(`Falha ao remover carga ${cargoId} do banco de dados:`, error);
                            // Note: We don't throw here because we already removed from state
                            // The inconsistency will be resolved on next sync or manual retry
                        }
                    }
                } catch (error) {
                    logger.error(`Falha ao remover carga ${cargoId}:`, error);
                    throw handleApplicationError(error, { 
                        context: 'deleteCargo',
                        cargoId
                    });
                }
            },

            hydrateFromDb: (payload) => {
                try {
                    const currentState = get();
                    set((state) => ({
                        unallocatedCargoes: payload.unallocatedCargoes ?? state.unallocatedCargoes,
                        locations: payload.locations ?? state.locations,
                        shipOperationCode: payload.shipOperationCode ?? state.shipOperationCode,
                        manifestShipName: payload.manifestShipName ?? state.manifestShipName,
                        manifestVoyage: payload.manifestVoyage ?? state.manifestVoyage,
                        manifestsLoaded: payload.manifestsLoaded ?? state.manifestsLoaded,
                        activeLocationId: payload.locations && payload.locations.length > 0 
                            ? payload.locations[0].id 
                            : state.activeLocationId
                    }));
                    logger.info('Estado hidratado do banco de dados.', { 
                        hasPayload: !!payload,
                        cargoCount: payload?.unallocatedCargoes?.length ?? currentState.unallocatedCargoes.length,
                        locationCount: payload?.locations?.length ?? currentState.locations.length
                    });
                } catch (error) {
                    logger.error('Falha ao hidratar estado do banco de dados:', error);
                    throw handleApplicationError(error, { 
                        context: 'hydrateFromDb',
                        payload
                    });
                }
            }
        }),
        {
            name: 'cargo-deck-pro-storage', // Unique name for the item in localStorage
            storage: createJSONStorage(() => localStorage), // Uses localStorage
            partialize: (state) => ({
                unallocatedCargoes: state.unallocatedCargoes,
                locations: state.locations,
                shipOperationCode: state.shipOperationCode,
                manifestShipName: state.manifestShipName,
                manifestVoyage: state.manifestVoyage,
                manifestsLoaded: state.manifestsLoaded,
                activeLocationId: state.activeLocationId,
            }),
            onRehydrateStorage: () => {
                logger.info('Reidratando estado do armazenamento local...');
                // Optional: Add migration or validation logic here
                return (_state, error) => {
                    if (error) {
                        const appError = handleApplicationError(error, { 
                            context: 'zustandRehydration'
                        });
                        logger.error('Falha na reidratação do estado do armazenamento local.', appError);
                        // If rehydration fails, you might want to clear state or load a default state
                        // set({ /* default state */ });
                    } else {
                        logger.info('Estado do armazenamento local reidratado com sucesso.');
                    }
                };
            }
        }
    )
);
