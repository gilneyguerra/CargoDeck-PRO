// src/lib/storeUtils.ts
import { useCargoStore } from '@/features/cargoStore';

/**
 * Utility function to get values from the cargo store
 * Useful when you need to access store values outside of React components
 */
export const useStoreValue = <T>(selector: (state: unknown) => T): T => {
  return useCargoStore(selector as (state: unknown) => T);
};

/**
 * Utility function to get the current unallocated cargoes
 */
export const useUnallocatedCargoes = () => useCargoStore(state => state.unallocatedCargoes);

/**
 * Utility function to get the current locations
 */
export const useLocations = () => useCargoStore(state => state.locations);

/**
 * Utility function to get the active location ID
 */
export const useActiveLocationId = () => useCargoStore(state => state.activeLocationId);

/**
 * Utility function to set the active location ID
 */
export const useSetActiveLocation = () => {
  const setActiveLocation = useCargoStore(state => state.setActiveLocation);
  return setActiveLocation;
};