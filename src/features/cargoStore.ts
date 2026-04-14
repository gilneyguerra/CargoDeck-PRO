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
export interface CargoState {
    manifestsLoaded: boolean;
    unallocatedCargoes: Cargo[];
    locations: CargoLocation[];
    activeLocationId: string | null;
    manifestShipName: string | null;
    manifestAtendimento: string | null;  // Número de atendimento extraído do manifesto
    manifestRoteiro: string[] | null;    // Roteiro previsto de portos
    searchTerm: string;
    editingCargo: Cargo | null;
    isHydratedFromCloud: boolean;

    setExtractedCargoes: (cargoes: Cargo[]) => void;
    setManifestDetails: (shipName: string | null, atendimento?: string | null, roteiro?: string[] | null) => void;
    addLocation: (name: string) => void;
    addManualCargo: (cargoData: Omit<Cargo, 'id' | 'status'>) => void;
    updateCargo: (id: string, updates: Partial<Cargo>) => void;
    setActiveLocation: (id: string) => void;
    updateActiveLocationConfig: (config: Partial<DeckConfig>) => void;
    moveCargoToBay: (cargoId: string, bayId: string, positionInBay?: 'port' | 'center' | 'starboard', x?: number, y?: number, isRotated?: boolean) => void;
    updateCargoPosition: (cargoId: string, x: number, y: number, isRotated?: boolean) => void;
    deleteCargo: (cargoId: string) => Promise<void>;
    deleteMultipleCargoes: (cargoIds: string[]) => Promise<void>;
    batchMoveCargoes: (cargoIds: string[], targetLocationId: string, targetBayId: string | 'distribute', targetSide: 'port' | 'center' | 'starboard') => void;
    setSearchTerm: (term: string) => void;
    getAllCargo: () => Cargo[];
    editLocation: (id: string, updates: Partial<CargoLocation>) => void;
    deleteLocation: (id: string) => void;
    clearAllCargoes: () => void;
    clearUnallocatedCargoes: () => Promise<void>;
    hydrateFromDb: (payload: Partial<CargoState>) => void;
    setEditingCargo: (cargo: Cargo | null) => void;
    setHydrationStatus: (status: boolean) => void;
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
            manifestShipName: null,
            manifestAtendimento: null,
            manifestRoteiro: null,
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
            isHydratedFromCloud: false,

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
            setHydrationStatus: (status) => set({ isHydratedFromCloud: status }),

            setSearchTerm: (term) => set({ searchTerm: term }),

            setManifestDetails: (shipName, atendimento, roteiro) => set({
                manifestShipName: shipName,
                manifestAtendimento: atendimento ?? null,
                manifestRoteiro: roteiro ?? null,
            }),

            setExtractedCargoes: (cargoes) => {
                try {
                    // Extrai metadados do manifesto do primeiro item (todos devem ter o mesmo cabeçalho)
                    const firstCargo = cargoes[0];
                    const manifestMeta = firstCargo ? {
                        manifestShipName:    firstCargo.nomeEmbarcacao    ?? null,
                        manifestAtendimento: firstCargo.numeroAtendimento  ?? null,
                        manifestRoteiro:     firstCargo.roteiroPrevisto    ?? null,
                    } : {};

                    set((state) => ({
                        unallocatedCargoes: [...state.unallocatedCargoes, ...cargoes],
                        manifestsLoaded: true,
                        ...manifestMeta,
                    }));
                    logger.info(`Adicionadas ${cargoes.length} cargas extraídas do PDF.`, {
                        cargoCount: cargoes.length,
                        totalUnallocated: get().unallocatedCargoes.length,
                        ...manifestMeta,
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
                    set((state) => {
                        // If bay count changed, we need to handle cargo migration
                        if (config.numberOfBays !== undefined && 
                            state.activeLocationId !== null) {
                            const activeLoc = state.locations.find(loc => loc.id === state.activeLocationId);
                            if (activeLoc) {
                                const currentBayCount = activeLoc.bays.length;
                                if (config.numberOfBays !== currentBayCount) {
                                    // Collect all cargo from existing bays
                                    const displacedCargoes: Cargo[] = activeLoc.bays.flatMap(bay => 
                                        bay.allocatedCargoes.map(cargo => ({
                                            ...cargo,
                                            status: 'UNALLOCATED' as const,
                                            bayId: undefined,
                                            positionInBay: undefined,
                                            x: undefined,
                                            y: undefined
                                        }))
                                    );
                                    
                                    // Calculate proper maxAreaSqMeters for new bays
                                    const bayLengthMeters = (config.lengthMeters ?? activeLoc.config.lengthMeters) / config.numberOfBays;
                                    const bayAreaSqMeters = bayLengthMeters * (config.widthMeters ?? activeLoc.config.widthMeters);
                                    
                                    // Create new bays with proper dimensions
                                    const newBays = Array.from({ length: config.numberOfBays }, (_, i) => ({
                                        id: uuidv4(),
                                        number: i + 1,
                                        name: `Baia ${i + 1}`,
                                        maxWeightTonnes: 150,
                                        maxAreaSqMeters: bayAreaSqMeters,
                                        allocatedCargoes: [],
                                        currentWeightTonnes: 0,
                                        currentOccupiedArea: 0
                                    }));
                                    
                                    // Prepend displaced cargo to unallocated
                                    return {
                                        ...state,
                                        locations: state.locations.map(loc => {
                                            if (loc.id === state.activeLocationId) {
                                                const newConfig = { ...loc.config, ...config };
                                                return { ...loc, config: newConfig, bays: newBays };
                                            }
                                            return loc;
                                        }),
                                        unallocatedCargoes: [...displacedCargoes, ...state.unallocatedCargoes]
                                    };
                                }
                            }
                        }
                        
                        // Default behavior if no bay count change or no active location
                        return {
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
                        };
                    });
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
                    // First, update the state optimistically
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
                    
                    // Then, delete from backend using the cargoId directly (no need to re-find it)
                    try {
                        await DatabaseService.deleteCargo(cargoId);
                        logger.info(`Carga ${cargoId} removida do banco de dados.`);
                    } catch (error) {
                        logger.error(`Falha ao remover carga ${cargoId} do banco de dados:`, error);
                        // Note: We don't throw here because we already removed from state
                        // The inconsistency will be resolved on next sync or manual retry
                    }
                } catch (error) {
                    logger.error(`Falha ao remover carga ${cargoId}:`, error);
                    throw handleApplicationError(error, { 
                        context: 'deleteCargo',
                        cargoId
                    });
                }
            },

            deleteMultipleCargoes: async (cargoIds) => {
                if (cargoIds.length === 0) return;
                try {
                    const idSet = new Set(cargoIds);
                    
                    set((state) => {
                        const newUnallocated = state.unallocatedCargoes.filter(c => !idSet.has(c.id));
                        const newLocations = state.locations.map(loc => {
                            const newBays = loc.bays.map(bay => {
                                const filteredCargoes = bay.allocatedCargoes.filter(c => !idSet.has(c.id));
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
                    
                    for (const id of cargoIds) {
                        try {
                            await DatabaseService.deleteCargo(id);
                        } catch (e) {
                            logger.warn(`Falha ao remover carga ${id} do DB (múltiplas):`, e);
                        }
                    }
                    logger.info(`${cargoIds.length} cargas removidas em lote.`);
                } catch (error) {
                    logger.error(`Falha na remoção multipla:`, error);
                    throw handleApplicationError(error, { 
                        context: 'deleteMultipleCargoes',
                        cargoIds
                    });
                }
            },

            batchMoveCargoes: (cargoIds, targetLocationId, targetBayId, targetSide) => {
                try {
                    const idSet = new Set(cargoIds);
                    set((state) => {
                        const targetLoc = state.locations.find(l => l.id === targetLocationId);
                        if (!targetLoc || targetLoc.bays.length === 0) return state;

                        // Collect all cargoes to move (from unallocated only for now)
                        const cargoesToMove = state.unallocatedCargoes.filter(c => idSet.has(c.id));
                        const newUnallocated = state.unallocatedCargoes.filter(c => !idSet.has(c.id));

                        // Determine target bays — either one specific bay, or distribute round-robin
                        let newLocations = state.locations.map(loc => {
                            if (loc.id !== targetLocationId) return loc;

                            const newBays = [...loc.bays.map(b => ({ ...b, allocatedCargoes: [...b.allocatedCargoes] }))];

                            if (targetBayId === 'distribute') {
                                // Round-robin: cargo 0 → bay 0, cargo 1 → bay 1, etc.
                                cargoesToMove.forEach((cargo, idx) => {
                                    const bayIdx = idx % newBays.length;
                                    const bay = newBays[bayIdx];
                                    const allocatedCargo = {
                                        ...cargo,
                                        status: 'ALLOCATED' as const,
                                        bayId: bay.id,
                                        positionInBay: targetSide,
                                        x: undefined,
                                        y: undefined,
                                    };
                                    bay.allocatedCargoes = [...bay.allocatedCargoes, allocatedCargo];
                                    bay.currentWeightTonnes = bay.allocatedCargoes.reduce((acc, c) => acc + (c.weightTonnes * c.quantity), 0);
                                    bay.currentOccupiedArea = bay.allocatedCargoes.reduce((acc, c) => acc + (c.lengthMeters * c.widthMeters * c.quantity), 0);
                                });
                            } else {
                                // All in a single chosen bay
                                const bayIdx = newBays.findIndex(b => b.id === targetBayId);
                                if (bayIdx === -1) return loc;
                                const bay = newBays[bayIdx];
                                cargoesToMove.forEach(cargo => {
                                    const allocatedCargo = {
                                        ...cargo,
                                        status: 'ALLOCATED' as const,
                                        bayId: bay.id,
                                        positionInBay: targetSide,
                                        x: undefined,
                                        y: undefined,
                                    };
                                    bay.allocatedCargoes = [...bay.allocatedCargoes, allocatedCargo];
                                });
                                bay.currentWeightTonnes = bay.allocatedCargoes.reduce((acc, c) => acc + (c.weightTonnes * c.quantity), 0);
                                bay.currentOccupiedArea = bay.allocatedCargoes.reduce((acc, c) => acc + (c.lengthMeters * c.widthMeters * c.quantity), 0);
                            }

                            return { ...loc, bays: newBays };
                        });

                        logger.info(`Batch move: ${cargoIds.length} cargas → local "${targetLoc.name}", lado "${targetSide}", modo "${targetBayId}".`);
                        return { unallocatedCargoes: newUnallocated, locations: newLocations };
                    });
                } catch (error) {
                    logger.error('Falha no batch move:', error);
                    throw handleApplicationError(error, { context: 'batchMoveCargoes', cargoIds, targetLocationId });
                }
            },

            hydrateFromDb: (payload) => {
                try {
                    const currentState = get();
                    set((state) => ({
                        unallocatedCargoes: payload.unallocatedCargoes ?? state.unallocatedCargoes,
                        locations: payload.locations ?? state.locations,
                        manifestShipName: payload.manifestShipName ?? state.manifestShipName,
                        manifestAtendimento: payload.manifestAtendimento ?? state.manifestAtendimento,
                        manifestRoteiro: payload.manifestRoteiro ?? state.manifestRoteiro,
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
                manifestShipName: state.manifestShipName,
                manifestAtendimento: state.manifestAtendimento,
                manifestRoteiro: state.manifestRoteiro,
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
