import 'dotenv/config';
import { defineRoom, defineServer } from '@colyseus/core';
import express, { type Express } from 'express';
import { registerHttpRoutes } from './http/routes';
import { WordWarsRoom } from './rooms/WordWarsRoom';

const port = Number.parseInt(process.env.PORT ?? '2567', 10) || 2567;

const server = defineServer({
  rooms: {
    word_wars: defineRoom(WordWarsRoom).filterBy(['roomKey']),
  },
  express: (app: Express) => {
    app.use(express.json({ limit: '256kb' }));
    registerHttpRoutes(app);
  },
});

void server.listen(port).then(() => {
  console.log(`[Word Wars Authority] listening on port ${port}`);
});
