import type { Express, NextFunction, Request, Response } from 'express';
import { matchMaker } from '@colyseus/core';
import { asyncRoute } from './async-route';
import { requireBridgeSecret } from './bridge-auth';
import {
  optionalNumber,
  parsePlayerInput,
  parseRegisterPlayer,
  requireObject,
  requireString,
} from '../simulation/validation';
import type { SyncResponse } from '../rooms/WordWarsRoom';

const ROOM_NAME = 'word_wars';

export function registerHttpRoutes(app: Express): void {
  app.get('/health', (_request: Request, response: Response) => {
    response.json({
      ok: true,
      service: 'word-wars-authority',
      version: '1.0.0',
      now: Date.now(),
      rooms: matchMaker.stats.local.roomCount,
    });
  });

  app.use('/bridge', requireBridgeSecret);

  app.post('/bridge/rooms/create', asyncRoute(async (request, response) => {
    const body = requireObject(request.body);
    const roomKey = requireString(body.roomKey, 'roomKey', 128);
    const existing = await matchMaker.query({ name: ROOM_NAME, roomKey });
    if (existing[0]) {
      const snapshot = await matchMaker.remoteRoomCall(
        existing[0].roomId,
        'readState',
        [-1],
      );
      response.json({
        ok: true,
        created: false,
        authorityRoomId: existing[0].roomId,
        snapshot,
      });
      return;
    }

    const room = await matchMaker.createRoom(ROOM_NAME, {
      roomKey,
      seed: optionalNumber(body.seed, Date.now(), 1, Number.MAX_SAFE_INTEGER),
      word: typeof body.word === 'string' ? body.word : undefined,
      blueWord: typeof body.blueWord === 'string' ? body.blueWord : undefined,
      redWord: typeof body.redWord === 'string' ? body.redWord : undefined,
      roundDurationSeconds: optionalNumber(body.roundDurationSeconds, 180, 30, 900),
    });
    const snapshot = await matchMaker.remoteRoomCall(room.roomId, 'readState', [-1]);
    response.status(201).json({
      ok: true,
      created: true,
      authorityRoomId: room.roomId,
      snapshot,
    });
  }));

  app.post('/bridge/rooms/player', asyncRoute(async (request, response) => {
    const body = requireObject(request.body);
    const authorityRoomId = requireString(body.authorityRoomId, 'authorityRoomId', 128);
    const player = parseRegisterPlayer(body.player);
    const result = await matchMaker.remoteRoomCall(
      authorityRoomId,
      'registerPlayer',
      [player],
    );
    response.json(result);
  }));

  app.post('/bridge/rooms/sync', asyncRoute(async (request, response) => {
    const body = requireObject(request.body);
    const authorityRoomId = requireString(body.authorityRoomId, 'authorityRoomId', 128);
    const playerToken = requireString(body.playerToken, 'playerToken', 128);
    const afterStateSequence = Math.floor(
      optionalNumber(body.afterStateSequence, -1, -1, Number.MAX_SAFE_INTEGER),
    );
    const input = body.input == null ? null : parsePlayerInput(body.input);
    const result = await matchMaker.remoteRoomCall(
      authorityRoomId,
      'synchronize',
      [{
        playerToken,
        input,
        afterStateSequence,
        forceFullWorld: Boolean(body.forceFullWorld),
      }],
    ) as SyncResponse;
    response.json({ ok: true, ...result });
  }));

  app.post('/bridge/rooms/state', asyncRoute(async (request, response) => {
    const body = requireObject(request.body);
    const authorityRoomId = requireString(body.authorityRoomId, 'authorityRoomId', 128);
    const afterStateSequence = Math.floor(
      optionalNumber(body.afterStateSequence, -1, -1, Number.MAX_SAFE_INTEGER),
    );
    const snapshot = await matchMaker.remoteRoomCall(
      authorityRoomId,
      'readState',
      [afterStateSequence],
    );
    response.json({ ok: true, snapshot });
  }));

  app.post('/bridge/rooms/leave', asyncRoute(async (request, response) => {
    const body = requireObject(request.body);
    const authorityRoomId = requireString(body.authorityRoomId, 'authorityRoomId', 128);
    const playerToken = requireString(body.playerToken, 'playerToken', 128);
    const result = await matchMaker.remoteRoomCall(
      authorityRoomId,
      'disconnectPlayer',
      [playerToken],
    );
    response.json(result);
  }));

  app.post('/bridge/rooms/finish', asyncRoute(async (request, response) => {
    const body = requireObject(request.body);
    const authorityRoomId = requireString(body.authorityRoomId, 'authorityRoomId', 128);
    const reason = typeof body.reason === 'string'
      ? body.reason.slice(0, 160)
      : 'Match closed by Devvit.';
    const result = await matchMaker.remoteRoomCall(
      authorityRoomId,
      'finishRoom',
      [reason],
    );
    response.json(result);
  }));

  app.post('/bridge/rooms/diagnostics', asyncRoute(async (request, response) => {
    const body = requireObject(request.body);
    const authorityRoomId = requireString(body.authorityRoomId, 'authorityRoomId', 128);
    const diagnostics = await matchMaker.remoteRoomCall(
      authorityRoomId,
      'getDiagnostics',
    );
    response.json({ ok: true, diagnostics });
  }));

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    const isClientError = /required|must be|invalid|unknown|match/i.test(message);
    console.error('[HTTP]', error);
    response.status(isClientError ? 400 : 500).json({ ok: false, message });
  });
}
