// -----------------------------------------------------------------------------
// The check loop: states, scene triggers, outages, the status of the
// integration and the device added after the first check.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FEATURE_KEYS } from '../src/devices.js';
import { TRIGGERS } from '../src/monitor.js';
import { ERROR_TEXT } from '../src/texts.js';
import { FIXTURES, createAll, createService, createWorld, featureId } from './helpers/world.js';

const lastState = (w, key) => w.fake.lastState(featureId(w.gladys, key));
const fired = (w, key) => w.fake.sceneEvents.filter((event) => event.key === key);
const failSoft = (promise) => promise.catch(() => {});

test('the first check publishes the device and its states, without any trigger', async (t) => {
  const w = await createWorld();
  t.after(() => w.app.stop());
  await createAll(w);
  assert.equal(w.service.requests.length, 1);
  assert.equal(w.fake.discoveredDevices[0].name, 'Mullvad VPN');
  assert.equal(lastState(w, FEATURE_KEYS.THROUGH), 1);
  assert.equal(lastState(w, FEATURE_KEYS.BLACKLISTED), 0);
  const country = w.fake.states.findLast(
    (s) => s.device_feature_external_id === featureId(w.gladys, FEATURE_KEYS.COUNTRY),
  );
  assert.equal(country.text, 'Sweden');
  assert.equal(w.fake.sceneEvents.length, 0);
  assert.equal(w.fake.connectionStatus.connected, true);
});

test('losing Mullvad and getting it back fire one trigger each', async (t) => {
  const w = await createWorld();
  t.after(() => w.app.stop());
  w.service.answer = FIXTURES.notThrough;
  await w.monitor.check();
  await w.monitor.check();
  assert.equal(lastState(w, FEATURE_KEYS.THROUGH), 0);
  assert.deepEqual(
    fired(w, TRIGGERS.LOST).map((e) => e.data),
    [{ country: 'France' }],
  );
  w.service.answer = FIXTURES.blacklisted;
  await w.monitor.check();
  assert.deepEqual(
    fired(w, TRIGGERS.RESTORED).map((e) => e.data),
    [{ country: 'Germany', server: 'de-fra-wg-005' }],
  );
  assert.equal(lastState(w, FEATURE_KEYS.THROUGH), 1);
  assert.equal(lastState(w, FEATURE_KEYS.BLACKLISTED), 1);
  assert.equal(fired(w, TRIGGERS.LOST).length, 1);
});

test('only changes are published', async (t) => {
  const w = await createWorld();
  t.after(() => w.app.stop());
  const before = w.fake.states.length;
  await w.monitor.check();
  await w.monitor.check();
  assert.equal(w.fake.states.length, before);
});

test('an outage: one failure is quiet, the second one is reported once', async (t) => {
  const w = await createWorld({ config: { language: 'de' } });
  t.after(() => w.app.stop());
  w.service.answer = 'down';
  await failSoft(w.monitor.check());
  assert.equal(fired(w, TRIGGERS.FAILED).length, 0);
  assert.equal(w.fake.connectionStatus.connected, true);
  await failSoft(w.monitor.check());
  await failSoft(w.monitor.check());
  assert.deepEqual(
    fired(w, TRIGGERS.FAILED).map((e) => e.data),
    [{ error: ERROR_TEXT.network.de }],
  );
  assert.equal(w.fake.connectionStatus.connected, false);
  assert.deepEqual(w.fake.connectionStatus.message, ERROR_TEXT.network);
  // The last known state stays: an unreachable check says nothing on the tunnel.
  assert.equal(lastState(w, FEATURE_KEYS.THROUGH), 1);
  assert.equal(fired(w, TRIGGERS.LOST).length, 0);

  w.service.answer = FIXTURES.through;
  await w.monitor.check();
  assert.equal(w.fake.connectionStatus.connected, true);
  assert.equal(w.monitor.error, null);
});

test('a first check that fails does not prevent the start', async (t) => {
  const w = await createWorld({ service: createService('timeout') });
  t.after(() => w.app.stop());
  assert.equal(w.fake.discoveredDevices.length, 1);
  assert.equal(w.monitor.status, null);
  w.service.answer = FIXTURES.notThrough;
  await w.monitor.check();
  assert.equal(fired(w, TRIGGERS.LOST).length, 0, 'no previous state, no trigger');
});

test('concurrent checks share one request', async (t) => {
  const w = await createWorld();
  t.after(() => w.app.stop());
  const before = w.service.requests.length;
  await Promise.all([w.monitor.check(), w.monitor.check(), w.monitor.check()]);
  assert.equal(w.service.requests.length - before, 1);
});

test('a device added after the first check gets its states and a widget refresh', async (t) => {
  const w = await createWorld();
  t.after(() => w.app.stop());
  const before = w.fake.states.length;
  const refreshes = w.fake.widgetRefreshes.length;
  await createAll(w);
  assert.ok(w.fake.states.length - before >= 3);
  assert.ok(w.fake.widgetRefreshes.length > refreshes);
});

test('the language changes the feature names, a reconnection checks again', async (t) => {
  const w = await createWorld();
  t.after(() => w.app.stop());
  await w.fake.configUpdated({ language: 'fr' });
  assert.equal(w.fake.discoveredDevices[0].features[0].name, 'Via Mullvad');
  const before = w.service.requests.length;
  await w.gladys.disconnect();
  await w.gladys.connect();
  assert.equal(w.service.requests.length - before, 1);
});

test('the features are read-only', async (t) => {
  const w = await createWorld();
  t.after(() => w.app.stop());
  const [device] = w.fake.discoveredDevices;
  const ack = await w.fake.setValue(device, device.features[0], 1);
  assert.equal(ack.success, false);
});

test('a refused publication costs neither the trigger nor the check', async (t) => {
  const w = await createWorld();
  t.after(() => w.app.stop());
  t.mock.method(w.gladys, 'publishChangedStates', async () => {
    throw new Error('429 Too Many Requests');
  });
  w.service.answer = FIXTURES.notThrough;
  const status = await w.monitor.check();
  assert.equal(status.through, false);
  assert.equal(fired(w, TRIGGERS.LOST).length, 1);
});

test('a refused status is sent again at the next check', async (t) => {
  const w = await createWorld({ service: createService('down'), connect: false });
  t.after(() => w.app.stop());
  const original = w.gladys.setConnectionStatus.bind(w.gladys);
  let refuse = true;
  t.mock.method(w.gladys, 'setConnectionStatus', async (...args) => {
    if (refuse) {
      throw new Error('Gladys restarting');
    }
    return original(...args);
  });
  await w.gladys.connect();
  await w.app.ready;
  w.service.answer = FIXTURES.through;
  await w.monitor.check();
  refuse = false;
  await w.monitor.check();
  assert.equal(w.fake.connectionStatus.connected, true);
});

test('a refused device publication after a reconnection keeps the timer', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const w = await createWorld({ timers: true });
  t.after(() => w.app.stop());
  await w.gladys.disconnect();
  t.mock.method(w.gladys, 'publishDiscoveredDevices', async () => {
    throw new Error('Gladys not ready');
  });
  await w.gladys.connect();
  const before = w.service.requests.length;
  t.mock.timers.tick(5 * 60_000);
  for (let i = 0; i < 20; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(w.service.requests.length, before + 1);
});

test('a check works before any configuration was read (defaults)', async (t) => {
  const w = await createWorld({ connect: false });
  t.after(() => w.app.stop());
  const status = await w.monitor.check();
  assert.equal(status.through, true);
  await w.monitor.publishDevice();
  assert.equal(w.fake.discoveredDevices[0].features[0].name, 'Via Mullvad');
});
