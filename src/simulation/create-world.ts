import {
  BASE_SPEED,
  BLUE_BASE,
  DEFAULT_WORDS,
  PLAYER_RADIUS,
  RED_BASE,
  SLOT_LAYOUT,
  STATIC_OBSTACLES,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './constants';
import { hashSeed, randomChoice, randomRange } from './random';
import { emptyStats } from './stats';
import type {
  ActorState,
  CreateWorldOptions,
  ItemState,
  WallState,
  WordWarsWorld,
} from './types';

export function createWorld(options: CreateWorldOptions): WordWarsWorld {
  const now = Date.now();
  const seed = options.seed ?? hashSeed(`${options.roomKey}:${now}`);
  const world: WordWarsWorld = {
    roomKey: options.roomKey,
    seed,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    createdAt: now,
    updatedAt: now,
    lastBridgeActivityAt: now,
    simTime: 0,
    stateSequence: 0,
    worldRevision: 1,
    lastSerializedWorldRevision: -1,
    roundIndex: 0,
    roundSeconds: options.roundDurationSeconds ?? 180,
    roundDurationSeconds: options.roundDurationSeconds ?? 180,
    finished: false,
    winnerTeam: null,
    finishReason: '',
    blueWord: '',
    redWord: '',
    blueProgress: [],
    redProgress: [],
    spawnTimer: 0,
    jammedUntil: { blue: 0, red: 0 },
    wordLocks: { blue: 0, red: 0 },
    actors: new Map(),
    actorByToken: new Map(),
    items: [],
    bullets: [],
    walls: [],
    explosions: [],
    slotEffects: [],
    interceptEffects: [],
    activeMazeIndex: 0,
    pendingMazeIndex: 0,
    mazePhase: 'ACTIVE',
    mazeTimer: 30,
    eventCounter: 0,
    randomState: seed >>> 0,
  };

  const sharedWord = sanitizeWord(options.word) || randomChoice(world, DEFAULT_WORDS);
  world.blueWord = sanitizeWord(options.blueWord) || sharedWord;
  world.redWord = sanitizeWord(options.redWord) || sharedWord;
  world.blueProgress = Array.from({ length: world.blueWord.length }, () => null);
  world.redProgress = Array.from({ length: world.redWord.length }, () => null);

  for (const slot of SLOT_LAYOUT) {
    const actor = createActor(slot.id, slot.team, slot.role, slot.x, slot.y);
    world.actors.set(slot.id, actor);
  }

  world.walls.push(...createInitialWalls());
  world.items.push(...createInitialItems(world));
  return world;
}

function createActor(
  slotId: string,
  team: ActorState['team'],
  role: ActorState['role'],
  x: number,
  y: number,
): ActorState {
  return {
    id: `actor:${slotId}`,
    multiplayerSlotId: slotId,
    multiplayerUserId: null,
    multiplayerUsername: 'Bot',
    multiplayerHuman: false,
    multiplayerConnected: false,
    multiplayerBot: true,
    playerToken: null,
    team,
    role,
    publicRole: role,
    guardianDuty: role === 'INNER_SENTRY' ? 'SENTRY' : role === 'OUTER_WARDEN' ? 'WARDEN' : null,
    x,
    y,
    prevX: x,
    prevY: y,
    vx: 0,
    vy: 0,
    inputX: 0,
    inputY: 0,
    facingX: team === 'blue' ? 1 : -1,
    facingY: 0,
    maxSpeed: role === 'RUNNER' ? BASE_SPEED * 1.08 : role === 'SABOTEUR' ? BASE_SPEED : BASE_SPEED * 0.92,
    r: PLAYER_RADIUS,
    alive: true,
    health: 100,
    maxHealth: 100,
    lives: 3,
    respawnTimer: 0,
    shootCooldown: 0,
    damageFlash: 0,
    weaponTier: 1,
    gunAmmo: 999,
    boost: 0,
    stunTimer: 0,
    mode: 'idle',
    inv: null,
    lastInputSequence: 0,
    lastActionSequence: 0,
    processedActionSequence: 0,
    lastSeenAt: 0,
    botControlled: true,
    botTargetX: x,
    botTargetY: y,
    botThinkTimer: 0,
    botActionTimer: 0,
    stats: emptyStats(),
  };
}

function createInitialWalls(): WallState[] {
  return [
    { id: 'blue-base-top', team: 'blue', x: BLUE_BASE.x + 24, y: BLUE_BASE.y, w: 185, h: 18, health: 100, maxHealth: 100 },
    { id: 'blue-base-bottom', team: 'blue', x: BLUE_BASE.x + 24, y: BLUE_BASE.y + BLUE_BASE.h - 18, w: 185, h: 18, health: 100, maxHealth: 100 },
    { id: 'red-base-top', team: 'red', x: RED_BASE.x + 36, y: RED_BASE.y, w: 185, h: 18, health: 100, maxHealth: 100 },
    { id: 'red-base-bottom', team: 'red', x: RED_BASE.x + 36, y: RED_BASE.y + RED_BASE.h - 18, w: 185, h: 18, health: 100, maxHealth: 100 },
  ];
}

function createInitialItems(world: WordWarsWorld): ItemState[] {
  const letters = `${world.blueWord}${world.redWord}AEIOURSTLNM`;
  const items: ItemState[] = [];
  for (let index = 0; index < letters.length; index += 1) {
    items.push({
      id: `letter:${index}`,
      type: 'letter',
      char: letters[index]!,
      x: randomRange(world, 310, WORLD_WIDTH - 310),
      y: randomRange(world, 85, WORLD_HEIGHT - 85),
      r: 11,
      ownerSlotId: null,
      droppedBySlotId: null,
      hiddenByTreeId: null,
      stolen: false,
    });
  }

  const pickups: ItemState['type'][] = ['health', 'speed', 'gun', 'bomb', 'wall', 'intel'];
  for (let index = 0; index < 12; index += 1) {
    items.push({
      id: `power:${index}`,
      type: pickups[index % pickups.length]!,
      x: randomRange(world, 300, WORLD_WIDTH - 300),
      y: randomRange(world, 90, WORLD_HEIGHT - 90),
      r: 12,
      ownerSlotId: null,
      magnitude: index % 3 === 0 ? 1.5 : 1,
      ignited: false,
      timer: 0,
    });
  }
  return items;
}

export function staticObstacles(): ReadonlyArray<{ id: string; x: number; y: number; w: number; h: number }> {
  return STATIC_OBSTACLES;
}

function sanitizeWord(value: string | undefined): string {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 12);
}
