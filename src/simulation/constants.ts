import type { Role, Team } from './types';

export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = 720;
export const TICK_RATE = positiveInt(process.env.WORD_WARS_TICK_RATE, 20, 10, 60);
export const SNAPSHOT_RATE = positiveInt(process.env.WORD_WARS_SNAPSHOT_RATE, 10, 2, 20);
export const SNAPSHOT_INTERVAL_TICKS = Math.max(1, Math.round(TICK_RATE / SNAPSHOT_RATE));
export const HUMAN_INPUT_TIMEOUT_MS = 3_000;
export const PLAYER_RADIUS = 15;
export const BASE_SPEED = 170;
export const RESPAWN_SECONDS = 2.5;
export const BULLET_SPEED = 520;
export const BULLET_LIFE_SECONDS = 1.4;
export const BULLET_DAMAGE = 24;
export const SHOOT_COOLDOWN_SECONDS = 0.32;
export const PICKUP_RADIUS = 24;
export const DEPOSIT_RADIUS = 105;
export const MAX_DT_SECONDS = 0.05;
export const IDLE_ROOM_MS = positiveInt(
  process.env.WORD_WARS_IDLE_ROOM_MS,
  180_000,
  30_000,
  3_600_000,
);

export interface SlotLayoutEntry {
  id: string;
  team: Team;
  role: Role;
  x: number;
  y: number;
}

export const SLOT_LAYOUT: SlotLayoutEntry[] = [
  { id: 'blue-runner-1', team: 'blue', role: 'RUNNER', x: 145, y: 260 },
  { id: 'blue-runner-2', team: 'blue', role: 'RUNNER', x: 145, y: 460 },
  { id: 'blue-saboteur', team: 'blue', role: 'SABOTEUR', x: 235, y: 360 },
  { id: 'blue-outer-warden', team: 'blue', role: 'OUTER_WARDEN', x: 90, y: 360 },
  { id: 'blue-inner-sentry', team: 'blue', role: 'INNER_SENTRY', x: 52, y: 360 },
  { id: 'red-runner-1', team: 'red', role: 'RUNNER', x: 1135, y: 260 },
  { id: 'red-runner-2', team: 'red', role: 'RUNNER', x: 1135, y: 460 },
  { id: 'red-saboteur', team: 'red', role: 'SABOTEUR', x: 1045, y: 360 },
  { id: 'red-outer-warden', team: 'red', role: 'OUTER_WARDEN', x: 1190, y: 360 },
  { id: 'red-inner-sentry', team: 'red', role: 'INNER_SENTRY', x: 1228, y: 360 },
];

export const DEFAULT_WORDS = [
  'TEAMWORK',
  'LANGUAGE',
  'STRATEGY',
  'VICTORY',
  'COURAGE',
  'BALANCE',
];

export const BLUE_BASE = { x: 18, y: 180, w: 245, h: 360 };
export const RED_BASE = { x: WORLD_WIDTH - 263, y: 180, w: 245, h: 360 };

export const STATIC_OBSTACLES = [
  { id: 'center-top', x: 540, y: 90, w: 200, h: 54 },
  { id: 'center-bottom', x: 540, y: 576, w: 200, h: 54 },
  { id: 'lane-left', x: 392, y: 280, w: 74, h: 160 },
  { id: 'lane-right', x: 814, y: 280, w: 74, h: 160 },
];

function positiveInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
