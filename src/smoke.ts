import assert from 'node:assert/strict';
import { createWorld } from './simulation/create-world';
import { applyPlayerInput, disconnectPlayer, registerPlayer } from './simulation/players';
import { serializeWorld } from './simulation/serialize';
import { tickWorld } from './simulation/tick-world';

const world = createWorld({
  roomKey: 'smoke-room',
  seed: 12345,
  word: 'TEAMWORK',
  roundDurationSeconds: 120,
});

registerPlayer(world, {
  playerToken: 'player-a',
  slotId: 'blue-runner-1',
  team: 'blue',
  role: 'RUNNER',
  nickname: 'BlueFox',
});

const actor = world.actors.get('blue-runner-1');
if (!actor) throw new Error('Actor should exist.');
const startX = actor.x;

applyPlayerInput(world, 'player-a', {
  slotId: 'blue-runner-1',
  x: 1,
  y: 0,
  facingX: 1,
  facingY: 0,
  actionHeld: false,
  actionSequence: 0,
  inputSequence: 1,
});

for (let index = 0; index < 20; index += 1) tickWorld(world, 0.05);
assert(actor.x > startX, 'Authoritative actor should move to the right.');
assert.equal(actor.multiplayerBot, false, 'Registered human must not be a bot.');

const botCount = [...world.actors.values()].filter(candidate => candidate.botControlled).length;
assert.equal(botCount, 9, 'Nine empty slots should remain bot-controlled.');

disconnectPlayer(world, 'player-a');
assert.equal(actor.botControlled, true, 'Disconnected human should be taken over by a bot.');

const snapshot = serializeWorld(world, { forceFullWorld: true });
assert.equal(snapshot.type, 'game-snapshot');
assert.equal(snapshot.actors.length, 10);
assert(snapshot.items && snapshot.items.length > 0, 'Full snapshot should include items.');

console.log(JSON.stringify({
  ok: true,
  stateSequence: snapshot.sequence,
  actors: snapshot.actors.length,
  items: snapshot.items?.length ?? 0,
  botCount: [...world.actors.values()].filter(candidate => candidate.botControlled).length,
}, null, 2));
