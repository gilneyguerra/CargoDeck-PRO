import { useCargoStore } from '@/features/cargoStore';
import type { CargoState } from '@/features/cargoStore';

/**
 * Utility function to get values from the cargo store
 * Useful when you need to access store values outside of React components
 */
export const useStoreValue = <T>(selector: (state: CargoState) => T): T => {
  return useCargoStore(selector);
};

/**
 * Utility function to get the current ship operation code
 */
export const useShipOperationCode = () => useStoreValue(state => state.shipOperationCode);

/**
 * Utility function to get the current unallocated cargoes
 */
export const useUnallocatedCargoes = () => useStoreValue(state => state.unallocatedCargoes);

/**
 * Utility function to get the current locations
 */
export const useLocations = () => useStoreValue(state => state.locations);

/**
 * Utility function to get the active location ID
 */
export const useActiveLocationId = () => useStoreValue(state => state.activeLocationId);

/**
 * Utility function to set the active location ID
 */
export const useSetActiveLocation = () => {
  const setActiveLocation = useCargoStore(state => state.setActiveLocation);
  return setActiveLocation;
};