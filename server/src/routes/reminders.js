import { Router } from 'express';
import { z } from 'zod';
import db, { getSettings } from '../db.js';
import { HttpError, parseBody, requireAuth } from '../middleware.js';
import { buildPredictions } from '../utils/predictions.js';
import { todayISO, diffDays } from '../utils/dates.js';

const router = Router();
router.use(requireAuth);

const TYPES = ['period', 'ovulation', 'fertile', 'medication', 'water', 'log'];
const settingColumn = {
  period: 'reminder_period', ovulation: 'reminder_ovulation', fertile: 'reminder_fertile',
  medication: 'reminder_medication', water: 'reminder_water', log: 'reminder_log',
};

const getReminders = (uid) => db.prepare('SELECT id, type, enabled, time, days_before, label FROM reminders WHERE user_id = ? ORDER BY id').all(uid);
const getNotifications = (uid) => db.prepare('SELECT id, type, title, body, sensitive, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 50').all(uid);

router.get('/', (req, res) => {
  const settings = getSettings(req.user.id);
  res.json({
    reminders: getReminders(req.user.id),
    settings: {
      reminderTime: settings.reminder_time,
      reminderDaysBefore: settings.reminder_days_before,
      medicationName: settings.medication_name,
      sensitiveNotifications: Boolean(settings.sensitive_notifications),
      browserNotifications: Boolean(settings.browser_notifications),
    },
    notifications: getNotifications(req.user.id),
  });
});

router.patch('/:type', (req, res) => {
  const { type } = req.params;
  if (!TYPES.includes(type)) throw new HttpError(404, 'Reminder type not found.');
  const data = parseBody(z.object({
    enabled: z.boolean().optional(),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Please choose a valid time.').optional(),
    daysBefore: z.number().int().min(0).max(14).optional(),
    label: z.string().max(80).optional().nullable(),
  }), req.body);
  const current = db.prepare('SELECT * FROM reminders WHERE user_id = ? AND type = ?').get(req.user.id, type);
  if (!current) throw new HttpError(404, 'Reminder configuration not found.');
  db.prepare('UPDATE reminders SET enabled = ?, time = ?, days_before = ?, label = ? WHERE id = ?').run(
    data.enabled === undefined ? current.enabled : Number(data.enabled),
    data.time || current.time,
    data.daysBefore ?? current.days_before,
    data.label === undefined ? current.label : data.label,
    current.id,
  );
  if (data.enabled !== undefined) {
    db.prepare(`UPDATE settings SET ${settingColumn[type]} = ?, updated_at = datetime('now') WHERE user_id = ?`).run(Number(data.enabled), req.user.id);
  }
  if (data.time) db.prepare("UPDATE settings SET reminder_time = ?, updated_at = datetime('now') WHERE user_id = ?").run(data.time, req.user.id);
  if (data.daysBefore !== undefined) db.prepare("UPDATE settings SET reminder_days_before = ?, updated_at = datetime('now') WHERE user_id = ?").run(data.daysBefore, req.user.id);
  if (type === 'medication' && data.label !== undefined) {
    db.prepare("UPDATE settings SET medication_name = ?, updated_at = datetime('now') WHERE user_id = ?").run(data.label || '', req.user.id);
  }
  res.json({ message: 'Reminder preferences saved.', reminders: getReminders(req.user.id) });
});

/** Regenerate today's in-app reminders from current predictions and consent settings. */
router.post('/refresh', (req, res) => {
  const uid = req.user.id;
  const settings = getSettings(uid);
  const reminders = getReminders(uid);
  const periods = db.prepare('SELECT * FROM periods WHERE user_id = ? ORDER BY start_date').all(uid);
  const predictions = buildPredictions(periods, settings, todayISO());
  const sensitive = Boolean(settings.sensitive_notifications);
  const events = [];

  const enabled = (type) => reminders.find((r) => r.type === type)?.enabled === 1;
  const daysTo = (date) => date ? diffDays(todayISO(), date) : null;

  if (enabled('period') && predictions.nextPeriod) {
    const days = daysTo(predictions.nextPeriod);
    if (days !== null && days >= 0 && days <= (settings.reminder_days_before || 2)) {
      events.push({ type: 'period', title: 'Period check-in', body: sensitive ? `Your period is estimated in ${days} day${days === 1 ? '' : 's'}.` : 'A gentle check-in: your next cycle may be approaching.', sensitive });
    }
  }
  if (enabled('ovulation') && predictions.ovulation) {
    const days = daysTo(predictions.ovulation);
    if (days !== null && days >= 0 && days <= 1) {
      events.push({ type: 'ovulation', title: 'Cycle insight', body: sensitive ? 'Your estimated ovulation day is near.' : 'A gentle check-in: a new cycle phase may be beginning.', sensitive });
    }
  }
  if (enabled('fertile') && predictions.fertileStart) {
    const days = daysTo(predictions.fertileStart);
    if (days !== null && days >= 0 && days <= 1) {
      events.push({ type: 'fertile', title: 'Cycle insight', body: sensitive ? 'Your fertile window may begin soon.' : 'A gentle check-in: your cycle is changing.', sensitive });
    }
  }
  if (enabled('medication')) {
    const label = settings.medication_name?.trim();
    events.push({ type: 'medication', title: 'Medication reminder', body: sensitive && label ? `Time for ${label}.` : 'A reminder from your daily routine.', sensitive });
  }
  if (enabled('water')) events.push({ type: 'water', title: 'Hydration reminder', body: 'A gentle reminder to drink a glass of water.', sensitive: false });
  if (enabled('log')) events.push({ type: 'log', title: 'Daily check-in', body: 'Take a moment to log how you feel today.', sensitive: false });

  const insert = db.prepare('INSERT INTO notifications (user_id, type, title, body, sensitive) VALUES (?, ?, ?, ?, ?)');
  let created = 0;
  for (const event of events) {
    const exists = db.prepare("SELECT id FROM notifications WHERE user_id = ? AND type = ? AND substr(created_at, 1, 10) = date('now')").get(uid, event.type);
    if (!exists) {
      insert.run(uid, event.type, event.title, event.body, Number(event.sensitive || false));
      created += 1;
    }
  }
  res.json({ message: created ? `${created} new reminder${created === 1 ? '' : 's'} added.` : 'You are all caught up.', notifications: getNotifications(uid) });
});

router.patch('/notifications/:id/read', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user.id);
  res.json({ message: 'Marked as read.' });
});

router.post('/notifications/read-all', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ message: 'All notifications marked as read.' });
});

router.delete('/notifications/:id', (req, res) => {
  db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user.id);
  res.json({ message: 'Notification removed.' });
});

export default router;
