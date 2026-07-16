import { BLUE_BASE, RED_BASE } from './constants';
import { randomRange } from './random';
import type { ActorState, Team, WordWarsWorld } from './types';

export function updateBotIntent(world: WordWarsWorld, actor: ActorState, dt: number): void {
  actor.botThinkTimer -= dt;
  actor.botActionTimer -= dt;

  if (actor.botThinkTimer <= 0) {
    actor.botThinkTimer = randomRange(world, 0.25, 0.7);
    const target = chooseBotTarget(world, actor);
    actor.botTargetX = target.x;
    actor.botTargetY = target.y;
  }

  const dx = actor.botTargetX - actor.x;
  const dy = actor.botTargetY - actor.y;
  const distance = Math.hypot(dx, dy);
  if (distance > 8) {
    actor.inputX = dx / distance;
    actor.inputY = dy / distance;
    actor.facingX = actor.inputX;
    actor.facingY = actor.inputY;
  } else {
    actor.inputX = 0;
    actor.inputY = 0;
  }
}

export function botWantsAction(world: WordWarsWorld, actor: ActorState): boolean {
  if (actor.botActionTimer > 0 || !actor.alive) return false;
  const enemy = nearestEnemy(world, actor);
  if (!enemy) return false;
  const distance = Math.hypot(enemy.x - actor.x, enemy.y - actor.y);
  if (distance > 285) return false;
  actor.botActionTimer = randomRange(world, 0.32, 0.75);
  actor.facingX = (enemy.x - actor.x) / Math.max(distance, 0.0001);
  actor.facingY = (enemy.y - actor.y) / Math.max(distance, 0.0001);
  return true;
}

function chooseBotTarget(world: WordWarsWorld, actor: ActorState): { x: number; y: number } {
  if (actor.inv?.type === 'letter') return baseCenter(actor.team);

  const missing = missingLetters(world, actor.team);
  const useful = world.items
    .filter(item => item.type === 'letter' && item.ownerSlotId == null && item.char && missing.includes(item.char))
    .sort((a, b) => distanceSq(actor, a) - distanceSq(actor, b))[0];
  if (useful) return useful;

  const nearest = world.items
    .filter(item => item.ownerSlotId == null && !item.respawnAt)
    .sort((a, b) => distanceSq(actor, a) - distanceSq(actor, b))[0];
  if (nearest) return nearest;

  return {
    x: randomRange(world, 320, world.width - 320),
    y: randomRange(world, 90, world.height - 90),
  };
}

function baseCenter(team: Team): { x: number; y: number } {
  const base = team === 'blue' ? BLUE_BASE : RED_BASE;
  return { x: base.x + base.w / 2, y: base.y + base.h / 2 };
}

function nearestEnemy(world: WordWarsWorld, actor: ActorState): ActorState | null {
  let best: ActorState | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of world.actors.values()) {
    if (!candidate.alive || candidate.team === actor.team) continue;
    const distance = distanceSq(actor, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}

function missingLetters(world: WordWarsWorld, team: Team): string[] {
  const word = team === 'blue' ? world.blueWord : world.redWord;
  const progress = team === 'blue' ? world.blueProgress : world.redProgress;
  const missing: string[] = [];
  for (let index = 0; index < word.length; index += 1) {
    if (!progress[index]) missing.push(word[index]!);
  }
  return missing;
}

function distanceSq(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}
