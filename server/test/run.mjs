import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const port = Number(process.env.TEST_PORT || 3101);
const dbPath = `/tmp/opencode/floura-journey-${Date.now()}.db`;
const api = spawn(process.execPath, ['server/src/index.js'], {
  cwd: root,
  env: { ...process.env, PORT: String(port), DB_PATH: dbPath, NODE_ENV: 'test' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
api.stdout.on('data', (chunk) => { logs += chunk; });
api.stderr.on('data', (chunk) => { logs += chunk; });

async function waitForHealth() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) return;
    } catch { /* starting up */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`API did not start:\n${logs}`);
}

let exitCode = 0;
try {
  await waitForHealth();
  const journey = spawn(process.execPath, ['server/test/journey.mjs'], {
    cwd: root,
    env: { ...process.env, API_URL: `http://127.0.0.1:${port}` },
    stdio: 'inherit',
  });
  exitCode = await new Promise((resolve) => journey.on('exit', resolve));
} catch (error) {
  console.error(error.message);
  exitCode = 1;
} finally {
  api.kill();
  await rm(dbPath, { force: true }).catch(() => {});
}
process.exit(exitCode || 0);
