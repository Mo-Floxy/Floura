import { addDays, diffDays, todayISO } from './dates.js';

const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;
const stdDev = (values) => {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
};
const round = (n) => Math.round(n);

/**
 * Derive real cycle statistics from a user's recorded period history.
 * No fixed 28-day assumption is used once enough history exists.
 */
export function computeCycleStats(periods = [], settings = {}) {
  const sorted = [...periods].filter((p) => p.start_date).sort((a, b) => a.start_date.localeCompare(b.start_date));
  const starts = sorted.map((p) => p.start_date);
  const cycleLengths = [];
  for (let i = 1; i < starts.length; i += 1) {
    const length = diffDays(starts[i - 1], starts[i]);
    if (length >= 15 && length <= 90) cycleLengths.push(length);
  }
  const durations = sorted
    .filter((p) => p.end_date && p.start_date)
    .map((p) => diffDays(p.start_date, p.end_date) + 1)
    .filter((d) => d >= 1 && d <= 15);

  const recentCycles = cycleLengths.slice(-6);
  const recentDurations = durations.slice(-6);
  const fallbackCycle = settings.cycle_length || 28;
  const fallbackDuration = settings.period_duration || 5;
  const manual = Boolean(settings.use_manual_cycle_length);

  const avgCycleLength = manual ? fallbackCycle : (recentCycles.length ? round(mean(recentCycles)) : fallbackCycle);
  const avgPeriodDuration = recentDurations.length ? round(mean(recentDurations)) : fallbackDuration;
  const deviation = stdDev(recentCycles);
  const regularityScore = recentCycles.length < 2
    ? null
    : Math.max(0, Math.min(100, round(100 - deviation * 12)));
  let regularity = 'Not enough data';
  if (recentCycles.length >= 2) {
    if (deviation <= 2) regularity = 'Very regular';
    else if (deviation <= 4) regularity = 'Fairly regular';
    else if (deviation <= 7) regularity = 'Variable';
    else regularity = 'Irregular';
  }

  return {
    cycleCount: cycleLengths.length,
    periodCount: sorted.length,
    cycleLengths,
    durations,
    avgCycleLength,
    avgPeriodDuration,
    shortestCycle: cycleLengths.length ? Math.min(...cycleLengths) : null,
    longestCycle: cycleLengths.length ? Math.max(...cycleLengths) : null,
    regularity,
    regularityScore,
    deviation: round(deviation * 10) / 10,
    lastPeriodStart: starts.at(-1) || null,
    lastPeriodEnd: sorted.at(-1)?.end_date || null,
    confidence: Math.min(100, round((cycleLengths.length / 6) * 100)),
  };
}

/** Build predictions and phase information relative to a reference day. */
export function buildPredictions(periods = [], settings = {}, reference = todayISO()) {
  const stats = computeCycleStats(periods, settings);
  const cycleLength = Math.max(15, Math.min(90, stats.avgCycleLength));
  const duration = Math.max(1, Math.min(15, stats.avgPeriodDuration));
  const lastStart = stats.lastPeriodStart;

  if (!lastStart) {
    return {
      stats,
      cycleLength,
      duration,
      cycleDay: 1,
      progress: 0,
      phase: 'unknown',
      phaseLabel: 'No data yet',
      phaseDescription: 'Log your first period to begin receiving personalised predictions.',
      nextPeriod: null,
      daysUntilPeriod: null,
      ovulation: null,
      fertileStart: null,
      fertileEnd: null,
      currentCycleStart: null,
      upcoming: [],
      timeline: [],
      isEstimate: true,
      reference,
    };
  }

  // Cycle day: roll over by predicted cycle length when a period is overdue.
  const sinceLast = Math.max(0, diffDays(lastStart, reference));
  const cyclesElapsed = Math.floor(sinceLast / cycleLength);
  const currentCycleStart = addDays(lastStart, cyclesElapsed * cycleLength);
  const cycleDay = diffDays(currentCycleStart, reference) + 1;
  const progress = Math.min(100, Math.round((cycleDay / cycleLength) * 100));

  let nextPeriod = addDays(lastStart, cycleLength);
  while (diffDays(reference, nextPeriod) < 0) nextPeriod = addDays(nextPeriod, cycleLength);
  if (nextPeriod === reference) nextPeriod = addDays(nextPeriod, cycleLength);
  const daysUntilPeriod = diffDays(reference, nextPeriod);

  const ovulation = addDays(nextPeriod, -14);
  const fertileStart = addDays(ovulation, -5);
  const fertileEnd = addDays(ovulation, 1);

  const currentOvulation = addDays(currentCycleStart, cycleLength - 14);
  const currentFertileStart = addDays(currentOvulation, -5);
  const currentFertileEnd = addDays(currentOvulation, 1);

  let phase = 'luteal';
  let phaseLabel = 'Luteal phase';
  let phaseDescription = 'Your body is preparing for the next cycle. Energy and mood can shift during this time.';
  if (cycleDay <= duration) {
    phase = 'menstrual';
    phaseLabel = 'Menstrual phase';
    phaseDescription = 'Your period is underway. Rest, hydrate and be gentle with yourself.';
  } else if (reference >= currentFertileStart && reference <= currentFertileEnd) {
    const isOvulationDay = reference === currentOvulation;
    phase = isOvulationDay ? 'ovulation' : 'fertile';
    phaseLabel = isOvulationDay ? 'Ovulation day' : 'Fertile window';
    phaseDescription = isOvulationDay
      ? 'Ovulation is estimated to occur today or very soon.'
      : 'Your most fertile days are approaching. Fertility awareness can help you plan.';
  } else if (reference < currentFertileStart) {
    phase = 'follicular';
    phaseLabel = 'Follicular phase';
    phaseDescription = 'Energy often rises as your body prepares for ovulation.';
  }

  const upcoming = Array.from({ length: 6 }, (_, i) => {
    const start = addDays(nextPeriod, i * cycleLength);
    const ov = addDays(start, -14);
    return {
      start,
      end: addDays(start, duration - 1),
      ovulation: ov,
      fertileStart: addDays(ov, -5),
      fertileEnd: addDays(ov, 1),
      cycleNumber: i + 1,
    };
  });

  const timeline = [
    { key: 'menstrual', label: 'Period', start: currentCycleStart, end: addDays(currentCycleStart, duration - 1) },
    { key: 'follicular', label: 'Follicular', start: addDays(currentCycleStart, duration), end: addDays(currentFertileStart, -1) },
    { key: 'fertile', label: 'Fertile', start: currentFertileStart, end: addDays(currentOvulation, -1) },
    { key: 'ovulation', label: 'Ovulation', start: currentOvulation, end: currentOvulation },
    { key: 'luteal', label: 'Luteal', start: addDays(currentOvulation, 1), end: addDays(currentCycleStart, cycleLength - 1) },
  ].filter((segment) => diffDays(segment.start, segment.end) >= 0);

  return {
    stats,
    cycleLength,
    duration,
    cycleDay,
    progress,
    phase,
    phaseLabel,
    phaseDescription,
    nextPeriod,
    daysUntilPeriod,
    ovulation: currentOvulation >= reference ? currentOvulation : ovulation,
    fertileStart: currentFertileStart >= reference ? currentFertileStart : fertileStart,
    fertileEnd: currentFertileEnd >= reference ? currentFertileEnd : fertileEnd,
    currentCycleStart,
    upcoming,
    timeline,
    isEstimate: true,
    reference,
  };
}

/** Classify a single calendar date for display in the cycle calendar. */
export function classifyDate(date, periods = [], predictions = null) {
  const period = periods.find((p) => date >= p.start_date && date <= (p.end_date || p.start_date));
  if (period) return { kind: 'period', label: 'Period day', period };
  if (date === predictions?.nextPeriod) return { kind: 'predicted', label: 'Predicted period' };
  if (predictions?.upcoming?.some((u) => date >= u.start && date <= u.end)) {
    return { kind: 'predicted', label: 'Predicted period' };
  }
  if (date === predictions?.ovulation || predictions?.upcoming?.some((u) => u.ovulation === date)) {
    return { kind: 'ovulation', label: 'Estimated ovulation' };
  }
  if ((predictions?.fertileStart && date >= predictions.fertileStart && date <= predictions.fertileEnd)
    || predictions?.upcoming?.some((u) => date >= u.fertileStart && date <= u.fertileEnd)) {
    return { kind: 'fertile', label: 'Fertile window' };
  }
  return { kind: 'normal', label: '' };
}
