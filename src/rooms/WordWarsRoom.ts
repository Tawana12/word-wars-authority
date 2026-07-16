import { Room } from '@colyseus/core';
import { IDLE_ROOM_MS, SNAPSHOT_INTERVAL_TICKS, TICK_RATE } from '../simulation/constants';
import { createWorld } from '../simulation/create-world';
import {
  applyPlayerInput,
  disconnectPlayer,
  registerPlayer,
} from '../simulation/players';
import { serializeWorld } from '../simulation/serialize';
import { tickWorld } from '../simulation/tick-world';
import type {
  AuthoritativeSnapshot,
  CreateWorldOptions,
  PlayerInput,
  RegisterPlayerRequest,
  WordWarsWorld,
} from '../simulation/types';

export interface WordWarsRoomOptions extends CreateWorldOptions {}

export interface SyncRequest {
  playerToken: string;
  input: PlayerInput | null;
  afterStateSequence: number;
  forceFullWorld?: boolean;
}

export interface SyncResponse {
  stateSequence: number;
  acknowledgedInputSequence: number;
  inputAccepted: boolean;
  snapshot: AuthoritativeSnapshot;
  shouldBroadcast: boolean;
}

export class WordWarsRoom extends Room {
  private world!: WordWarsWorld;
  private lastBroadcastSequence = -1;
  private tickCounter = 0;

  async onCreate(options: WordWarsRoomOptions): Promise<void> {
    if (!options?.roomKey) throw new Error('roomKey is required.');
    this.autoDispose = false;
    this.maxClients = 1;
    this.world = createWorld(options);
    await this.setMatchmaking({
      metadata: {
        roomKey: options.roomKey,
        createdAt: this.world.createdAt,
      },
      private: true,
      unlisted: true,
      maxClients: 1,
    });

    this.setSimulationInterval((deltaMilliseconds) => {
      const dt = Math.min(deltaMilliseconds / 1000, 1 / TICK_RATE);
      tickWorld(this.world, dt);
      this.tickCounter += 1;

      if (Date.now() - this.world.lastBridgeActivityAt > IDLE_ROOM_MS) {
        void this.disconnect();
      }
    }, 1000 / TICK_RATE);
  }

  registerPlayer(request: RegisterPlayerRequest): {
    ok: true;
    slotId: string;
    replacedToken: string | null;
    snapshot: AuthoritativeSnapshot;
  } {
    this.touch();
    const result = registerPlayer(this.world, request);
    return {
      ok: true,
      ...result,
      snapshot: serializeWorld(this.world, { forceFullWorld: true }),
    };
  }

  synchronize(request: SyncRequest): SyncResponse {
    this.touch();
    let acknowledgedInputSequence = 0;
    let inputAccepted = false;

    if (request.input) {
      const inputResult = applyPlayerInput(
        this.world,
        request.playerToken,
        request.input,
      );
      acknowledgedInputSequence = inputResult.acknowledgedInputSequence;
      inputAccepted = inputResult.accepted;
    }

    const snapshot = serializeWorld(this.world, {
      forceFullWorld: request.forceFullWorld,
      afterStateSequence: request.afterStateSequence,
    });

    const shouldBroadcast =
      snapshot.sequence - this.lastBroadcastSequence >= SNAPSHOT_INTERVAL_TICKS;
    if (shouldBroadcast) this.lastBroadcastSequence = snapshot.sequence;

    return {
      stateSequence: snapshot.sequence,
      acknowledgedInputSequence,
      inputAccepted,
      snapshot,
      shouldBroadcast,
    };
  }

  readState(afterStateSequence = -1): AuthoritativeSnapshot {
    this.touch();
    return serializeWorld(this.world, {
      forceFullWorld: true,
      afterStateSequence,
    });
  }

  disconnectPlayer(playerToken: string): {
    ok: true;
    changed: boolean;
    snapshot: AuthoritativeSnapshot;
  } {
    this.touch();
    const changed = disconnectPlayer(this.world, playerToken);
    return {
      ok: true,
      changed,
      snapshot: serializeWorld(this.world, { forceFullWorld: true }),
    };
  }

  finishRoom(reason = 'Match closed by Devvit.'): {
    ok: true;
    snapshot: AuthoritativeSnapshot;
  } {
    this.touch();
    this.world.finished = true;
    this.world.finishReason = reason;
    const snapshot = serializeWorld(this.world, { forceFullWorld: true });
    this.clock.setTimeout(() => {
      void this.disconnect();
    }, 1_000);
    return { ok: true, snapshot };
  }

  getDiagnostics(): Record<string, unknown> {
    const humans = [...this.world.actors.values()].filter(
      actor => actor.multiplayerHuman && actor.multiplayerConnected,
    ).length;
    return {
      roomId: this.roomId,
      roomKey: this.world.roomKey,
      stateSequence: this.world.stateSequence,
      simTime: this.world.simTime,
      humans,
      bots: this.world.actors.size - humans,
      actors: this.world.actors.size,
      items: this.world.items.length,
      bullets: this.world.bullets.length,
      finished: this.world.finished,
      idleMs: Date.now() - this.world.lastBridgeActivityAt,
    };
  }

  private touch(): void {
    this.world.lastBridgeActivityAt = Date.now();
  }
}
