import { HUMAN_INPUT_TIMEOUT_MS, SLOT_LAYOUT } from './constants';
import type {
  ActorState,
  PlayerInput,
  RegisterPlayerRequest,
  WordWarsWorld,
} from './types';

export function registerPlayer(
  world: WordWarsWorld,
  request: RegisterPlayerRequest,
): { slotId: string; replacedToken: string | null } {
  const slot = SLOT_LAYOUT.find(entry => entry.id === request.slotId);
  if (!slot) throw new Error(`Unknown slotId: ${request.slotId}`);
  if (slot.team !== request.team || slot.role !== request.role) {
    throw new Error('Slot team or role does not match the authoritative layout.');
  }

  const actor = world.actors.get(request.slotId);
  if (!actor) throw new Error(`Actor missing for slot ${request.slotId}.`);

  const replacedToken = actor.playerToken;
  if (replacedToken && replacedToken !== request.playerToken) {
    world.actorByToken.delete(replacedToken);
  }

  const oldSlotId = world.actorByToken.get(request.playerToken);
  if (oldSlotId && oldSlotId !== request.slotId) {
    const oldActor = world.actors.get(oldSlotId);
    if (oldActor) releaseActorToBot(oldActor);
  }

  actor.playerToken = request.playerToken;
  actor.multiplayerUserId = request.playerToken;
  actor.multiplayerUsername = cleanNickname(request.nickname);
  actor.multiplayerHuman = true;
  actor.multiplayerConnected = true;
  actor.multiplayerBot = false;
  actor.botControlled = false;
  actor.lastSeenAt = Date.now();
  actor.lastInputSequence = 0;
  actor.inputX = 0;
  actor.inputY = 0;
  world.actorByToken.set(request.playerToken, request.slotId);
  world.lastBridgeActivityAt = Date.now();
  world.worldRevision += 1;

  return { slotId: request.slotId, replacedToken };
}

export function applyPlayerInput(
  world: WordWarsWorld,
  playerToken: string,
  input: PlayerInput,
): { accepted: boolean; acknowledgedInputSequence: number } {
  const slotId = world.actorByToken.get(playerToken);
  if (!slotId || slotId !== input.slotId) {
    return { accepted: false, acknowledgedInputSequence: 0 };
  }

  const actor = world.actors.get(slotId);
  if (!actor || actor.playerToken !== playerToken) {
    return { accepted: false, acknowledgedInputSequence: 0 };
  }

  if (input.inputSequence <= actor.lastInputSequence) {
    return {
      accepted: false,
      acknowledgedInputSequence: actor.lastInputSequence,
    };
  }

  actor.lastInputSequence = input.inputSequence;
  actor.inputX = finiteClamp(input.x, -1, 1);
  actor.inputY = finiteClamp(input.y, -1, 1);
  actor.facingX = finiteClamp(input.facingX, -1, 1);
  actor.facingY = finiteClamp(input.facingY, -1, 1);
  actor.multiplayerConnected = true;
  actor.multiplayerHuman = true;
  actor.multiplayerBot = false;
  actor.botControlled = false;
  actor.lastSeenAt = Date.now();
  world.lastBridgeActivityAt = Date.now();

  if (input.actionSequence > actor.lastActionSequence) {
    actor.lastActionSequence = input.actionSequence;
  }

  return {
    accepted: true,
    acknowledgedInputSequence: actor.lastInputSequence,
  };
}

export function disconnectPlayer(world: WordWarsWorld, playerToken: string): boolean {
  const slotId = world.actorByToken.get(playerToken);
  if (!slotId) return false;
  const actor = world.actors.get(slotId);
  if (!actor) return false;
  actor.multiplayerConnected = false;
  actor.botControlled = true;
  actor.multiplayerBot = true;
  actor.inputX = 0;
  actor.inputY = 0;
  actor.lastSeenAt = Date.now();
  world.lastBridgeActivityAt = Date.now();
  world.worldRevision += 1;
  return true;
}

export function updatePresence(world: WordWarsWorld, now = Date.now()): void {
  for (const actor of world.actors.values()) {
    if (!actor.playerToken) {
      actor.botControlled = true;
      actor.multiplayerHuman = false;
      actor.multiplayerConnected = false;
      actor.multiplayerBot = true;
      continue;
    }

    if (now - actor.lastSeenAt > HUMAN_INPUT_TIMEOUT_MS) {
      actor.multiplayerConnected = false;
      actor.botControlled = true;
      actor.multiplayerBot = true;
    }
  }
}

export function actionEdgePending(actor: ActorState): boolean {
  if (actor.lastActionSequence <= actor.processedActionSequence) return false;
  actor.processedActionSequence = actor.lastActionSequence;
  return true;
}

function releaseActorToBot(actor: ActorState): void {
  actor.playerToken = null;
  actor.multiplayerUserId = null;
  actor.multiplayerUsername = 'Bot';
  actor.multiplayerHuman = false;
  actor.multiplayerConnected = false;
  actor.multiplayerBot = true;
  actor.botControlled = true;
  actor.inputX = 0;
  actor.inputY = 0;
}

function cleanNickname(value: string | undefined): string {
  const cleaned = String(value ?? 'Redditor')
    .replace(/[^a-zA-Z0-9_\- ]/g, '')
    .trim()
    .slice(0, 24);
  return cleaned || 'Redditor';
}

function finiteClamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(min, Math.min(max, value));
}
