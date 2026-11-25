// -----------------------------------------------------------------------------
// The "Check now" button, the scene action and the widget.
// Success is green (returned), failure red (thrown: ack.success false).
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { buildDevice } from '../src/devices.js';
import { WIDGET_KEY } from '../src/monitor.js';
import { WIDGET_ACTION } from '../src/widgets.js';
import { FIXTURES, createService, createWorld } from './helpers/world.js';

test('"Check now" reports the exit, the server and the IP', async (t) => {
  const w = await createWorld();
  t.after(() => w.app.stop());
  const ack = await w.fake.action('check_now', {});
  assert.equal(ack.success, true);
  assert.match(
    ack.data.message.fr,
    /Via Mullvad : oui, serveur se-sto-wg-001 · WireGuard \(Stockholm, Sweden\)/,
  );
  assert.match(ack.data.message.en, /IP 192\.0\.2\.23\. On no blacklist\./);
  for (const text of Object.values(ack.data.message)) {
    assert.ok(text.length <= 200, text);
  }
});

test('"Check now" says loudly when the traffic is not through Mullvad, and the lists', async (t) => {
  const w = await createWorld({ service: createService(FIXTURES.notThrough) });
  t.after(() => w.app.stop());
  let ack = await w.fake.action('check_now', {});
  assert.equal(ack.success, true);
  assert.match(ack.data.message.en, /Through Mullvad: NO\. Exit France, provider Example Telecom/);
  w.service.answer = FIXTURES.blacklisted;
  ack = await w.fake.action('check_now', {});
  assert.match(ack.data.message.es, /En lista negra: spamhaus\.org\./);
});

test('"Check now" fails in red when am.i.mullvad.net cannot be reached', async (t) => {
  const w = await createWorld();
  t.after(() => w.app.stop());
  w.service.answer = 'down';
  const ack = await w.fake.action('check_now', {});
  assert.equal(ack.success, false);
  assert.match(ack.error.fr, /^Vérification impossible : am\.i\.mullvad\.net est injoignable/);
  assert.ok(ack.error.de && ack.error.es && ack.error.en);
});

test('the scene action gives the result, and success: false on failure', async (t) => {
  const w = await createWorld();
  t.after(() => w.app.stop());
  let ack = await w.fake.sceneAction('check_connection', {});
  assert.deepEqual(ack.data.outputs, {
    success: true,
    through_mullvad: true,
    country: 'Sweden',
    server: 'se-sto-wg-001',
    blacklisted: false,
  });
  w.service.answer = 'http500';
  ack = await w.fake.sceneAction('check_connection', {});
  assert.equal(ack.success, true);
  assert.equal(ack.data.outputs.success, false);
});

test('the widget: valid content, bound to nothing, IP hidden by default', async (t) => {
  const w = await createWorld();
  t.after(() => w.app.stop());
  const ack = await w.fake.widgetGet(WIDGET_KEY, { settings: {}, language: 'fr' });
  assert.equal(ack.success, true);
  const { content } = ack.data;
  assert.deepEqual(validateWidgetContent(content), []);
  assert.equal(content.components[0].value, 'Oui');
  const all = JSON.stringify(content);
  assert.ok(!all.includes('192.0.2.23'), 'no IP unless asked');
  assert.ok(all.includes('se-sto-wg-001'));
  // No device_feature binding: the widget works before the device is added.
  const ids = new Set(buildDevice(w.gladys, 'en').features.map((f) => f.external_id));
  for (const component of content.components) {
    if (component.device_feature) {
      assert.ok(ids.has(component.device_feature));
    }
  }
});

test('the widget settings hide the server and the button, show the IP', async (t) => {
  const w = await createWorld();
  t.after(() => w.app.stop());
  const settings = { show_server: false, show_ip: true, show_button: false };
  const {
    data: { content: data },
  } = await w.fake.widgetGet(WIDGET_KEY, { settings, language: 'en' });
  assert.deepEqual(validateWidgetContent(data), []);
  const all = JSON.stringify(data);
  assert.ok(all.includes('192.0.2.23'));
  assert.ok(!all.includes('se-sto-wg-001'));
  assert.ok(!data.components.some((c) => c.type === 'button'));
});

test('the widget before any answer, and during an outage', async (t) => {
  const w = await createWorld({ service: createService('down') });
  t.after(() => w.app.stop());
  let data = (await w.fake.widgetGet(WIDGET_KEY, { settings: {}, language: 'en' })).data.content;
  assert.deepEqual(validateWidgetContent(data), []);
  assert.match(data.components[0].text, /cannot be reached/);
  w.service.answer = FIXTURES.notThrough;
  await w.monitor.check();
  w.service.answer = 'down';
  await w.monitor.check().catch(() => {});
  data = (await w.fake.widgetGet(WIDGET_KEY, { settings: {}, language: 'es' })).data.content;
  assert.deepEqual(validateWidgetContent(data), []);
  assert.equal(data.components[0].value, 'No');
  assert.ok(JSON.stringify(data).includes('Comprobación fallida'));
});

test('the widget button checks, and fails in red', async (t) => {
  const w = await createWorld();
  t.after(() => w.app.stop());
  let ack = await w.fake.widgetAction(WIDGET_KEY, WIDGET_ACTION.CHECK, {}, { settings: {} });
  assert.equal(ack.success, true);
  assert.match(ack.data.message.en, /^Through Mullvad: yes/);
  w.service.answer = 'timeout';
  ack = await w.fake.widgetAction(WIDGET_KEY, WIDGET_ACTION.CHECK, {}, { settings: {} });
  assert.equal(ack.success, false);
  assert.match(ack.error.fr, /15 s/);
});
