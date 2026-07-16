import type { WordWarsWorld } from './types';

export function hashSeed(input: string | number): number {
  const text = String(input);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 0x9e3779b9;
}

export function random(world: WordWarsWorld): number {
  let state = world.randomState >>> 0;
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  world.randomState = state >>> 0;
  return (world.randomState >>> 0) / 0x1_0000_0000;
}

export function randomRange(world: WordWarsWorld, min: number, max: number): number {
  return min + random(world) * (max - min);
}

export function randomChoice<T>(world: WordWarsWorld, values: readonly T[]): T {
  if (values.length === 0) throw new Error('Cannot choose from an empty array.');
  const index = Math.min(values.length - 1, Math.floor(random(world) * values.length));
  return values[index]!;
}
