import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export function requireBridgeSecret(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const expected = process.env.WORD_WARS_BRIDGE_SECRET;
  if (!expected || expected.length < 16) {
    response.status(503).json({
      ok: false,
      message: 'WORD_WARS_BRIDGE_SECRET is not configured securely.',
    });
    return;
  }

  const received = request.header('x-word-wars-bridge-secret') ?? '';
  if (!safeEqual(received, expected)) {
    response.status(401).json({ ok: false, message: 'Invalid bridge secret.' });
    return;
  }
  next();
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
