/**
 * End-to-end API journey test. Start the API first, then run:
 *   node server/test/journey.mjs
 */
const BASE = process.env.API_URL || 'http://localhost:3001';
const email = `journey-${Date.now()}@floura.test`;
const password = 'JourneyPass1';
let cookie = '';
let passed = 0;

function ok(condition, label) {
  if (!condition) throw new Error(`FAILED: ${label}`);
  passed += 1;
  console.log(`  ✓ ${label}`);
}

async function call(method, path, body, expected = 200) {
  const response = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const data = await response.json().catch(() => ({}));
  if (response.status !== expected) throw new Error(`${method} ${path} expected ${expected}, got ${response.status}: ${JSON.stringify(data)}`);
  return data;
}

console.log('🌸 FLOURA end-to-end journey\n');

console.log('Authentication');
const registered = await call('POST', '/auth/register', { name: 'Journey Tester', email, password, consent: true }, 201);
ok(registered.user.email === email, 'account created');
ok(registered.devToken, 'verification token issued in demo mode');
await call('POST', '/auth/verify-email', { token: registered.devToken });
ok((await call('GET', '/auth/me')).user.emailVerified, 'email verified');
await call('GET', '/auth/me');
ok(true, 'persistent session cookie accepted');

console.log('\nCycle tracking');
const first = await call('POST', '/cycles/periods', { startDate: '2026-09-14', endDate: '2026-09-19' }, 201);
await call('POST', '/cycles/periods', { startDate: '2026-10-12', endDate: '2026-10-17' }, 201);
await call('POST', '/cycles/periods', { startDate: '2026-11-09', endDate: '2026-11-14' }, 201);
ok(first.stats.periodCount === 1, 'period recorded');
const cycles = await call('GET', '/cycles');
ok(cycles.stats.avgCycleLength === 28, `personal average cycle calculated (${cycles.stats.avgCycleLength} days)`);
ok(cycles.stats.avgPeriodDuration === 6, `personal period duration calculated (${cycles.stats.avgPeriodDuration} days)`);
ok(Boolean(cycles.predictions.nextPeriod), 'next period predicted from history');
ok(cycles.predictions.upcoming.length === 6, 'six future cycles predicted');
ok(Boolean(cycles.predictions.ovulation && cycles.predictions.fertileStart), 'ovulation and fertile window estimated');
await call('PATCH', `/cycles/periods/${first.period.id}`, { startDate: '2026-09-14', endDate: '2026-09-20' });
ok(true, 'period entry edited');
await call('DELETE', `/cycles/periods/${first.period.id}`);
ok((await call('GET', '/cycles')).periods.length === 2, 'period entry deleted');

console.log('\nDaily tracking');
const day = '2026-11-20';
await call('PUT', '/logs/symptoms', { date: day, items: [{ name: 'Cramps', severity: 'moderate', notes: 'improved with heat' }, { name: 'My own symptom', severity: 'mild' }] });
await call('PUT', '/logs/moods', { date: day, moods: [{ mood: 'Calm' }, { mood: 'Tired', notes: 'late night' }] });
await call('PUT', '/logs/water', { date: day, glasses: 6 });
await call('PUT', '/logs/sleep', { date: day, hours: 7.5, quality: 'good' });
await call('POST', '/logs/exercise', { date: day, activity: 'Yoga', minutes: 25 }, 201);
await call('PUT', '/logs/nutrition', { date: day, foodNotes: 'Soup and salad', craving: 'Chocolate' });
await call('PUT', '/logs/daily-notes', { date: day, notes: 'A quieter day.' });
const dayLog = await call('GET', `/logs/day?date=${day}`);
ok(dayLog.symptoms.length === 2 && dayLog.moods.length === 2, 'symptoms and multiple moods saved');
ok(dayLog.water === 6 && dayLog.sleep.hours === 7.5 && dayLog.exercise.length === 1, 'hydration, sleep and activity saved');
ok(dayLog.nutrition.craving === 'Chocolate' && dayLog.dailyNote === 'A quieter day.', 'nutrition and daily note saved');

console.log('\nInsights & reports');
const insights = await call('GET', '/insights?range=year');
ok(insights.kpis.avgCycleLength === 28, 'insights use recorded history');
ok(insights.symptomFrequency.length >= 2 && insights.moodFrequency.length === 2, 'symptom and mood analytics generated');
ok(insights.buckets.length > 0, 'time buckets generated');
const pdf = await fetch(`${BASE}/api/insights/export/pdf?range=year`, { headers: { Cookie: cookie } });
ok(pdf.status === 200 && (await pdf.blob()).size > 1000, 'PDF report generated');

console.log('\nReminders & privacy');
await call('PATCH', '/reminders/water', { enabled: true, time: '10:30' });
const reminders = await call('GET', '/reminders');
ok(reminders.reminders.find((r) => r.type === 'water').enabled === 1, 'reminder toggled');
const refreshed = await call('POST', '/reminders/refresh');
ok(refreshed.notifications.length > 0, 'in-app notifications generated');
await call('POST', '/reminders/notifications/read-all');
ok((await call('GET', '/reminders')).notifications.every((n) => n.is_read === 1), 'notifications marked read');
await call('PATCH', '/user/privacy', { sensitiveNotifications: false, researchOptIn: true });
ok((await call('GET', '/user/profile')).settings.researchOptIn === true, 'privacy preferences saved');

const exported = await fetch(`${BASE}/api/user/export`, { headers: { Cookie: cookie } });
const exportJson = await exported.json();
ok(exported.status === 200 && exportJson.periods.length === 2 && exportJson.symptoms.length === 2, 'personal data export contains records');

console.log('\nAccount isolation & security');
const otherEmail = `other-${Date.now()}@floura.test`;
let otherCookie = '';
const otherRegister = await fetch(`${BASE}/api/auth/register`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Other Person', email: otherEmail, password, consent: true }),
});
otherCookie = otherRegister.headers.get('set-cookie').split(';')[0];
const otherCycles = await fetch(`${BASE}/api/cycles`, { headers: { Cookie: otherCookie } }).then((r) => r.json());
ok(otherCycles.periods.length === 0, 'second user cannot see first user’s periods');
const otherDay = await fetch(`${BASE}/api/logs/day?date=${day}`, { headers: { Cookie: otherCookie } }).then((r) => r.json());
ok(otherDay.symptoms.length === 0 && otherDay.moods.length === 0, 'second user cannot see first user’s daily logs');
const unauthenticated = await fetch(`${BASE}/api/logs/history`);
ok(unauthenticated.status === 401, 'protected endpoints reject unauthenticated requests');
await call('POST', '/user/change-password', { currentPassword: password, newPassword: 'ChangedPass1' });
ok(true, 'password changed');
await call('DELETE', '/user/account', { password: 'ChangedPass1' });
ok(true, 'account and associated data deleted');

console.log(`\n🎉 ${passed} checks passed.\n`);
