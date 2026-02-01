import { UnitType } from './types';

export const BOARD_SIZE = 10;

export const UNIT_TYPES: UnitType[] = [
  { id: 'general', name: 'General Wiggler', size: 5, color: 'bg-worm-pink' },
  { id: 'fort', name: 'Snow Fort', size: 4, color: 'bg-slate-400' },
  { id: 'sled', name: 'Sled Team', size: 3, color: 'bg-amber-700' },
  { id: 'snowman', name: 'Tactical Snowman', size: 3, color: 'bg-white' },
  { id: 'scout', name: 'Scout Worm', size: 2, color: 'bg-worm-green' },
];

export const AI_PERSONA = `
You are "Commander Frost", a strategic AI worm leading a snowball fight.
You are playing a game of "Worms Snowball Warfare" (battleship variant).
Grid is 10x10.
You need to decide where to throw a snowball next.
Analyze the hit/miss history to find the hidden worm units.
Be aggressive but tactical.
`;
