// Copy the pattern into src/server/services/authoritative-multiplayer.ts.
// Adapt Redis/settings access to the exact Devvit packages used by your project.

const AUTHORITY_URL = process.env.WORD_WARS_AUTHORITY_URL;
const AUTHORITY_SECRET = process.env.WORD_WARS_AUTHORITY_SECRET;

async function authorityPost<T>(path: string, body: unknown): Promise<T> {
  if (!AUTHORITY_URL || !AUTHORITY_SECRET) {
    throw new Error('Word Wars authority is not configured.');
  }

  const response = await fetch(`${AUTHORITY_URL.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-word-wars-bridge-secret': AUTHORITY_SECRET,
    },
    body: JSON.stringify(body),
  });

  const result = await response.json().catch(() => null) as
    | { message?: string }
    | null;
  if (!response.ok) {
    throw new Error(result?.message || `Authority returned ${response.status}.`);
  }
  return result as T;
}

export async function createAuthorityRoom(input: {
  roomKey: string;
  seed?: number;
  word?: string;
}) {
  return authorityPost<{
    ok: true;
    created: boolean;
    authorityRoomId: string;
    snapshot: unknown;
  }>('/bridge/rooms/create', input);
}

export async function registerAuthorityPlayer(input: {
  authorityRoomId: string;
  player: {
    playerToken: string;
    slotId: string;
    team: 'blue' | 'red';
    role: 'RUNNER' | 'SABOTEUR' | 'OUTER_WARDEN' | 'INNER_SENTRY';
    nickname?: string;
  };
}) {
  return authorityPost('/bridge/rooms/player', input);
}

export async function syncAuthority(input: {
  authorityRoomId: string;
  playerToken: string;
  afterStateSequence: number;
  input: unknown;
  forceFullWorld?: boolean;
}) {
  return authorityPost<{
    ok: true;
    stateSequence: number;
    acknowledgedInputSequence: number;
    inputAccepted: boolean;
    shouldBroadcast: boolean;
    snapshot: unknown;
  }>('/bridge/rooms/sync', input);
}

export async function leaveAuthority(input: {
  authorityRoomId: string;
  playerToken: string;
}) {
  return authorityPost('/bridge/rooms/leave', input);
}

export async function finishAuthority(input: {
  authorityRoomId: string;
  reason?: string;
}) {
  return authorityPost('/bridge/rooms/finish', input);
}
