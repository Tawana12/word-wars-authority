import {
  BLUE_BASE,
  BULLET_DAMAGE,
  BULLET_LIFE_SECONDS,
  BULLET_SPEED,
  DEPOSIT_RADIUS,
  PICKUP_RADIUS,
  RED_BASE,
  RESPAWN_SECONDS,
  SHOOT_COOLDOWN_SECONDS,
} from './constants';
import { distanceSquared, pointHitsWall } from './collisions';
import { randomRange } from './random';
import type { ActorState, BulletState, ItemState, Team, WordWarsWorld } from './types';

export function processActorAction(world: WordWarsWorld, actor: ActorState): void {
  if (!actor.alive) return;
  tryDeposit(world, actor);
  shoot(world, actor);
}

export function updatePickupsAndDeposits(world: WordWarsWorld): void {
  for (const actor of world.actors.values()) {
    if (!actor.alive) continue;
    if (!actor.inv) tryPickup(world, actor);
    if (actor.inv?.type === 'letter') tryDeposit(world, actor);
  }
  respawnItems(world);
}

export function updateBullets(world: WordWarsWorld, dt: number): void {
  for (let index = world.bullets.length - 1; index >= 0; index -= 1) {
    const bullet = world.bullets[index]!;
    bullet.prevX = bullet.x;
    bullet.prevY = bullet.y;
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;

    const wall = pointHitsWall(bullet.x, bullet.y, world.walls);
    if (wall) {
      wall.health = Math.max(0, wall.health - bullet.damage * 0.4);
      if (wall.health <= 0) world.worldRevision += 1;
      createExplosion(world, bullet.x, bullet.y, bullet.team, 'wall-hit');
      world.bullets.splice(index, 1);
      continue;
    }

    const owner = world.actors.get(bullet.ownerSlotId);
    let hit = false;
    for (const target of world.actors.values()) {
      if (!target.alive || target.team === bullet.team || target.multiplayerSlotId === bullet.ownerSlotId) continue;
      const radius = target.r + bullet.r;
      if (distanceSquared(target.x, target.y, bullet.x, bullet.y) > radius * radius) continue;
      damageActor(world, target, bullet.damage, owner ?? null);
      createExplosion(world, bullet.x, bullet.y, bullet.team, 'player-hit');
      hit = true;
      break;
    }

    if (
      hit ||
      bullet.life <= 0 ||
      bullet.x < -20 ||
      bullet.y < -20 ||
      bullet.x > world.width + 20 ||
      bullet.y > world.height + 20
    ) {
      world.bullets.splice(index, 1);
    }
  }
}

export function updateRespawns(world: WordWarsWorld, dt: number): void {
  for (const actor of world.actors.values()) {
    if (actor.alive) continue;
    actor.respawnTimer -= dt;
    if (actor.respawnTimer > 0) continue;
    const spawn = spawnFor(actor.team, actor.multiplayerSlotId);
    actor.x = spawn.x;
    actor.y = spawn.y;
    actor.prevX = spawn.x;
    actor.prevY = spawn.y;
    actor.vx = 0;
    actor.vy = 0;
    actor.health = actor.maxHealth;
    actor.alive = true;
    actor.inv = null;
  }
}

function tryPickup(world: WordWarsWorld, actor: ActorState): void {
  const thresholdSquared = PICKUP_RADIUS * PICKUP_RADIUS;
  const item = world.items.find(candidate =>
    candidate.ownerSlotId == null &&
    !candidate.respawnAt &&
    distanceSquared(actor.x, actor.y, candidate.x, candidate.y) <= thresholdSquared
  );
  if (!item) return;

  if (item.type === 'health') {
    actor.health = Math.min(actor.maxHealth, actor.health + 45);
    actor.stats.powerupsPicked += 1;
    hideForRespawn(world, item, 10);
    return;
  }
  if (item.type === 'speed') {
    actor.boost = Math.max(actor.boost, 7);
    actor.stats.powerupsPicked += 1;
    hideForRespawn(world, item, 12);
    return;
  }
  if (item.type === 'gun') {
    actor.weaponTier = Math.min(3, actor.weaponTier + 1);
    actor.stats.powerupsPicked += 1;
    hideForRespawn(world, item, 14);
    return;
  }

  actor.inv = {
    id: item.id,
    type: item.type,
    char: item.char,
    stolen: item.stolen,
    ignited: item.ignited,
    magnitude: item.magnitude,
  };
  item.ownerSlotId = actor.multiplayerSlotId;
  item.x = -10_000;
  item.y = -10_000;
  if (item.type === 'letter') {
    const missing = missingLetters(world, actor.team);
    if (item.char && missing.includes(item.char)) actor.stats.usefulLettersPicked += 1;
  }
  if (item.type === 'bomb') actor.stats.bombsPicked += 1;
  if (item.type === 'wall') actor.stats.bricksPicked += 1;
  if (item.type === 'intel') actor.stats.cluesCollected += 1;
  world.worldRevision += 1;
}

function tryDeposit(world: WordWarsWorld, actor: ActorState): void {
  if (actor.inv?.type !== 'letter' || !actor.inv.char) return;
  const base = actor.team === 'blue' ? BLUE_BASE : RED_BASE;
  const centerX = base.x + base.w / 2;
  const centerY = base.y + base.h / 2;
  if (distanceSquared(actor.x, actor.y, centerX, centerY) > DEPOSIT_RADIUS * DEPOSIT_RADIUS) return;

  const word = actor.team === 'blue' ? world.blueWord : world.redWord;
  const progress = actor.team === 'blue' ? world.blueProgress : world.redProgress;
  const index = word.split('').findIndex((char, slotIndex) => char === actor.inv?.char && progress[slotIndex] == null);
  const item = world.items.find(candidate => candidate.id === actor.inv?.id);

  actor.stats.lettersPlaced += 1;
  if (index >= 0) {
    progress[index] = actor.inv.char;
    actor.stats.correctLettersPlaced += 1;
    if (item) {
      item.ownerSlotId = null;
      item.respawnAt = Number.POSITIVE_INFINITY;
    }
  } else if (item) {
    item.ownerSlotId = null;
    item.x = randomRange(world, 360, world.width - 360);
    item.y = randomRange(world, 100, world.height - 100);
  }
  actor.inv = null;
  world.worldRevision += 1;

  if (progress.every(Boolean)) {
    world.finished = true;
    world.winnerTeam = actor.team;
    world.finishReason = `${actor.team.toUpperCase()} completed the word.`;
  }
}

function shoot(world: WordWarsWorld, actor: ActorState): void {
  if (actor.shootCooldown > 0) return;
  const facingLength = Math.hypot(actor.facingX, actor.facingY) || 1;
  const facingX = actor.facingX / facingLength;
  const facingY = actor.facingY / facingLength;
  const speedMultiplier = 1 + (actor.weaponTier - 1) * 0.08;
  const bullet: BulletState = {
    id: `bullet:${++world.eventCounter}`,
    x: actor.x + facingX * (actor.r + 7),
    y: actor.y + facingY * (actor.r + 7),
    prevX: actor.x,
    prevY: actor.y,
    vx: facingX * BULLET_SPEED * speedMultiplier,
    vy: facingY * BULLET_SPEED * speedMultiplier,
    r: 4 + actor.weaponTier,
    life: BULLET_LIFE_SECONDS,
    damage: BULLET_DAMAGE + (actor.weaponTier - 1) * 6,
    ownerSlotId: actor.multiplayerSlotId,
    team: actor.team,
  };
  world.bullets.push(bullet);
  actor.shootCooldown = SHOOT_COOLDOWN_SECONDS;
}

function damageActor(world: WordWarsWorld, target: ActorState, amount: number, attacker: ActorState | null): void {
  const before = target.health;
  target.health = Math.max(0, target.health - amount);
  target.damageFlash = 0.2;
  if (attacker) {
    attacker.stats.shotsHit += 1;
    attacker.stats.damageDealt += Math.min(before, amount);
  }
  if (target.health > 0) return;

  target.alive = false;
  target.respawnTimer = RESPAWN_SECONDS;
  target.vx = 0;
  target.vy = 0;
  if (attacker) attacker.stats.eliminations += 1;

  if (target.inv) {
    const item = world.items.find(candidate => candidate.id === target.inv?.id);
    if (item) {
      item.ownerSlotId = null;
      item.x = target.x;
      item.y = target.y;
      item.droppedBySlotId = target.multiplayerSlotId;
    }
    target.inv = null;
    world.worldRevision += 1;
  }
}

function hideForRespawn(world: WordWarsWorld, item: ItemState, seconds: number): void {
  item.x = -10_000;
  item.y = -10_000;
  item.ownerSlotId = null;
  item.respawnAt = world.simTime + seconds;
  world.worldRevision += 1;
}

function respawnItems(world: WordWarsWorld): void {
  for (const item of world.items) {
    if (!Number.isFinite(item.respawnAt) || (item.respawnAt ?? 0) > world.simTime) continue;
    item.respawnAt = undefined;
    item.x = randomRange(world, 330, world.width - 330);
    item.y = randomRange(world, 90, world.height - 90);
    world.worldRevision += 1;
  }
}

function createExplosion(world: WordWarsWorld, x: number, y: number, team: Team, kind: string): void {
  world.explosions.push({
    id: `fx:${++world.eventCounter}`,
    x,
    y,
    r: 5,
    a: 1,
    growRate: 120,
    time: 0.35,
    team,
    kind,
  });
}

function missingLetters(world: WordWarsWorld, team: Team): string[] {
  const word = team === 'blue' ? world.blueWord : world.redWord;
  const progress = team === 'blue' ? world.blueProgress : world.redProgress;
  const missing: string[] = [];
  for (let index = 0; index < word.length; index += 1) {
    if (!progress[index]) missing.push(word[index]!);
  }
  return missing;
}

function spawnFor(team: Team, slotId: string): { x: number; y: number } {
  const suffix = slotId.endsWith('1') ? -70 : slotId.endsWith('2') ? 70 : 0;
  return team === 'blue'
    ? { x: 120, y: 360 + suffix }
    : { x: 1160, y: 360 + suffix };
}
