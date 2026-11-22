import { Router } from 'express';
import PDFDocument from 'pdfkit';
import db, { getSettings } from '../db.js';
import { requireAuth, HttpError } from '../middleware.js';
import { buildPredictions } from '../utils/predictions.js';
import { addDays, diffDays, todayISO, toISO, parseISO } from '../utils/dates.js';

const router = Router();
router.use(requireAuth);

const RANGE_DAYS = { week: 7, month: 30, year: 365, all: 3650 };

function resolveRange(query) {
  const key = RANGE_DAYS[query.range] ? query.range : 'month';
  const to = todayISO();
  return { key, from: addDays(to, -(RANGE_DAYS[key] - 1)), to };
}

function buildInsights(userId, query) {
  const { key, from, to } = resolveRange(query);
  const settings = getSettings(userId);
  const allPeriods = db.prepare('SELECT * FROM periods WHERE user_id = ? ORDER BY start_date').all(userId);
  const periods = allPeriods.filter((p) => p.start_date >= from && p.start_date <= to);
  const predictions = buildPredictions(allPeriods, settings, to);

  const cycleTrend = predictions.stats.cycleLengths.map((length, i) => {
    const start = allPeriods[i + 1]?.start_date || to;
    return { label: toISO(parseISO(start)).slice(0, 7), date: start, length, index: i + 1 };
  }).slice(-12);

  const durationTrend = predictions.stats.durations.map((days, i) => {
    const p = allPeriods.filter((x) => x.end_date)[i];
    return { label: p?.start_date?.slice(0, 7) || '', date: p?.start_date, days, index: i + 1 };
  }).slice(-12);

  const countBy = (rows, field) => {
    const map = new Map();
    for (const row of rows) map.set(row[field], (map.get(row[field]) || 0) + 1);
    return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  };

  const symptoms = db.prepare('SELECT name, severity, date FROM symptoms WHERE user_id = ? AND date BETWEEN ? AND ?').all(userId, from, to);
  const moods = db.prepare('SELECT mood, date FROM moods WHERE user_id = ? AND date BETWEEN ? AND ?').all(userId, from, to);
  const water = db.prepare('SELECT glasses, date FROM water_logs WHERE user_id = ? AND date BETWEEN ? AND ?').all(userId, from, to);
  const sleep = db.prepare('SELECT hours, quality, date FROM sleep_logs WHERE user_id = ? AND date BETWEEN ? AND ?').all(userId, from, to);
  const exercise = db.prepare('SELECT minutes, activity, date FROM exercise_logs WHERE user_id = ? AND date BETWEEN ? AND ?').all(userId, from, to);
  const nutrition = db.prepare('SELECT craving FROM nutrition_logs WHERE user_id = ? AND date BETWEEN ? AND ?').all(userId, from, to);

  const symptomFrequency = countBy(symptoms, 'name');
  const moodFrequency = countBy(moods, 'mood');
  const severityBreakdown = countBy(symptoms, 'severity');
  const activityBreakdown = countBy(exercise, 'activity');

  // Monthly buckets for the selected range.
  const buckets = [];
  const bucketCount = key === 'week' ? 7 : key === 'month' ? 10 : 12;
  const span = diffDays(from, to) || 1;
  for (let i = 0; i < bucketCount; i += 1) {
    const start = addDays(from, Math.round((span * i) / bucketCount));
    const end = addDays(from, Math.round((span * (i + 1)) / bucketCount) - 1);
    const inBucket = (date) => date >= start && date <= end;
    buckets.push({
      label: key === 'year'
        ? parseISO(start).toLocaleString('en', { month: 'short' })
        : parseISO(start).toLocaleString('en', { month: 'short', day: 'numeric' }),
      symptoms: symptoms.filter((s) => inBucket(s.date)).length,
      moods: moods.filter((m) => inBucket(m.date)).length,
      water: water.filter((w) => inBucket(w.date)).reduce((a, b) => a + b.glasses, 0),
      exercise: exercise.filter((e) => inBucket(e.date)).reduce((a, b) => a + b.minutes, 0),
    });
  }

  const average = (arr, field) => arr.length ? Math.round((arr.reduce((a, b) => a + Number(b[field] || 0), 0) / arr.length) * 10) / 10 : 0;

  const topSymptoms = symptomFrequency.slice(0, 5);
  const loggedDays = new Set([...symptoms, ...moods, ...water, ...sleep, ...exercise].map((r) => r.date)).size;

  return {
    range: key,
    from,
    to,
    generatedAt: new Date().toISOString(),
    kpis: {
      avgCycleLength: predictions.stats.avgCycleLength,
      avgPeriodDuration: predictions.stats.avgPeriodDuration,
      regularity: predictions.stats.regularity,
      regularityScore: predictions.stats.regularityScore,
      cycleCount: predictions.stats.cycleCount,
      periodCount: predictions.stats.periodCount,
      loggedDays,
      predictionConfidence: predictions.stats.confidence,
      shortestCycle: predictions.stats.shortestCycle,
      longestCycle: predictions.stats.longestCycle,
      avgWater: average(water, 'glasses'),
      avgSleep: average(sleep, 'hours'),
      avgExercise: average(exercise, 'minutes'),
    },
    stats: predictions.stats,
    cycleTrend,
    durationTrend,
    symptomFrequency,
    moodFrequency,
    severityBreakdown,
    activityBreakdown,
    cravingFrequency: countBy(nutrition.filter((n) => n.craving), 'craving').slice(0, 8),
    buckets,
    periodHistory: allPeriods.slice(-12).map((p) => ({
      startDate: p.start_date,
      endDate: p.end_date,
      days: p.end_date ? diffDays(p.start_date, p.end_date) + 1 : null,
    })),
    predictions: {
      nextPeriod: predictions.nextPeriod,
      ovulation: predictions.ovulation,
      fertileStart: predictions.fertileStart,
      fertileEnd: predictions.fertileEnd,
      isEstimate: true,
    },
  };
}

router.get('/', (req, res) => res.json(buildInsights(req.user.id, req.query)));

router.get('/export/pdf', (req, res) => {
  const data = buildInsights(req.user.id, req.query);
  const user = db.prepare('SELECT name, email FROM users WHERE id = ?').get(req.user.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="floura-report-${data.to}.pdf"`);

  const doc = new PDFDocument({ margin: 48, size: 'A4', bufferPages: true });
  doc.pipe(res);
  const plum = '#7B4B6B';
  const muted = '#8B7B88';

  doc.rect(0, 0, 595, 110).fill('#F6E3EA');
  doc.fillColor(plum).font('Helvetica-Bold').fontSize(26).text('FLOURA');
  doc.font('Helvetica').fontSize(10).fillColor(muted).text('Personal cycle & wellness report', 48, 68);
  doc.text(`Generated ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`, 48, 84);
  doc.text(`For: ${user.name} (${user.email})`, 350, 68, { width: 200, align: 'right' });

  let y = 140;
  const section = (title) => {
    doc.fillColor(plum).font('Helvetica-Bold').fontSize(14).text(title, 48, y);
    y += 24;
  };
  const row = (label, value) => {
    doc.fillColor('#3A2E38').font('Helvetica').fontSize(10).text(label, 56, y, { width: 260 });
    doc.text(String(value ?? '—'), 320, y, { width: 220, align: 'right' });
    y += 17;
  };

  section('Cycle overview');
  row('Average cycle length', `${data.kpis.avgCycleLength} days`);
  row('Average period duration', `${data.kpis.avgPeriodDuration} days`);
  row('Cycle regularity', data.kpis.regularity);
  row('Shortest / longest recorded', `${data.stats.shortestCycle ?? '—'} / ${data.stats.longestCycle ?? '—'} days`);
  row('Cycles recorded', data.kpis.cycleCount);
  y += 12;

  section('Estimates (not medical certainty)');
  row('Next predicted period', data.predictions.nextPeriod || '—');
  row('Estimated ovulation', data.predictions.ovulation || '—');
  row('Fertile window', data.predictions.fertileStart ? `${data.predictions.fertileStart} to ${data.predictions.fertileEnd}` : '—');
  row('Prediction confidence', `${data.kpis.predictionConfidence}%`);
  y += 12;

  section(`Wellness — last ${data.range}`);
  row('Days with any log', data.kpis.loggedDays);
  row('Average water intake', `${data.kpis.avgWater} glasses/day`);
  row('Average sleep', `${data.kpis.avgSleep} hours/night`);
  row('Average exercise', `${data.kpis.avgExercise} minutes/day`);
  y += 12;

  section('Symptom frequency');
  if (data.symptomFrequency.length === 0) row('No symptoms recorded', '');
  else data.symptomFrequency.slice(0, 12).forEach((s) => row(s.name, `${s.count} entries`));
  y += 12;

  section('Mood frequency');
  if (data.moodFrequency.length === 0) row('No moods recorded', '');
  else data.moodFrequency.forEach((m) => row(m.mood, `${m.count} entries`));
  y += 12;

  if (y > 660) { doc.addPage(); y = 60; }
  section('Period history');
  doc.fillColor(muted).font('Helvetica-Bold').fontSize(9).text('START', 56, y).text('END', 210, y).text('DAYS', 420, y, { width: 100, align: 'right' });
  y += 16;
  data.periodHistory.forEach((p) => {
    doc.fillColor('#3A2E38').font('Helvetica').fontSize(9).text(p.startDate, 56, y).text(p.endDate || 'ongoing', 210, y).text(String(p.days ?? '—'), 420, y, { width: 100, align: 'right' });
    y += 15;
    if (y > 760) { doc.addPage(); y = 60; }
  });

  doc.addPage();
  doc.fillColor(muted).font('Helvetica').fontSize(9).text(
    'FLOURA estimates are based on the dates you have recorded and are for information only. They are not medical advice, diagnosis, or a substitute for contraception. If you have concerns about your health, speak with a qualified healthcare professional.',
    48, 60, { width: 500, align: 'justify' },
  );
  doc.font('Helvetica-Bold').fillColor(plum).fontSize(11).text('Your data stays private.', 48, 130);
  doc.font('Helvetica').fillColor(muted).fontSize(9).text('This report was generated from your private account and is only available to you.', 48, 150, { width: 500 });
  doc.end();
});

export default router;
