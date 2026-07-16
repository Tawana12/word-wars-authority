import { MAX_DT_SECONDS } from './constants';
import { moveActorWithCollisions } from './collisions';
import type { ActorState, WordWarsWorld } from './types';

export function updateActorMovement(world: WordWarsWorld, actor: ActorState, dtInput: number): void {
  const dt = Math.min(MAX_DT_SECONDS, Math.max(0, dtInput));
  actor.prevX = actor.x;
  actor.prevY = actor.y;

  if (!actor.alive) {
    actor.vx = 0;
    actor.vy = 0;
    return;
  }

  if (actor.stunTimer > 0) {
    actor.stunTimer = Math.max(0, actor.stunTimer - dt);
    actor.inputX = 0;
    actor.inputY = 0;
  }

  let inputX = finiteClamp(actor.inputX, -1, 1);
  let inputY = finiteClamp(actor.inputY, -1, 1);
  const magnitude = Math.hypot(inputX, inputY);
  if (magnitude > 1) {
    inputX /= magnitude;
    inputY /= magnitude;
  }

  const targetSpeed = actor.maxSpeed * (actor.boost > 0 ? 1.35 : 1);
  const targetVx = inputX * targetSpeed;
  const targetVy = inputY * targetSpeed;
  const acceleration = magnitude > 0.03 ? 18 : 28;
  const blend = 1 - Math.exp(-acceleration * dt);
  actor.vx += (targetVx - actor.vx) * blend;
  actor.vy += (targetVy - actor.vy) * blend;

  if (Math.hypot(actor.vx, actor.vy) < 0.1 && magnitude < 0.03) {
    actor.vx = 0;
    actor.vy = 0;
  }

  if (magnitude > 0.05) {
    actor.facingX = inputX / Math.max(magnitude, 0.0001);
    actor.facingY = inputY / Math.max(magnitude, 0.0001);
    actor.mode = 'moving';
  } else {
    actor.mode = 'idle';
  }

  moveActorWithCollisions(world, actor, actor.x + actor.vx * dt, actor.y + actor.vy * dt);

  actor.boost = Math.max(0, actor.boost - dt);
  actor.shootCooldown = Math.max(0, actor.shootCooldown - dt);
  actor.damageFlash = Math.max(0, actor.damageFlash - dt);
  actor.stats.activeSeconds += dt;
}

function finiteClamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(min, Math.min(max, value));
}
