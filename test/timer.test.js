// -----------------------------------------------------------------------------
// The check timer of the container. Gladys never polls a device published
// with should_poll: false (nor one created without it, Gladys#3198): the
// checks must run on the container's own timer, without any onPoll.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RETRY_MS, TRIGGERS } from '../src/monitor.js';
import { createWorld } from './helpers/world.js';

const settle = async () => {
  for (let i = 0; i < 20; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
};

test('the internal timer checks every interval, Gladys never asked', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const w = await createWorld({ config: { check_interval: '10' }, timers: true });
  t.after(() => w.app.stop());
  assert.equal(w.fake.discoveredDevices[0].should_poll, false);
  assert.equal(w.service.requests.length, 1);
  for (let i = 0; i < 3; i += 1) {
    t.mock.timers.tick(10 * 60_000);
    await settle();
  }
  assert.equal(w.service.requests.length, 4);
  t.mock.timers.tick(5 * 60_000);
  await settle();
  assert.equal(w.service.requests.length, 4, 'not before the interval');
});

test('a failed check is retried 30 s later, then counts as an outage', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const w = await createWorld({ timers: true });
  t.after(() => w.app.stop());
  w.service.answer = 'down';
  t.mock.timers.tick(5 * 60_000);
  await settle();
  assert.equal(w.fake.sceneEvents.length, 0);
  t.mock.timers.tick(RETRY_MS);
  await settle();
  assert.deepEqual(
    w.fake.sceneEvents.map((e) => e.key),
    [TRIGGERS.FAILED],
  );
  // Then back to the normal pace.
  const before = w.service.requests.length;
  t.mock.timers.tick(RETRY_MS);
  await settle();
  assert.equal(w.service.requests.length, before);
  t.mock.timers.tick(5 * 60_000);
  await settle();
  assert.equal(w.service.requests.length, before + 1);
});

test('a new interval applies at once, and the timer stops with the integration', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const w = await createWorld({ timers: true });
  await w.fake.configUpdated({ check_interval: '1' });
  t.mock.timers.tick(60_000);
  await settle();
  assert.equal(w.service.requests.length, 2);
  await w.app.stop();
  t.mock.timers.tick(60 * 60_000);
  await settle();
  assert.equal(w.service.requests.length, 2);
});
