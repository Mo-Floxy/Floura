/** Optional browser smoke test. Run the dev servers first, then: node server/test/ui.mjs */
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173';
const shots = '/tmp/opencode/floura-shots';
fs.mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  // The auth check on public pages intentionally returns 401 when signed out.
  if (message.type() === 'error' && !message.text().includes('401 (Unauthorized)')) errors.push(`console: ${message.text()}`);
});

const check = async (condition, label) => {
  if (!condition) throw new Error(`FAILED: ${label}`);
  console.log(`  ✓ ${label}`);
};

try {
  console.log('🌸 FLOURA browser smoke test\n');
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('h1');
  check((await page.locator('h1').innerText()).includes('Welcome back'), 'login screen renders');
  await page.screenshot({ path: `${shots}/01-login.png`, fullPage: true });

  const email = `ui-${Date.now()}@floura.test`;
  await page.goto(`${BASE}/register`);
  await page.locator('input').nth(0).fill('UI Tester');
  await page.locator('input[type=email]').fill(email);
  await page.locator('#password').fill('BrowserPass1');
  await page.locator('.consent-box input').check();
  await page.getByRole('button', { name: /Create account/ }).click();
  await page.waitForURL(/verify-email/, { timeout: 15000 });
  await page.getByText('You’re all set').waitFor({ timeout: 15000 });
  check(true, 'registration and email verification flow works');
  await page.getByRole('button', { name: /Continue to FLOURA/ }).click();
  await page.waitForURL(/dashboard/);
  await page.getByText('CYCLE DAY').first().waitFor();
  check(true, 'dashboard renders for new account');
  await page.screenshot({ path: `${shots}/02-dashboard.png`, fullPage: true });

  const pages = [
    ['calendar', 'Cycle calendar'], ['symptoms', 'Symptom tracker'], ['moods', 'Mood tracker'],
    ['wellness', 'Wellness'], ['insights', 'Insights & reports'], ['learn', 'Learn about your cycle'],
    ['reminders', 'Reminders'], ['settings', 'Settings'],
  ];
  for (const [route, heading] of pages) {
    await page.goto(`${BASE}/${route}`);
    await page.locator('h1').first().waitFor({ timeout: 15000 });
    const text = await page.locator('h1').first().innerText();
    check(text.includes(heading), `${route} page renders`);
    if (route === 'calendar') await page.screenshot({ path: `${shots}/03-calendar.png`, fullPage: true });
    if (route === 'insights') await page.screenshot({ path: `${shots}/04-insights.png`, fullPage: true });
  }

  await page.goto(`${BASE}/calendar`);
  await page.getByRole('button', { name: /Log period/ }).click();
  const dates = page.locator('.modal input[type=date]');
  await dates.nth(0).fill('2026-10-24');
  await dates.nth(1).fill('2026-10-29');
  await page.getByRole('button', { name: 'Save dates' }).click();
  await page.getByText('Period dates saved.').waitFor({ timeout: 10000 });
  check(true, 'calendar period entry saves through the UI');
  await page.screenshot({ path: `${shots}/05-calendar-with-data.png`, fullPage: true });

  await page.goto(`${BASE}/dashboard`);
  await page.getByRole('button', { name: 'Cramps', exact: true }).click();
  await page.getByRole('button', { name: /Save symptoms/ }).click();
  await page.getByText('Today’s symptoms saved.').waitFor({ timeout: 10000 });
  check(true, 'dashboard quick symptom logging works');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/dashboard`);
  await page.locator('.mobile-nav').waitFor();
  const navVisible = await page.locator('.mobile-nav').isVisible();
  check(navVisible, 'mobile bottom navigation is visible');
  await page.screenshot({ path: `${shots}/06-mobile.png`, fullPage: true });

  if (errors.length) {
    console.log('\nBrowser errors:');
    errors.forEach((error) => console.log(`  ! ${error}`));
  } else {
    console.log('\n  ✓ No browser console errors');
  }
  console.log(`\nScreenshots saved to ${shots}\n`);
  process.exitCode = errors.length ? 1 : 0;
} catch (error) {
  console.error(`\n${error.message}`);
  await page.screenshot({ path: `${shots}/failure.png`, fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
