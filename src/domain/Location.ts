import type { Bay } from './Bay';
import type { DeckConfig } from './DeckConfig';

export interface CargoLocation {
  id: string;
  name: string;
  config: DeckConfig;
  bays: Bay[];
}
