import { STATIC_OBSTACLES } from './constants';
import type { ActorState, WallState, WordWarsWorld } from './types';

export function moveActorWithCollisions(
  world: WordWarsWorld,
  actor: ActorState,
  nextX: number,
  nextY: number,
): void {
  const clampedX = clamp(nextX, actor.r, world.width - actor.r);
  const clampedY = clamp(nextY, actor.r, world.height - actor.r);

  if (!circleHitsWorld(world, actor, clampedX, actor.y)) actor.x = clampedX;
  if (!circleHitsWorld(world, actor, actor.x, clampedY)) actor.y = clampedY;
}

export function circleHitsWorld(
  world: WordWarsWorld,
  actor: Pick<ActorState, 'r'>,
  x: number,
  y: number,
): boolean {
  for (const obstacle of STATIC_OBSTACLES) {
    if (circleRectOverlap(x, y, actor.r, obstacle)) return true;
  }
  for (const wall of world.walls) {
    if (wall.health > 0 && circleRectOverlap(x, y, actor.r, wall)) return true;
  }
  return false;
}

export function pointHitsWall(x: number, y: number, walls: WallState[]): WallState | null {
  for (const wall of walls) {
    if (wall.health <= 0) continue;
    if (x >= wall.x && x <= wall.x + wall.w && y >= wall.y && y <= wall.y + wall.h) {
      return wall;
    }
  }
  return null;
}

export function distanceSquared(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function circleRectOverlap(
  cx: number,
  cy: number,
  radius: number,
  rect: { x: number; y: number; w: number; h: number },
): boolean {
  const closestX = clamp(cx, rect.x, rect.x + rect.w);
  const closestY = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < radius * radius;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
