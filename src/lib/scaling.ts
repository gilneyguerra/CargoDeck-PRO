import type { Cargo } from '@/domain/Cargo'

/**
 * Consistent scaling system for cargo visualization
 * Defines how real-world dimensions (meters) map to visual pixels
 */

/**
 * Base scale: 1 meter = 3 pixels
 * Reduced from 4 to make cargo elements smaller while maintaining readability
 */
export const BASE_SCALE = 20

/**
 * Convert real-world dimension (meters) to visual pixels linearly
 */
export function metersToPixels(meters: number): number {
  return meters * BASE_SCALE
}

/**
 * Get scaled dimensions exact for cargo physics
 */
export function getScaledDimensions(cargo: Cargo): { width: number, height: number, length: number } {
  return {
    width: cargo.widthMeters * BASE_SCALE,
    height: (cargo.heightMeters || 1) * BASE_SCALE,
    length: cargo.lengthMeters * BASE_SCALE
  }
}

/**
 * Get font size based on cargo dimensions for consistent text scaling.
 * Larger items get larger text, up to a limit.
 */
export function getCargoFontSize(cargo: Cargo): number {
  const minDim = Math.min(cargo.widthMeters, cargo.lengthMeters);
  
  // Base font size on the smallest dimension to ensure it fits better
  const baseSize = minDim * 2.5 + 4;
  
  // Clamp between 5px and 14px
  return Math.max(5, Math.min(14, baseSize));
}

/**
 * Get icon size based on cargo size for consistent icon scaling
 */
export function getCargoIconSize(cargo: Cargo): number {
  const minDim = Math.min(cargo.widthMeters, cargo.lengthMeters);
  return Math.max(12, Math.min(24, minDim * 4));
}