import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db, { getSettings } from '../db.js';
import { HttpError, parseBody, requireAuth } from '../middleware.js';
import { isValidISO } from '../utils/dates.js';

const router = Router();
router.use(requireAuth);

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  dateOfBirth: user.date_of_birth,
  emailVerified: Boolean(user.email_verified),
  consentHealthData: Boolean(user.consent_health_data),
  createdAt: user.created_at,
});

const shapeSettings = (s) => ({
  cycleLength: s.cycle_length,
  periodDuration: s.period_duration,
  useManualCycleLength: Boolean(s.use_manual_cycle_length),
  theme: s.theme,
  waterGoal: s.water_goal,
  reminderPeriod: Boolean(s.reminder_period),
  reminderOvulation: Boolean(s.reminder_ovulation),
  reminderFertile: Boolean(s.reminder_fertile),
  reminderMedication: Boolean(s.reminder_medication),
  reminderWater: Boolean(s.reminder_water),
  reminderLog: Boolean(s.reminder_log),
  reminderTime: s.reminder_time,
  reminderDaysBefore: s.reminder_days_before,
  medicationName: s.medication_name,
  sensitiveNotifications: Boolean(s.sensitive_notifications),
  browserNotifications: Boolean(s.browser_notifications),
  profileVisible: Boolean(s.profile_visible),
  researchOptIn: Boolean(s.research_opt_in),
});

router.get('/profile', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user), settings: shapeSettings(getSettings(req.user.id)) });
});

router.patch('/profile', (req, res) => {
  const data = parseBody(z.object({
    name: z.string().trim().min(2, 'Please enter your name.').max(80).optional(),
    dateOfBirth: z.string().nullable().optional(),
  }), req.body);
  if (data.dateOfBirth && !isValidISO(data.dateOfBirth)) throw new HttpError(400, 'Date of birth must be a valid date.');
  const current = db.prepare('SELECT date_of_birth FROM users WHERE id = ?').get(req.user.id);
  const dob = data.dateOfBirth === undefined ? current.date_of_birth : (data.dateOfBirth || null);
  db.prepare(`UPDATE users SET name = COALESCE(?, name), date_of_birth = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(data.name || null, dob, req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user), message: 'Profile updated.' });
});

const cycleSettingsSchema = z.object({
  cycleLength: z.number().int().min(15).max(90).optional(),
  periodDuration: z.number().int().min(1).max(15).optional(),
  useManualCycleLength: z.boolean().optional(),
  waterGoal: z.number().int().min(1).max(30).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
});
router.patch('/cycle-settings', (req, res) => {
  const data = parseBody(cycleSettingsSchema, req.body);
  const current = getSettings(req.user.id);
  db.prepare(`UPDATE settings SET
    cycle_length = ?, period_duration = ?, use_manual_cycle_length = ?, water_goal = ?, theme = ?, updated_at = datetime('now')
    WHERE user_id = ?`).run(
    data.cycleLength ?? current.cycle_length,
    data.periodDuration ?? current.period_duration,
    data.useManualCycleLength === undefined ? current.use_manual_cycle_length : Number(data.useManualCycleLength),
    data.waterGoal ?? current.water_goal,
    data.theme ?? current.theme,
    req.user.id,
  );
  res.json({ settings: shapeSettings(getSettings(req.user.id)), message: 'Preferences saved.' });
});

router.post('/change-password', async (req, res) => {
  const data = parseBody(z.object({
    currentPassword: z.string().min(1, 'Please enter your current password.'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters.')
      .regex(/[A-Z]/, 'Password must include an uppercase letter.')
      .regex(/[a-z]/, 'Password must include a lowercase letter.')
      .regex(/[0-9]/, 'Password must include a number.'),
  }), req.body);
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!(await bcrypt.compare(data.currentPassword, user.password_hash))) throw new HttpError(400, 'Your current password is incorrect.');
  const hash = await bcrypt.hash(data.newPassword, 12);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hash, req.user.id);
  res.json({ message: 'Your password has been changed.' });
});

const privacySchema = z.object({
  sensitiveNotifications: z.boolean().optional(),
  browserNotifications: z.boolean().optional(),
  profileVisible: z.boolean().optional(),
  researchOptIn: z.boolean().optional(),
  consentHealthData: z.boolean().optional(),
});
router.patch('/privacy', (req, res) => {
  const data = parseBody(privacySchema, req.body);
  const keys = {
    sensitiveNotifications: 'sensitive_notifications',
    browserNotifications: 'browser_notifications',
    profileVisible: 'profile_visible',
    researchOptIn: 'research_opt_in',
  };
  for (const [field, column] of Object.entries(keys)) {
    if (data[field] !== undefined) db.prepare(`UPDATE settings SET ${column} = ?, updated_at = datetime('now') WHERE user_id = ?`).run(Number(data[field]), req.user.id);
  }
  if (data.consentHealthData !== undefined) {
    db.prepare('UPDATE users SET consent_health_data = ?, updated_at = datetime(\'now\') WHERE id = ?').run(Number(data.consentHealthData), req.user.id);
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user), settings: shapeSettings(getSettings(req.user.id)), message: 'Privacy preferences saved.' });
});

router.get('/export', (req, res) => {
  const uid = req.user.id;
  const user = db.prepare('SELECT id, email, name, date_of_birth, email_verified, consent_health_data, created_at FROM users WHERE id = ?').get(uid);
  const tables = ['periods', 'symptoms', 'moods', 'water_logs', 'sleep_logs', 'exercise_logs', 'nutrition_logs', 'daily_logs', 'reminders', 'notifications'];
  const payload = {
    exportedAt: new Date().toISOString(),
    notice: 'This file contains sensitive health information. Store it securely and do not share it.',
    user,
    settings: shapeSettings(getSettings(uid)),
  };
  const orderColumn = { water_logs: 'date', nutrition_logs: 'date' };
  for (const table of tables) {
    payload[table] = db.prepare(`SELECT * FROM ${table} WHERE user_id = ? ORDER BY ${orderColumn[table] || 'id'}`).all(uid);
  }
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="floura-my-data-${new Date().toISOString().slice(0, 10)}.json"`);
  res.send(JSON.stringify(payload, null, 2));
});

router.delete('/account', async (req, res) => {
  const data = parseBody(z.object({ password: z.string().min(1, 'Please enter your password to confirm.') }), req.body);
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!(await bcrypt.compare(data.password, user.password_hash))) throw new HttpError(400, 'Incorrect password. Account was not deleted.');
  db.transaction(() => {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
  })();
  res.clearCookie('floura_token', { path: '/' });
  res.json({ message: 'Your account and all associated health data have been permanently deleted.' });
});

export default router;
