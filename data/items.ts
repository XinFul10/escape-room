import type { ItemDefinition, ItemId } from '../types/game';

export const items: Record<ItemId, ItemDefinition> = {
  flashlight: {
    id: 'flashlight',
    name: 'Flashlight',
    description: 'A battery-powered flashlight for exploring the dark station.',
    inspectText: 'Its focused beam follows your cursor across the room.',
  },
  brassKey: {
    id: 'brassKey',
    name: 'Brass key',
    description: 'A small, worn key from the radio station.',
    inspectText: 'A stamped tag reads: SUPPLY CABINET.',
  },
  fuse: {
    id: 'fuse',
    name: 'Power fuse',
    description: 'A spare fuse rated for the station generator.',
    inspectText: 'The label says 20A.',
  },
  accessCard: {
    id: 'accessCard',
    name: 'Access card',
    description: 'A staff card recovered from the generator room.',
    inspectText: 'The magnetic strip is intact.',
  },
};
