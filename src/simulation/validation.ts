import type {
  PlayerInput,
  RegisterPlayerRequest,
  Role,
  Team,
} from './types';

const TEAM_VALUES = new Set<Team>(['blue', 'red']);
const ROLE_VALUES = new Set<Role>(['RUNNER', 'SABOTEUR', 'OUTER_WARDEN', 'INNER_SENTRY']);

export function requireObject(value: unknown, name = 'body'): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name} must be an object.`);
  }
  return value as Record<string, unknown>;
}

export function requireString(
  value: unknown,
  name: string,
  maxLength = 128,
): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string.`);
  }
  return value.trim().slice(0, maxLength);
}

export function optionalNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

export function parseRegisterPlayer(value: unknown): RegisterPlayerRequest {
  const body = requireObject(value, 'player');
  const team = requireString(body.team, 'player.team', 8) as Team;
  const role = requireString(body.role, 'player.role', 32) as Role;
  if (!TEAM_VALUES.has(team)) throw new Error('player.team must be blue or red.');
  if (!ROLE_VALUES.has(role)) throw new Error('player.role is invalid.');
  return {
    playerToken: requireString(body.playerToken, 'player.playerToken', 128),
    slotId: requireString(body.slotId, 'player.slotId', 64),
    team,
    role,
    nickname: typeof body.nickname === 'string' ? body.nickname.slice(0, 24) : undefined,
  };
}

export function parsePlayerInput(value: unknown): PlayerInput {
  const body = requireObject(value, 'input');
  return {
    slotId: requireString(body.slotId, 'input.slotId', 64),
    x: optionalNumber(body.x, 0, -1, 1),
    y: optionalNumber(body.y, 0, -1, 1),
    facingX: optionalNumber(body.facingX, 1, -1, 1),
    facingY: optionalNumber(body.facingY, 0, -1, 1),
    actionHeld: Boolean(body.actionHeld),
    actionSequence: Math.floor(optionalNumber(body.actionSequence, 0, 0, Number.MAX_SAFE_INTEGER)),
    inputSequence: Math.floor(optionalNumber(body.inputSequence, 0, 0, Number.MAX_SAFE_INTEGER)),
  };
}
