import type {
  ActorState,
  AuthoritativeSnapshot,
  InventoryState,
  ItemState,
  PlayerStats,
  SerializedActor,
  WordWarsWorld,
} from './types';

export function serializeWorld(
  world: WordWarsWorld,
  options: { forceFullWorld?: boolean; afterStateSequence?: number } = {},
): AuthoritativeSnapshot {
  const forceFullWorld = options.forceFullWorld ?? false;
  const requestedSequence = options.afterStateSequence ?? -1;
  const farBehind = requestedSequence < world.stateSequence - 30;
  const worldChanged = world.lastSerializedWorldRevision !== world.worldRevision;
  const fullWorld = forceFullWorld || farBehind || worldChanged;

  if (fullWorld) world.lastSerializedWorldRevision = world.worldRevision;

  const snapshot: AuthoritativeSnapshot = {
    type: 'game-snapshot',
    sequence: world.stateSequence,
    serverTime: Date.now(),
    sentAt: Date.now(),
    fullWorld,
    roundIndex: world.roundIndex,
    simTime: world.simTime,
    blueWord: world.blueWord,
    redWord: world.redWord,
    state: {
      blue: [...world.blueProgress],
      red: [...world.redProgress],
      seconds: Math.ceil(world.roundSeconds),
      over: world.finished,
      paused: false,
      spawnTimer: world.spawnTimer,
      jammedUntil: { ...world.jammedUntil },
      wordLocks: { ...world.wordLocks },
    },
    demoMatch: {
      roundIndex: world.roundIndex,
      score: {
        blue: world.blueProgress.filter(Boolean).length,
        red: world.redProgress.filter(Boolean).length,
      },
      resolving: world.finished,
      finished: world.finished,
    },
    actors: [...world.actors.values()].map(serializeActor),
    bullets: world.bullets.map(bullet => ({ ...bullet })),
    explosions: world.explosions.map(effect => ({ ...effect })),
    slotEffects: world.slotEffects.map(effect => ({ ...effect })),
    interceptEffects: world.interceptEffects.map(effect => ({ ...effect })),
    maze: {
      activeMazeIndex: world.activeMazeIndex,
      pendingMazeIndex: world.pendingMazeIndex,
      mazePhase: world.mazePhase,
      mazeTimer: world.mazeTimer,
    },
    hostUserId: null,
    winnerTeam: world.winnerTeam,
    finishReason: world.finishReason,
  };

  if (fullWorld) {
    snapshot.items = world.items.map(serializeItem);
    snapshot.walls = world.walls.map(wall => ({ ...wall }));
    snapshot.statsBySlot = statsBySlot(world);
  }

  return snapshot;
}

function serializeActor(actor: ActorState): SerializedActor {
  return {
    x: actor.x,
    y: actor.y,
    prevX: actor.prevX,
    prevY: actor.prevY,
    vx: actor.vx,
    vy: actor.vy,
    team: actor.team,
    role: actor.role,
    publicRole: actor.publicRole,
    guardianDuty: actor.guardianDuty,
    maxSpeed: actor.maxSpeed,
    r: actor.r,
    inputX: actor.inputX,
    inputY: actor.inputY,
    facingX: actor.facingX,
    facingY: actor.facingY,
    boost: actor.boost,
    stunTimer: actor.stunTimer,
    alive: actor.alive,
    maxHealth: actor.maxHealth,
    health: actor.health,
    lives: actor.lives,
    respawnTimer: actor.respawnTimer,
    damageFlash: actor.damageFlash,
    shootCooldown: actor.shootCooldown,
    weaponTier: actor.weaponTier,
    gunAmmo: actor.gunAmmo,
    mode: actor.mode,
    multiplayerSlotId: actor.multiplayerSlotId,
    multiplayerUserId: actor.multiplayerUserId,
    multiplayerUsername: actor.multiplayerUsername,
    multiplayerHuman: actor.multiplayerHuman,
    multiplayerConnected: actor.multiplayerConnected,
    multiplayerBot: actor.multiplayerBot,
    inv: serializeInventory(actor.inv),
  };
}

function serializeInventory(inv: InventoryState | null): Record<string, unknown> | null {
  return inv ? { ...inv } : null;
}

function serializeItem(item: ItemState): Record<string, unknown> {
  const result: Record<string, unknown> = { ...item };
  if (item.ownerSlotId == null) delete result.ownerSlotId;
  if (item.droppedBySlotId == null) delete result.droppedBySlotId;
  if (item.hiddenByTreeId == null) delete result.hiddenByTreeId;
  if (item.respawnAt == null || !Number.isFinite(item.respawnAt)) delete result.respawnAt;
  return result;
}

function statsBySlot(world: WordWarsWorld): Record<string, PlayerStats> {
  const result: Record<string, PlayerStats> = {};
  for (const actor of world.actors.values()) {
    result[actor.multiplayerSlotId] = { ...actor.stats };
  }
  return result;
}
