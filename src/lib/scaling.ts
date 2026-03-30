import type { Cargo } from '@/domain/Cargo'

/**
 * Consistent scaling system for cargo visualization
 * Defines how real-world dimensions (meters) map to visual pixels
 */

/**
 * Base scale: 1 meter = 3 pixels
 * Reduced from 4 to make cargo elements smaller while maintaining readability
 */
export const BASE_SCALE = 3

/**
 * Minimum and maximum pixel sizes for cargo dimensions
 * Ensures cargos are always visible and usable, but not overwhelming
 */
export const MIN_PIXEL_SIZE = 9   // Reduced proportionally with BASE_SCALE
export const MAX_PIXEL_SIZE = 90  // Reduced proportionally with BASE_SCALE

/**
 * Convert real-world dimension (meters) to visual pixels with clamping
 */
export function metersToPixels(meters: number): number {
  const pixels = meters * BASE_SCALE
  return Math.max(MIN_PIXEL_SIZE, Math.min(MAX_PIXEL_SIZE, pixels))
}

/**
 * Get the scale factor for a cargo based on its dimensions
 * Returns a scale that ensures the largest dimension is within bounds
 */
export function getCargoScaleFactor(cargo: Cargo): number {
  const dimensions = [
    cargo.lengthMeters,
    cargo.widthMeters,
    cargo.heightMeters || 1 // Default height if not specified
  ]
  
  const maxDimension = Math.max(...dimensions)
  if (maxDimension <= 0) return 1
  
  // Calculate what scale would make the largest dimension = MAX_PIXEL_SIZE
  const scaleForMax = MAX_PIXEL_SIZE / maxDimension
  
  // But ensure we don't go below MIN_PIXEL_SIZE for the smallest dimension
  const minDimension = Math.min(...dimensions.filter(d => d > 0))
  const scaleForMin = minDimension > 0 ? MIN_PIXEL_SIZE / minDimension : scaleForMax
  
  // Use the more restrictive scale to ensure all dimensions are visible
  return Math.min(scaleForMax, scaleForMin)
}

/**
 * Get scaled dimensions for a cargo
 */
export function getScaledDimensions(cargo: Cargo): {
  width: number
  height: number
  length: number
} {
  const scale = getCargoScaleFactor(cargo)
  return {
    width: cargo.widthMeters * scale,
    height: (cargo.heightMeters || 1) * scale,
    length: cargo.lengthMeters * scale
  }
}

/**
 * Get font size based on cargo size for consistent text scaling
 * Base font size is 10px, scales with cargo size but clamped
 */
export function getCargoFontSize(cargo: Cargo): number {
  const scale = getCargoScaleFactor(cargo)
  // Base size 10px, scale factor adjusts it, clamped between 8px and 16px
  return Math.max(8, Math.min(16, 10 * scale / BASE_SCALE))
}

/**
 * Get icon size based on cargo size for consistent icon scaling
 * Base icon size is 12px, scales with cargo size but clamped
 */
export function getCargoIconSize(cargo: Cargo): number {
  const scale = getCargoScaleFactor(cargo)
  // Base size 12px, scale factor adjusts it, clamped between 10px and 20px
  return Math.max(10, Math.min(20, 12 * scale / BASE_SCALE))
}