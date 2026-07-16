import { MAX_DT_SECONDS } from './constants';
import { processActorAction, updateBullets, updatePickupsAndDeposits, updateRespawns } from './actions';
import { botWantsAction, updateBotIntent } from './bots';
import { updateActorMovement } from './movement';
import { actionEdgePending, updatePresence } from './players';
import type { TimedEffect, WordWarsWorld } from './types';

export function tickWorld(world: WordWarsWorld, deltaSeconds: number): void {
  const dt = Math.min(MAX_DT_SECONDS, Math.max(0, deltaSeconds));
  if (dt <= 0) return;

  world.updatedAt = Date.now();
  world.simTime += dt;
  world.stateSequence += 1;
  updatePresence(world, world.updatedAt);

  if (!world.finished) {
    world.roundSeconds = Math.max(0, world.roundSeconds - dt);
    if (world.roundSeconds <= 0) finishByProgress(world);
  }

  for (const actor of world.actors.values()) {
    if (!actor.alive) continue;

    if (actor.botControlled) {
      updateBotIntent(world, actor, dt);
    }

    updateActorMovement(world, actor, dt);

    const humanAction = !actor.botControlled && actionEdgePending(actor);
    const botAction = actor.botControlled && botWantsAction(world, actor);
    if (!world.finished && (humanAction || botAction)) {
      processActorAction(world, actor);
    }
  }

  updatePickupsAndDeposits(world);
  updateBullets(world, dt);
  updateRespawns(world, dt);
  updateEffects(world.explosions, dt);
  updateEffects(world.slotEffects, dt);
  updateEffects(world.interceptEffects, dt);
  updateMaze(world, dt);
}

function finishByProgress(world: WordWarsWorld): void {
  const blue = world.blueProgress.filter(Boolean).length;
  const red = world.redProgress.filter(Boolean).length;
  world.finished = true;
  world.winnerTeam = blue === red ? null : blue > red ? 'blue' : 'red';
  world.finishReason = blue === red
    ? 'Time expired with equal progress.'
    : `${world.winnerTeam?.toUpperCase()} had more letters when time expired.`;
}

function updateEffects(effects: TimedEffect[], dt: number): void {
  for (let index = effects.length - 1; index >= 0; index -= 1) {
    const effect = effects[index]!;
    effect.r += (effect.growRate ?? 80) * dt;
    effect.a = Math.max(0, effect.a - dt * 2.8);
    if (effect.time != null) effect.time -= dt;
    if (effect.a <= 0 || (effect.time != null && effect.time <= 0)) {
      effects.splice(index, 1);
    }
  }
}

function updateMaze(world: WordWarsWorld, dt: number): void {
  world.mazeTimer -= dt;
  if (world.mazeTimer > 0) return;
  if (world.mazePhase === 'ACTIVE') {
    world.mazePhase = 'WARNING';
    world.pendingMazeIndex = (world.activeMazeIndex + 1) % 3;
    world.mazeTimer = 3;
  } else if (world.mazePhase === 'WARNING') {
    world.mazePhase = 'SHIFTING';
    world.mazeTimer = 1;
  } else {
    world.mazePhase = 'ACTIVE';
    world.activeMazeIndex = world.pendingMazeIndex;
    world.mazeTimer = 30;
    world.worldRevision += 1;
  }
}
