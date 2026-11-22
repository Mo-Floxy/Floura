import { Router } from 'express';
import { z } from 'zod';
import db, { getSettings } from '../db.js';
import { HttpError, parseBody, requireAuth } from '../middleware.js';
import { isValidISO, todayISO, diffDays, addDays } from '../utils/dates.js';
import { buildPredictions } from '../utils/predictions.js';

const router = Router();
router.use(requireAuth);

const dateField = (msg = 'Please choose a valid date.') => z.string().refine(isValidISO, msg);
const severityEnum = z.enum(['mild', 'moderate', 'severe']);
export const MOODS = ['Happy', 'Sad', 'Anxious', 'Irritated', 'Calm', 'Energetic', 'Emotional', 'Stressed', 'Tired'];
const moodEnum = z.enum(MOODS);

function rangeFromQuery(query) {
  const to = isValidISO(query.to) ? query.to : todayISO();
  const from = isValidISO(query.from) ? query.from : addDays(to, -89);
  if (diffDays(from, to) < 0) throw new HttpError(400, 'Invalid date range.');
  if (diffDays(from, to) > 3660) throw new HttpError(400, 'Date range is too large.');
  return { from, to };
}

/* ---------------------------------- Daily overview --------------------------------- */

router.get('/day', (req, res) => {
  const date = isValidISO(req.query.date) ? req.query.date : todayISO();
  const uid = req.user.id;
  const symptoms = db.prepare('SELECT id, name, severity, notes FROM symptoms WHERE user_id = ? AND date = ? ORDER BY id').all(uid, date);
  const moods = db.prepare('SELECT id, mood, notes FROM moods WHERE user_id = ? AND date = ? ORDER BY id').all(uid, date);
  const water = db.prepare('SELECT glasses FROM water_logs WHERE user_id = ? AND date = ?').get(uid, date)?.glasses || 0;
  const sleep = db.prepare('SELECT hours, quality, notes FROM sleep_logs WHERE user_id = ? AND date = ?').get(uid, date) || null;
  const exercise = db.prepare('SELECT id, activity, minutes, notes FROM exercise_logs WHERE user_id = ? AND date = ? ORDER BY id').all(uid, date);
  const nutrition = db.prepare('SELECT food_notes, craving FROM nutrition_logs WHERE user_id = ? AND date = ?').get(uid, date) || null;
  const dailyNote = db.prepare('SELECT notes FROM daily_logs WHERE user_id = ? AND date = ?').get(uid, date)?.notes || '';
  const periods = db.prepare('SELECT * FROM periods WHERE user_id = ? AND start_date <= ? ORDER BY start_date DESC').all(uid, date);
  const predictions = buildPredictions(periods, getSettings(uid), date);
  res.json({
    date,
    symptoms,
    moods,
    water,
    waterGoal: getSettings(uid).water_goal,
    sleep,
    exercise,
    nutrition,
    dailyNote,
    cycleDay: predictions.cycleDay,
    phase: predictions.phase,
    isPeriodDay: periods.some((p) => date >= p.start_date && date <= (p.end_date || p.start_date)),
  });
});

/* ----------------------------------- Symptoms ----------------------------------- */

const symptomItem = z.object({
  name: z.string().trim().min(1).max(60),
  severity: severityEnum,
  notes: z.string().max(300).optional().nullable(),
});

router.get('/symptoms', (req, res) => {
  const { from, to } = rangeFromQuery(req.query);
  const rows = db.prepare('SELECT id, date, name, severity, notes FROM symptoms WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC, id').all(req.user.id, from, to);
  res.json({ symptoms: rows, from, to });
});

router.put('/symptoms', (req, res) => {
  const data = parseBody(z.object({
    date: dateField(),
    items: z.array(symptomItem).max(40),
  }), req.body);
  const replace = db.transaction(() => {
    db.prepare('DELETE FROM symptoms WHERE user_id = ? AND date = ?').run(req.user.id, data.date);
    const insert = db.prepare('INSERT INTO symptoms (user_id, date, name, severity, notes) VALUES (?, ?, ?, ?, ?)');
    for (const item of data.items) insert.run(req.user.id, data.date, item.name, item.severity, item.notes || null);
  });
  replace();
  res.json({ message: 'Symptoms saved for this day.', symptoms: db.prepare('SELECT id, name, severity, notes FROM symptoms WHERE user_id = ? AND date = ?').all(req.user.id, data.date) });
});

router.post('/symptoms', (req, res) => {
  const data = parseBody(symptomItem.extend({ date: dateField() }), req.body);
  db.prepare(`INSERT INTO symptoms (user_id, date, name, severity, notes) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, date, name) DO UPDATE SET severity = excluded.severity, notes = excluded.notes`)
    .run(req.user.id, data.date, data.name, data.severity, data.notes || null);
  res.status(201).json({ message: 'Symptom saved.' });
});

router.delete('/symptoms/:id', (req, res) => {
  const result = db.prepare('DELETE FROM symptoms WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user.id);
  if (!result.changes) throw new HttpError(404, 'Symptom entry not found.');
  res.json({ message: 'Symptom removed.' });
});

/* ------------------------------------- Moods ------------------------------------- */

router.get('/moods', (req, res) => {
  const { from, to } = rangeFromQuery(req.query);
  const moods = db.prepare('SELECT id, date, mood, notes FROM moods WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC, id').all(req.user.id, from, to);
  res.json({ moods, from, to });
});

router.put('/moods', (req, res) => {
  const data = parseBody(z.object({
    date: dateField(),
    moods: z.array(z.object({ mood: moodEnum, notes: z.string().max(500).optional().nullable() })).max(9),
  }), req.body);
  const replace = db.transaction(() => {
    db.prepare('DELETE FROM moods WHERE user_id = ? AND date = ?').run(req.user.id, data.date);
    const insert = db.prepare('INSERT INTO moods (user_id, date, mood, notes) VALUES (?, ?, ?, ?)');
    for (const item of data.moods) insert.run(req.user.id, data.date, item.mood, item.notes || null);
  });
  replace();
  res.json({ message: 'Mood saved for this day.' });
});

router.delete('/moods/:id', (req, res) => {
  const result = db.prepare('DELETE FROM moods WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user.id);
  if (!result.changes) throw new HttpError(404, 'Mood entry not found.');
  res.json({ message: 'Mood removed.' });
});

/* ------------------------------------- Water ------------------------------------- */

router.put('/water', (req, res) => {
  const data = parseBody(z.object({
    date: dateField(),
    glasses: z.number().int().min(0).max(40),
  }), req.body);
  db.prepare(`INSERT INTO water_logs (user_id, date, glasses, updated_at) VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, date) DO UPDATE SET glasses = excluded.glasses, updated_at = datetime('now')`)
    .run(req.user.id, data.date, data.glasses);
  res.json({ message: 'Water intake updated.', glasses: data.glasses });
});

/* -------------------------------------- Sleep ------------------------------------ */

router.get('/sleep', (req, res) => {
  const { from, to } = rangeFromQuery(req.query);
  const sleep = db.prepare('SELECT id, date, hours, quality, notes FROM sleep_logs WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC').all(req.user.id, from, to);
  res.json({ sleep, from, to });
});

router.put('/sleep', (req, res) => {
  const data = parseBody(z.object({
    date: dateField(),
    hours: z.number().min(0).max(24),
    quality: z.enum(['poor', 'fair', 'good', 'excellent']),
    notes: z.string().max(500).optional().nullable(),
  }), req.body);
  db.prepare(`INSERT INTO sleep_logs (user_id, date, hours, quality, notes) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET hours = excluded.hours, quality = excluded.quality, notes = excluded.notes`)
    .run(req.user.id, data.date, data.hours, data.quality, data.notes || null);
  res.json({ message: 'Sleep logged.' });
});

router.delete('/sleep/:id', (req, res) => {
  const result = db.prepare('DELETE FROM sleep_logs WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user.id);
  if (!result.changes) throw new HttpError(404, 'Sleep entry not found.');
  res.json({ message: 'Sleep entry removed.' });
});

/* ------------------------------------ Exercise ----------------------------------- */

router.get('/exercise', (req, res) => {
  const { from, to } = rangeFromQuery(req.query);
  const exercise = db.prepare('SELECT id, date, activity, minutes, notes FROM exercise_logs WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC').all(req.user.id, from, to);
  res.json({ exercise, from, to });
});

router.post('/exercise', (req, res) => {
  const data = parseBody(z.object({
    date: dateField(),
    activity: z.string().trim().min(1).max(60),
    minutes: z.number().int().min(1).max(1440),
    notes: z.string().max(300).optional().nullable(),
  }), req.body);
  const result = db.prepare('INSERT INTO exercise_logs (user_id, date, activity, minutes, notes) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.id, data.date, data.activity, data.minutes, data.notes || null);
  res.status(201).json({ message: 'Activity logged.', id: Number(result.lastInsertRowid) });
});

router.delete('/exercise/:id', (req, res) => {
  const result = db.prepare('DELETE FROM exercise_logs WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user.id);
  if (!result.changes) throw new HttpError(404, 'Activity not found.');
  res.json({ message: 'Activity removed.' });
});

/* ------------------------------------ Nutrition ---------------------------------- */

router.get('/nutrition', (req, res) => {
  const { from, to } = rangeFromQuery(req.query);
  const nutrition = db.prepare('SELECT date, food_notes, craving FROM nutrition_logs WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC').all(req.user.id, from, to);
  res.json({ nutrition, from, to });
});

router.put('/nutrition', (req, res) => {
  const data = parseBody(z.object({
    date: dateField(),
    foodNotes: z.string().max(1000).optional().nullable(),
    craving: z.string().max(80).optional().nullable(),
  }), req.body);
  db.prepare(`INSERT INTO nutrition_logs (user_id, date, food_notes, craving, updated_at) VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, date) DO UPDATE SET food_notes = excluded.food_notes, craving = excluded.craving, updated_at = datetime('now')`)
    .run(req.user.id, data.date, data.foodNotes || null, data.craving || null);
  res.json({ message: 'Nutrition notes saved.' });
});

/* ----------------------------------- Daily notes --------------------------------- */

router.put('/daily-notes', (req, res) => {
  const data = parseBody(z.object({ date: dateField(), notes: z.string().max(2000) }), req.body);
  db.prepare(`INSERT INTO daily_logs (user_id, date, notes) VALUES (?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET notes = excluded.notes, updated_at = datetime('now')`)
    .run(req.user.id, data.date, data.notes);
  res.json({ message: 'Daily note saved.' });
});

router.get('/history', (req, res) => {
  const { from, to } = rangeFromQuery(req.query);
  const uid = req.user.id;
  res.json({
    from,
    to,
    symptoms: db.prepare('SELECT date, name, severity, notes FROM symptoms WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC').all(uid, from, to),
    moods: db.prepare('SELECT date, mood, notes FROM moods WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC').all(uid, from, to),
    water: db.prepare('SELECT date, glasses FROM water_logs WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC').all(uid, from, to),
    sleep: db.prepare('SELECT date, hours, quality FROM sleep_logs WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC').all(uid, from, to),
    exercise: db.prepare('SELECT date, activity, minutes FROM exercise_logs WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC').all(uid, from, to),
    nutrition: db.prepare('SELECT date, food_notes, craving FROM nutrition_logs WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC').all(uid, from, to),
    notes: db.prepare('SELECT date, notes FROM daily_logs WHERE user_id = ? AND date BETWEEN ? AND ? AND notes IS NOT NULL ORDER BY date DESC').all(uid, from, to),
  });
});

export default router;
