export interface DeckConfig {
  lengthMeters: number;
  widthMeters: number; // Restored global width
  numberOfBays: number;
  bayLengthMeters?: number; // Explicit length per bay
  elevationMeters: number; // Real structural Z height for VCG 
  portWidthMeters: number;    // Width of BB section
  centerWidthMeters: number;  // Width of Center section
  starboardWidthMeters: number; // Width of BE section
  maxCapacityPerSqMeter: number;
}

export const DEFAULT_DECK_CONFIG: DeckConfig = {
  lengthMeters: 50,
  widthMeters: 15,
  numberOfBays: 4,
  bayLengthMeters: 12.5,
  elevationMeters: 30, // Default reference based on A/B Plan
  portWidthMeters: 5,
  centerWidthMeters: 5,
  starboardWidthMeters: 5,
  maxCapacityPerSqMeter: 5, // 5 tons per sq meter
};
