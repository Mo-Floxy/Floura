import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db, { createSettingsForUser } from '../db.js';
import { HttpError, parseBody, setAuthCookie, requireAuth, COOKIE_NAME } from '../middleware.js';
import { sendMail, mailConfigured } from '../utils/mail.js';
import { isValidISO } from '../utils/dates.js';

const router = Router();
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const newToken = () => crypto.randomBytes(24).toString('hex');
const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  dateOfBirth: user.date_of_birth,
  emailVerified: Boolean(user.email_verified),
  consentHealthData: Boolean(user.consent_health_data),
  createdAt: user.created_at,
});

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters.')
  .regex(/[A-Z]/, 'Password must include an uppercase letter.')
  .regex(/[a-z]/, 'Password must include a lowercase letter.')
  .regex(/[0-9]/, 'Password must include a number.');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name.').max(80),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address.'),
  password: passwordSchema,
  dateOfBirth: z.string().optional().nullable(),
  consent: z.boolean().refine((v) => v === true, 'Please agree to the health data consent to continue.'),
});

router.post('/register', async (req, res) => {
  const data = parseBody(registerSchema, req.body);
  if (data.dateOfBirth && !isValidISO(data.dateOfBirth)) throw new HttpError(400, 'Date of birth must be a valid date.');
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(data.email)) {
    throw new HttpError(409, 'An account with this email already exists.');
  }
  const passwordHash = await bcrypt.hash(data.password, 12);
  const token = newToken();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const result = db.prepare(`
    INSERT INTO users (email, name, password_hash, date_of_birth, consent_health_data, verify_token_hash, verify_expires)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(data.email, data.name, passwordHash, data.dateOfBirth || null, 1, hashToken(token), expires);
  createSettingsForUser(result.lastInsertRowid);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);

  const verifyLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
  const { sent, reason } = await sendMail({
    to: data.email,
    subject: 'Welcome to FLOURA — verify your email',
    text: `Hi ${data.name}, welcome to FLOURA. Verify your email: ${verifyLink}\nThis link expires in 24 hours.`,
    html: `<div style="font-family:sans-serif;padding:32px;color:#3A2E38"><h1 style="color:#7B4B6B">Welcome to FLOURA</h1><p>Hi ${data.name}, please verify your email address to activate your private health space.</p><p><a href="${verifyLink}" style="background:#7B4B6B;color:white;padding:12px 22px;border-radius:10px;text-decoration:none;display:inline-block">Verify my email</a></p><p style="color:#8B7B88;font-size:12px">This link expires in 24 hours. If you did not create this account, ignore this email.</p></div>`,
  });

  setAuthCookie(res, user);
  res.status(201).json({
    user: publicUser(user),
    message: sent ? 'Account created. Check your inbox to verify your email.' : 'Account created.',
    ...(!mailConfigured || !sent ? { devToken: token, mailReason: reason } : {}),
  });
});

const verifySchema = z.object({ token: z.string().min(10) });
export function verifyToken(token) {
  const user = db.prepare('SELECT * FROM users WHERE verify_token_hash = ?').get(hashToken(token));
  if (!user) throw new HttpError(400, 'This verification link is invalid or has already been used.');
  if (new Date(user.verify_expires) < new Date()) throw new HttpError(400, 'This verification link has expired. Request a new one.');
  db.prepare(`UPDATE users SET email_verified = 1, verify_token_hash = NULL, verify_expires = NULL, updated_at = datetime('now') WHERE id = ?`).run(user.id);
  return publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id));
}

router.post('/verify-email', (req, res) => {
  const { token } = parseBody(verifySchema, req.body);
  res.json({ user: verifyToken(token), message: 'Your email is verified. Welcome to FLOURA!' });
});

router.post('/resend-verification', requireAuth, async (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (user.email_verified) throw new HttpError(400, 'Your email is already verified.');
  const token = newToken();
  db.prepare('UPDATE users SET verify_token_hash = ?, verify_expires = ? WHERE id = ?')
    .run(hashToken(token), new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), user.id);
  const link = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
  const { sent } = await sendMail({ to: user.email, subject: 'Verify your FLOURA email', text: `Verify your email: ${link}` });
  res.json({ message: sent ? 'A new verification link is on its way.' : 'A new verification link has been created.', ...(!sent ? { devToken: token } : {}) });
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Please enter your password.'),
});

router.post('/login', async (req, res) => {
  const data = parseBody(loginSchema, req.body);
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(data.email);
  if (!user || !(await bcrypt.compare(data.password, user.password_hash))) {
    throw new HttpError(401, 'Incorrect email or password.');
  }
  setAuthCookie(res, user);
  res.json({ user: publicUser(user), message: `Welcome back, ${user.name.split(' ')[0]}!` });
});

router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ message: 'You have been signed out.' });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email('Please enter a valid email address.') });
router.post('/forgot-password', async (req, res) => {
  const { email } = parseBody(forgotSchema, req.body);
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    // Do not disclose whether an account exists.
    return res.json({ message: 'If an account exists for that email, a reset link has been created.' });
  }
  const token = newToken();
  db.prepare('UPDATE users SET reset_token_hash = ?, reset_expires = ? WHERE id = ?')
    .run(hashToken(token), new Date(Date.now() + 60 * 60 * 1000).toISOString(), user.id);
  const link = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
  const { sent } = await sendMail({
    to: email,
    subject: 'Reset your FLOURA password',
    text: `Reset your password: ${link}\nThis link expires in 1 hour. If you did not request this, ignore this email.`,
  });
  res.json({
    message: sent ? 'If an account exists for that email, a reset link has been sent.' : 'A reset link has been created.',
    ...(!sent ? { devToken: token } : {}),
  });
});

const resetSchema = z.object({ token: z.string().min(10), password: passwordSchema });
router.post('/reset-password', async (req, res) => {
  const { token, password } = parseBody(resetSchema, req.body);
  const user = db.prepare('SELECT * FROM users WHERE reset_token_hash = ?').get(hashToken(token));
  if (!user || new Date(user.reset_expires) < new Date()) {
    throw new HttpError(400, 'This reset link is invalid or has expired. Please request a new one.');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  db.prepare(`UPDATE users SET password_hash = ?, reset_token_hash = NULL, reset_expires = NULL, updated_at = datetime('now') WHERE id = ?`)
    .run(passwordHash, user.id);
  res.json({ message: 'Your password has been reset. You can now sign in.' });
});

export default router;
