# Word Wars Authority Server

This folder is a standalone, in-memory Colyseus 0.17 server for Word Wars multiplayer.

It gives the match one authoritative world instead of making one player's browser act as the host. Desktop and mobile clients send controls through Devvit, this server advances the shared world at a fixed tick rate, and Devvit Realtime distributes the returned snapshots.

## What is already implemented

- One authoritative room per Word Wars match
- Fixed 20 Hz server simulation
- Ten stable role slots, five per team
- Anonymous human registration by token
- Empty slots controlled by bots
- Automatic bot takeover after a human stops sending input
- Reconnection into the same slot
- Sequence-checked player input
- Server-owned movement and obstacle collision
- Server-owned letter pickup and deposit
- Server-owned bullets, damage and respawning
- Server-owned walls, timer, winner and round state
- Snapshots shaped to resemble the existing `game-snapshot` format
- Shared-secret protection on every bridge endpoint
- No user accounts and no database
- Automatic disposal of abandoned rooms

## Important scope note

This is a complete runnable authoritative **core**, but it is not yet an exact port of every custom rule in your current browser game. Your current project has additional mechanics such as its exact maze layouts, bomb behavior, stealing rules, guardian zones, brick wear, clue cards and role-specific interactions. Those must be moved into `src/simulation/` one by one if you want the dedicated server to reproduce them perfectly.

Do not keep those outcomes authoritative in both the browser and this server. During multiplayer, the server must eventually be the only code deciding pickups, damage, bombs, walls, scoring and the winner.

Solo mode can continue using the existing browser engine unchanged.

## Folder structure

```text
colyseus-server/
├── src/
│   ├── main.ts
│   ├── smoke.ts
│   ├── http/
│   │   ├── async-route.ts
│   │   ├── bridge-auth.ts
│   │   └── routes.ts
│   ├── rooms/
│   │   └── WordWarsRoom.ts
│   └── simulation/
│       ├── actions.ts
│       ├── bots.ts
│       ├── collisions.ts
│       ├── constants.ts
│       ├── create-world.ts
│       ├── movement.ts
│       ├── players.ts
│       ├── random.ts
│       ├── serialize.ts
│       ├── stats.ts
│       ├── tick-world.ts
│       ├── types.ts
│       └── validation.ts
├── integration/
│   ├── devvit-authority-service.example.ts
│   └── shared-authority-types.example.ts
├── .env.example
├── Dockerfile
├── package.json
├── render.yaml
└── tsconfig.json
```

## 1. Install

Use Node 20 LTS. The project uses `@colyseus/core` with the standard `ws` transport rather than the optional uWebSockets transport, avoiding the Git-based uWebSockets dependency.

```bash
cd colyseus-server
cp .env.example .env
npm install
```

Generate a long secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put it in `.env`:

```env
WORD_WARS_BRIDGE_SECRET=your-generated-secret
```

## 2. Validate locally

```bash
npm run type-check
npm run smoke
npm run build
```

Start the server:

```bash
npm run dev
```

Health check:

```bash
curl http://localhost:2567/health
```

Expected shape:

```json
{
  "ok": true,
  "service": "word-wars-authority"
}
```

## 3. Test the HTTP bridge

Set a shell variable:

```bash
export WW_SECRET='the-same-secret-from-env'
```

Create a room:

```bash
curl -X POST http://localhost:2567/bridge/rooms/create \
  -H 'content-type: application/json' \
  -H "x-word-wars-bridge-secret: $WW_SECRET" \
  -d '{"roomKey":"devvit-room-1","word":"TEAMWORK"}'
```

Copy the returned `authorityRoomId`, then register a player:

```bash
curl -X POST http://localhost:2567/bridge/rooms/player \
  -H 'content-type: application/json' \
  -H "x-word-wars-bridge-secret: $WW_SECRET" \
  -d '{
    "authorityRoomId":"REPLACE_ROOM_ID",
    "player":{
      "playerToken":"anonymous-token-a",
      "slotId":"blue-runner-1",
      "team":"blue",
      "role":"RUNNER",
      "nickname":"BlueFox"
    }
  }'
```

Send input and receive the newest authoritative snapshot:

```bash
curl -X POST http://localhost:2567/bridge/rooms/sync \
  -H 'content-type: application/json' \
  -H "x-word-wars-bridge-secret: $WW_SECRET" \
  -d '{
    "authorityRoomId":"REPLACE_ROOM_ID",
    "playerToken":"anonymous-token-a",
    "afterStateSequence":-1,
    "input":{
      "slotId":"blue-runner-1",
      "x":1,
      "y":0,
      "facingX":1,
      "facingY":0,
      "actionHeld":false,
      "actionSequence":0,
      "inputSequence":1
    }
  }'
```

## Bridge endpoints

All `/bridge/*` endpoints require:

```text
x-word-wars-bridge-secret: YOUR_SECRET
```

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Deployment health check |
| `POST` | `/bridge/rooms/create` | Create or find one authority room |
| `POST` | `/bridge/rooms/player` | Assign an anonymous human to a slot |
| `POST` | `/bridge/rooms/sync` | Submit latest input and read current world |
| `POST` | `/bridge/rooms/state` | Request a full current snapshot |
| `POST` | `/bridge/rooms/leave` | Turn a disconnected human's actor back into a bot |
| `POST` | `/bridge/rooms/finish` | Finish and dispose a room |
| `POST` | `/bridge/rooms/diagnostics` | Inspect room state during development |

## 4. Deploy

### Render

This folder includes `render.yaml` and a Dockerfile.

1. Push the folder to GitHub.
2. Create a Render Blueprint or Web Service.
3. Set `WORD_WARS_BRIDGE_SECRET` to the same long secret used by Devvit.
4. Keep the service at **one instance** while you are using no database or Redis.
5. Use `/health` as the health-check route.

### Railway or another Node host

Build command:

```bash
npm install && npm run build
```

Start command:

```bash
npm start
```

Required variable:

```text
WORD_WARS_BRIDGE_SECRET
```

Optional variables:

```text
PORT
WORD_WARS_TICK_RATE=20
WORD_WARS_SNAPSHOT_RATE=10
WORD_WARS_IDLE_ROOM_MS=180000
```

### Why only one instance?

This version deliberately uses no database. Rooms exist only in the memory of the process that created them. Multiple server instances require shared Colyseus Presence and Driver services, normally Redis. Keep one always-running instance for the hackathon version.

A restart clears active matches. That is expected for this no-database version.

## 5. Connect Devvit

The browser should not call this host directly. Use this route:

```text
Word Wars iframe
→ Devvit `/api/multiplayer/sync`
→ this authority server over HTTPS
→ Devvit Realtime
→ all Word Wars iframes
```

Copy the patterns from `integration/` into the Devvit project.

### Devvit server changes

1. Add the authority hostname to the Devvit HTTP allow-list.
2. Store these as server-side secrets:

```text
WORD_WARS_AUTHORITY_URL=https://your-authority-host.example
WORD_WARS_AUTHORITY_SECRET=the-same-bridge-secret
```

3. When your existing Devvit lobby changes to `playing`:
   - Call `/bridge/rooms/create` once.
   - Save `authorityRoomId` in Redis beside the Devvit room ID.
   - Generate a random anonymous token for every connected Reddit user.
   - Save the user-ID-to-token mapping only in Devvit Redis.
   - Call `/bridge/rooms/player` for each human slot.

4. Add a Devvit route:

```text
POST /api/multiplayer/sync
```

That route must:
   - Resolve the anonymous player token server-side.
   - Read the room's `authorityRoomId` from Redis.
   - Forward only the latest input to `/bridge/rooms/sync`.
   - Publish `result.snapshot` through the existing Devvit Realtime channel when `result.shouldBroadcast` is true.
   - Return the same snapshot directly to the requesting client.

5. On leave, call `/bridge/rooms/leave`.
6. On match completion, call `/bridge/rooms/finish`.

Do not send the bridge secret, authority room ID mapping or anonymous user-token mapping to the iframe.

### Devvit client changes

`src/client/game.tsx` should:

- Stop accepting snapshots from a browser host.
- Never upload a client-created world snapshot.
- Store only the newest unsent input.
- Allow only one `/api/multiplayer/sync` request in flight.
- Repeat synchronization approximately every 100 ms while visible.
- Send sequence numbers, not client timestamps, for ordering.
- Forward the returned authoritative snapshot immediately to the iframe.
- Continue listening for the same snapshot over Devvit Realtime for other players.
- Ignore any snapshot with a sequence not greater than the last applied sequence.

`multiplayer-runtime.js` should:

- Remove host simulation and host migration.
- Remove `buildSnapshot()` and `sendSnapshotIfDue()`.
- Stop deciding multiplayer collisions, pickups, damage, bots and scoring locally.
- Predict only the local actor's movement between snapshots.
- Interpolate remote actors.
- Treat server snapshots as the source of truth.
- Keep Solo mode using the original game loop.

## 6. Anonymous identity rules

Only send an anonymous token and an optional game nickname to this server. Do not send a Reddit user ID, Reddit access token, email address or other account information.

Example authority payload:

```json
{
  "playerToken": "e45242b5-29cb-4f53-a1e5-32dc945ec70a",
  "slotId": "blue-runner-1",
  "team": "blue",
  "role": "RUNNER",
  "nickname": "BlueFox"
}
```

The Reddit username can remain in Devvit and be added to the visual label after the snapshot reaches the browser, keyed by `slotId`.

## 7. Migration order

Use this order so the two systems do not fight each other:

1. Server owns human positions and bot movement.
2. Server owns pickups and deposits.
3. Server owns bullets, damage and respawns.
4. Server owns bombs and walls.
5. Server owns all role abilities.
6. Server owns round completion and score.
7. Delete the corresponding browser-authoritative multiplayer code only after each server feature is working.

Keep a feature flag until the new authority passes two-device testing.

## 8. Two-device test

1. Open the Reddit post on desktop and mobile.
2. Confirm both Devvit users enter the same Devvit room.
3. Confirm the Devvit room points to one `authorityRoomId`.
4. Move continuously for ten seconds.
5. Make rapid 180-degree turns.
6. Stop suddenly.
7. Push against walls.
8. Pick up the same letter from both devices.
9. Fire at the same target.
10. Background the phone for ten seconds.
11. Confirm its slot becomes a bot.
12. Reopen it and confirm human control returns to the same actor.
13. Confirm neither device is labelled as host.
14. Check diagnostics and verify one shared `stateSequence` increases for the room.

## Known limitations of this supplied core

- It uses a simplified static obstacle layout.
- Bots are deliberately simple.
- It does not yet reproduce every browser-only Word Wars role mechanic.
- It sends JSON snapshots rather than Colyseus Schema patches because Devvit is using an HTTPS bridge rather than a direct Colyseus client connection.
- It is single-process and in-memory.

Those are migration tasks, not hidden failures. The central-world architecture is already present: one Colyseus room advances the match and every device reads that same room.
