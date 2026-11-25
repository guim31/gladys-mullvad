// -----------------------------------------------------------------------------
// What the integration writes at the default level (info): the lifecycle
// only. A normal check writes nothing, an outage is logged once, and its end
// once. Never the public IP, even in debug.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIXTURES, createWorld } from './helpers/world.js';

function captureLogs(t, level = 'info') {
  const previous = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = level;
  t.after(() => {
    process.env.LOG_LEVEL = previous;
  });
  const lines = [];
  const record = (...args) =>
    lines.push(args.map((arg) => (arg instanceof Error ? arg.stack : String(arg))).join(' '));
  t.mock.method(console, 'log', record);
  t.mock.method(console, 'error', record);
  return { lines, clear: () => lines.splice(0) };
}

test('normal checks write nothing at info', async (t) => {
  const logs = captureLogs(t);
  const w = await createWorld();
  t.after(() => w.app.stop());
  assert.ok(logs.lines.some((line) => line.includes('every 5 min')));
  logs.clear();
  for (let i = 0; i < 10; i += 1) {
    await w.monitor.check();
  }
  assert.deepEqual(logs.lines, []);
});

test('an outage is logged once when it starts and once when it ends', async (t) => {
  const logs = captureLogs(t);
  const w = await createWorld();
  t.after(() => w.app.stop());
  logs.clear();
  w.service.answer = 'down';
  for (let i = 0; i < 5; i += 1) {
    await w.monitor.check().catch(() => {});
  }
  assert.equal(logs.lines.length, 1, logs.lines.join('\n'));
  w.service.answer = FIXTURES.through;
  await w.monitor.check();
  assert.equal(logs.lines.length, 2);
  assert.match(logs.lines[1], /answers again/);
});

test('the public IP is never written, even in debug', async (t) => {
  const logs = captureLogs(t, 'debug');
  const w = await createWorld();
  t.after(() => w.app.stop());
  w.service.answer = FIXTURES.notThrough;
  await w.monitor.check();
  await w.fake.action('check_now', {});
  await w.fake.widgetGet('connection', { settings: { show_ip: true } });
  const all = logs.lines.join('\n');
  assert.ok(logs.lines.length > 0);
  assert.ok(!all.includes('192.0.2.23') && !all.includes('198.51.100.42'));
});
