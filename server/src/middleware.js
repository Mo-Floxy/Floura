import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';
import { ZodError } from 'zod';
import { db } from './db.js';

const secretPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', '.jwt-secret');
function loadSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  try {
    fs.mkdirSync(path.dirname(secretPath), { recursive: true });
    if (!fs.existsSync(secretPath)) fs.writeFileSync(secretPath, crypto.randomUUID() + crypto.randomUUID(), { mode: 0o600 });
    return fs.readFileSync(secretPath, 'utf8').trim();
  } catch {
    return 'floura-development-secret-change-me';
  }
}
const JWT_SECRET = loadSecret();
export const COOKIE_NAME = 'floura_token';
const SESSION_DAYS = 30;

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: `${SESSION_DAYS}d` });
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.HTTPS === 'true',
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

export function setAuthCookie(res, user) {
  res.cookie(COOKIE_NAME, signToken(user), cookieOptions());
}

export function requireAuth(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next(new HttpError(401, 'Please sign in to continue.'));
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, email, name, date_of_birth, email_verified, consent_health_data, created_at FROM users WHERE id = ?').get(payload.id);
    if (!user) return next(new HttpError(401, 'Your session is no longer valid. Please sign in again.'));
    req.user = user;
    next();
  } catch {
    next(new HttpError(401, 'Your session has expired. Please sign in again.'));
  }
}

export function parseBody(schema, data) {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const first = error.issues[0];
      throw new HttpError(400, first?.message || 'Invalid input.');
    }
    throw error;
  }
}

export function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function errorHandler(err, _req, res, _next) {
  const status = err.status || (err.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 409 : 500);
  if (status >= 500) console.error('[floura:error]', err);
  const message = status >= 500 ? 'Something went wrong. Please try again.' : err.message;
  res.status(status).json({ error: message });
}
