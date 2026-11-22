import { Router } from 'express';
import { z } from 'zod';
import db, { getSettings } from '../db.js';
import { HttpError, parseBody, requireAuth } from '../middleware.js';
import { buildPredictions } from '../utils/predictions.js';
import { addDays, diffDays, isValidISO, todayISO } from '../utils/dates.js';

const router = Router();
router.use(requireAuth);

const getPeriods = (userId) => db.prepare('SELECT * FROM periods WHERE user_id = ? ORDER BY start_date ASC').all(userId);
const formatPeriod = (p) => ({
  id: p.id,
  startDate: p.start_date,
  endDate: p.end_date,
  notes: p.notes,
  days: p.end_date ? diffDays(p.start_date, p.end_date) + 1 : null,
});

function overview(userId, reference = todayISO()) {
  const periods = getPeriods(userId);
  const predictions = buildPredictions(periods, getSettings(userId), reference);
  return {
    periods: periods.map(formatPeriod),
    stats: predictions.stats,
    predictions,
  };
}

router.get('/', (req, res) => {
  const reference = typeof req.query.date === 'string' && isValidISO(req.query.date) ? req.query.date : todayISO();
  res.json(overview(req.user.id, reference));
});

const periodSchema = z.object({
  startDate: z.string().refine(isValidISO, 'Please choose a valid start date.'),
  endDate: z.string().nullable().optional().refine((v) => v == null || isValidISO(v), 'Please choose a valid end date.'),
  notes: z.string().max(500).optional().nullable(),
}).refine((data) => !data.endDate || data.endDate >= data.startDate, {
  message: 'The end date cannot be before the start date.',
});

function validateRange(userId, startDate, endDate, excludeId = null) {
  if (diffDays(startDate, todayISO()) < -2) throw new HttpError(400, 'Start date cannot be in the future.');
  if (endDate && diffDays(endDate, todayISO()) < 0) throw new HttpError(400, 'End date cannot be in the future.');
  const others = getPeriods(userId).filter((p) => p.id !== excludeId);
  const overlapping = others.find((p) => {
    const otherEnd = p.end_date || p.start_date;
    return startDate <= otherEnd && (endDate || startDate) >= p.start_date;
  });
  if (overlapping) throw new HttpError(409, 'These dates overlap an existing period entry. Edit that entry instead.');
}

router.post('/periods', (req, res) => {
  const data = parseBody(periodSchema, req.body);
  validateRange(req.user.id, data.startDate, data.endDate || null);
  const result = db.prepare('INSERT INTO periods (user_id, start_date, end_date, notes) VALUES (?, ?, ?, ?)')
    .run(req.user.id, data.startDate, data.endDate || null, data.notes || null);
  res.status(201).json({ message: 'Period dates saved.', period: formatPeriod(db.prepare('SELECT * FROM periods WHERE id = ?').get(result.lastInsertRowid)), ...overview(req.user.id) });
});

router.patch('/periods/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM periods WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!existing) throw new HttpError(404, 'Period entry not found.');
  const data = parseBody(periodSchema, { ...existing, ...req.body, startDate: req.body.startDate ?? existing.start_date, endDate: req.body.endDate !== undefined ? req.body.endDate : existing.end_date });
  validateRange(req.user.id, data.startDate, data.endDate || null, id);
  db.prepare('UPDATE periods SET start_date = ?, end_date = ?, notes = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?')
    .run(data.startDate, data.endDate || null, data.notes || null, id, req.user.id);
  res.json({ message: 'Period entry updated.', period: formatPeriod(db.prepare('SELECT * FROM periods WHERE id = ?').get(id)), ...overview(req.user.id) });
});

router.delete('/periods/:id', (req, res) => {
  const result = db.prepare('DELETE FROM periods WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user.id);
  if (!result.changes) throw new HttpError(404, 'Period entry not found.');
  res.json({ message: 'Period entry deleted.', ...overview(req.user.id) });
});

/** Lightweight endpoint used for dashboard refresh. */
router.get('/predictions', (req, res) => {
  res.json(buildPredictions(getPeriods(req.user.id), getSettings(req.user.id), todayISO()));
});

router.get('/upcoming', (req, res) => {
  const { predictions } = overview(req.user.id);
  res.json({ upcoming: predictions.upcoming, isEstimate: true });
});

export default router;
