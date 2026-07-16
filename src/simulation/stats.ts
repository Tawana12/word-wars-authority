import type { PlayerStats } from './types';

export function emptyStats(): PlayerStats {
  return {
    activeSeconds: 0,
    powerupsPicked: 0,
    usefulLettersPicked: 0,
    lettersPlaced: 0,
    correctLettersPlaced: 0,
    stolenLetters: 0,
    stolenDelivered: 0,
    cluesCollected: 0,
    shotsHit: 0,
    damageDealt: 0,
    eliminations: 0,
    carrierStops: 0,
    bombsDefused: 0,
    bricksPicked: 0,
    wallsBuilt: 0,
    rebuiltWalls: 0,
    blocks: 0,
    forcedDrops: 0,
    bombsPicked: 0,
    bombsPlanted: 0,
    wallsDestroyed: 0,
    lettersScattered: 0,
  };
}
