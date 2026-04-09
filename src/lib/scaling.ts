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
 * Get font size based on cargo size for consistent text scaling
 */
export function getCargoFontSize(_cargo: Cargo): number {
  return 10;
}

/**
 * Get icon size based on cargo size for consistent icon scaling
 */
export function getCargoIconSize(_cargo: Cargo): number {
  return 24;
}