export type Team = 'blue' | 'red';

export type Role =
  | 'RUNNER'
  | 'SABOTEUR'
  | 'OUTER_WARDEN'
  | 'INNER_SENTRY';

export type ItemType =
  | 'letter'
  | 'health'
  | 'speed'
  | 'gun'
  | 'bomb'
  | 'wall'
  | 'intel';

export type MazePhase = 'ACTIVE' | 'WARNING' | 'SHIFTING';

export interface Vec2 {
  x: number;
  y: number;
}

export interface PlayerInput {
  slotId: string;
  x: number;
  y: number;
  facingX: number;
  facingY: number;
  actionHeld: boolean;
  actionSequence: number;
  inputSequence: number;
}

export interface RegisterPlayerRequest {
  playerToken: string;
  slotId: string;
  team: Team;
  role: Role;
  nickname?: string;
}

export interface ActorState {
  id: string;
  multiplayerSlotId: string;
  multiplayerUserId: string | null;
  multiplayerUsername: string;
  multiplayerHuman: boolean;
  multiplayerConnected: boolean;
  multiplayerBot: boolean;
  playerToken: string | null;
  team: Team;
  role: Role;
  publicRole: Role;
  guardianDuty: 'SENTRY' | 'WARDEN' | null;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  inputX: number;
  inputY: number;
  facingX: number;
  facingY: number;
  maxSpeed: number;
  r: number;
  alive: boolean;
  health: number;
  maxHealth: number;
  lives: number;
  respawnTimer: number;
  shootCooldown: number;
  damageFlash: number;
  weaponTier: number;
  gunAmmo: number;
  boost: number;
  stunTimer: number;
  mode: string;
  inv: InventoryState | null;
  lastInputSequence: number;
  lastActionSequence: number;
  processedActionSequence: number;
  lastSeenAt: number;
  botControlled: boolean;
  botTargetX: number;
  botTargetY: number;
  botThinkTimer: number;
  botActionTimer: number;
  stats: PlayerStats;
}

export interface InventoryState {
  id: string;
  type: ItemType;
  char?: string;
  stolen?: boolean;
  ignited?: boolean;
  magnitude?: number;
}

export interface ItemState {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  r: number;
  char?: string;
  team?: Team | null;
  ownerSlotId?: string | null;
  droppedBySlotId?: string | null;
  hiddenByTreeId?: string | null;
  stolen?: boolean;
  ignited?: boolean;
  timer?: number;
  magnitude?: number;
  respawnAt?: number;
}

export interface BulletState {
  id: string;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  damage: number;
  ownerSlotId: string;
  team: Team;
}

export interface WallState {
  id: string;
  team: Team;
  x: number;
  y: number;
  w: number;
  h: number;
  health: number;
  maxHealth: number;
}

export interface TimedEffect {
  id: string;
  x: number;
  y: number;
  r: number;
  a: number;
  growRate?: number;
  time?: number;
  team?: Team;
  kind?: string;
}

export interface PlayerStats {
  activeSeconds: number;
  powerupsPicked: number;
  usefulLettersPicked: number;
  lettersPlaced: number;
  correctLettersPlaced: number;
  stolenLetters: number;
  stolenDelivered: number;
  cluesCollected: number;
  shotsHit: number;
  damageDealt: number;
  eliminations: number;
  carrierStops: number;
  bombsDefused: number;
  bricksPicked: number;
  wallsBuilt: number;
  rebuiltWalls: number;
  blocks: number;
  forcedDrops: number;
  bombsPicked: number;
  bombsPlanted: number;
  wallsDestroyed: number;
  lettersScattered: number;
}

export interface WordWarsWorld {
  roomKey: string;
  seed: number;
  width: number;
  height: number;
  createdAt: number;
  updatedAt: number;
  lastBridgeActivityAt: number;
  simTime: number;
  stateSequence: number;
  worldRevision: number;
  lastSerializedWorldRevision: number;
  roundIndex: number;
  roundSeconds: number;
  roundDurationSeconds: number;
  finished: boolean;
  winnerTeam: Team | null;
  finishReason: string;
  blueWord: string;
  redWord: string;
  blueProgress: Array<string | null>;
  redProgress: Array<string | null>;
  spawnTimer: number;
  jammedUntil: Record<Team, number>;
  wordLocks: Record<Team, number>;
  actors: Map<string, ActorState>;
  actorByToken: Map<string, string>;
  items: ItemState[];
  bullets: BulletState[];
  walls: WallState[];
  explosions: TimedEffect[];
  slotEffects: TimedEffect[];
  interceptEffects: TimedEffect[];
  activeMazeIndex: number;
  pendingMazeIndex: number;
  mazePhase: MazePhase;
  mazeTimer: number;
  eventCounter: number;
  randomState: number;
}

export interface CreateWorldOptions {
  roomKey: string;
  seed?: number;
  word?: string;
  blueWord?: string;
  redWord?: string;
  roundDurationSeconds?: number;
}

export interface SerializedActor {
  [key: string]: unknown;
  multiplayerSlotId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  team: Team;
  role: Role;
}

export interface AuthoritativeSnapshot {
  type: 'game-snapshot';
  sequence: number;
  serverTime: number;
  sentAt: number;
  fullWorld: boolean;
  roundIndex: number;
  simTime: number;
  blueWord: string;
  redWord: string;
  state: {
    blue: Array<string | null>;
    red: Array<string | null>;
    seconds: number;
    over: boolean;
    paused: false;
    spawnTimer: number;
    jammedUntil: Record<Team, number>;
    wordLocks: Record<Team, number>;
  };
  demoMatch: {
    roundIndex: number;
    score: Record<Team, number>;
    resolving: boolean;
    finished: boolean;
  };
  actors: SerializedActor[];
  bullets: Array<Record<string, unknown>>;
  explosions: TimedEffect[];
  slotEffects: TimedEffect[];
  interceptEffects: TimedEffect[];
  maze: {
    activeMazeIndex: number;
    pendingMazeIndex: number;
    mazePhase: MazePhase;
    mazeTimer: number;
  };
  hostUserId: null;
  items?: Array<Record<string, unknown>>;
  walls?: WallState[];
  statsBySlot?: Record<string, PlayerStats>;
  winnerTeam?: Team | null;
  finishReason?: string;
}
