// -----------------------------------------------------------------------------
// Consistency checks between `gladys-assistant-integration.json` and the code.
// The manifest is validated by the store indexer, but nothing there can know
// which handlers the code actually registers — these tests keep both in sync.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ACTION_KEYS, SCENE_ACTION_KEYS } from '../src/app.js';
import { CHECK_INTERVALS, DEFAULT_CONFIG, LANGUAGES } from '../src/config.js';
import { TRIGGERS, WIDGET_KEY } from '../src/monitor.js';
import { WIDGETS, widgetSettings } from '../src/widgets.js';
import { FIXTURES, createWorld } from './helpers/world.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

const keysOf = (list) => (list ?? []).map((entry) => entry.key);

test('identity: name, image, cover, cloud transport, network category', () => {
  assert.equal(manifest.name, 'Mullvad VPN');
  assert.equal(manifest.type, 'device');
  assert.match(manifest.docker_image, /^ghcr\.io\/guim31\/gladys-mullvad:/);
  assert.equal(
    manifest.cover_image,
    'https://raw.githubusercontent.com/guim31/gladys-mullvad/main/cover.png',
  );
  // The check is a request to a public web service: cloud, not local.
  assert.deepEqual(manifest.transports, ['cloud']);
  assert.deepEqual(manifest.categories, ['network']);
  assert.equal(manifest.gladys_version, '>=5.1.0');
});

test('every manifest action has a handler that succeeds', async (t) => {
  assert.deepEqual(keysOf(manifest.actions), Object.values(ACTION_KEYS));
  const world = await createWorld();
  t.after(() => world.app.stop());
  for (const action of manifest.actions) {
    const ack = await world.fake.action(action.key, {});
    assert.equal(ack.success, true, `${action.key}: ${JSON.stringify(ack.error)}`);
  }
});

test('the scene action outputs are the declared ones, with their types', async (t) => {
  assert.deepEqual(keysOf(manifest.scene_actions), Object.values(SCENE_ACTION_KEYS));
  const world = await createWorld();
  t.after(() => world.app.stop());
  for (const action of manifest.scene_actions) {
    for (const answer of [FIXTURES.through, 'down']) {
      world.service.answer = answer;
      const {
        data: { outputs: data },
      } = await world.fake.sceneAction(action.key, {});
      assert.deepEqual(Object.keys(data).sort(), keysOf(action.outputs).sort());
      for (const output of action.outputs) {
        assert.equal(typeof data[output.key], output.type, `${action.key}.${output.key}`);
      }
    }
  }
});

test('the scene triggers are the ones the monitor fires, with their variables', async (t) => {
  assert.deepEqual(keysOf(manifest.scene_triggers).sort(), Object.values(TRIGGERS).sort());
  const world = await createWorld();
  t.after(() => world.app.stop());
  world.service.answer = FIXTURES.notThrough;
  await world.monitor.check();
  world.service.answer = FIXTURES.through;
  await world.monitor.check();
  world.service.answer = 'down';
  await world.monitor.check().catch(() => {});
  await world.monitor.check().catch(() => {});
  const fired = new Map(world.fake.sceneEvents.map((event) => [event.key, event.data]));
  for (const trigger of manifest.scene_triggers) {
    const data = fired.get(trigger.key);
    assert.ok(data, `${trigger.key} was fired`);
    assert.deepEqual(Object.keys(data).sort(), keysOf(trigger.variables).sort(), trigger.key);
    for (const variable of trigger.variables) {
      assert.equal(typeof data[variable.key], variable.type, `${trigger.key}.${variable.key}`);
    }
  }
});

test('the widget has a handler, and its settings defaults match the code', () => {
  assert.deepEqual(keysOf(manifest.widgets), [WIDGET_KEY]);
  assert.deepEqual(Object.keys(WIDGETS), [WIDGET_KEY]);
  const defaults = Object.fromEntries(manifest.widgets[0].settings.map((s) => [s.key, s.default]));
  assert.deepEqual(widgetSettings({}), defaults);
});

test('config_schema defaults and options stay consistent with the code', () => {
  for (const field of manifest.config_schema.filter((f) => f.type !== 'section')) {
    assert.equal(DEFAULT_CONFIG[field.key], field.default, field.key);
  }
  assert.deepEqual(
    Object.keys(DEFAULT_CONFIG).sort(),
    manifest.config_schema
      .filter((f) => f.type !== 'section')
      .map((f) => f.key)
      .sort(),
  );
  const options = (key) =>
    manifest.config_schema.find((f) => f.key === key).options.map((o) => o.value);
  assert.deepEqual(options('language'), LANGUAGES);
  assert.deepEqual(options('check_interval'), CHECK_INTERVALS);
});

test('section fields are purely presentational, with https links', () => {
  for (const section of manifest.config_schema.filter((f) => f.type === 'section')) {
    assert.equal(section.default, undefined);
    for (const link of section.links ?? []) {
      assert.match(link.url, /^https:\/\//);
    }
  }
});

test('the manifest version is the package version, and the image is tagged with it', () => {
  assert.equal(manifest.version, pkg.version);
  assert.ok(manifest.docker_image.endsWith(`:${manifest.version}`));
});

test('the catalog description holds 10 to 100 characters per language', () => {
  for (const [lang, text] of Object.entries(manifest.description)) {
    assert.ok(text.length >= 10 && text.length <= 100, `description.${lang}: ${text.length}`);
  }
});
