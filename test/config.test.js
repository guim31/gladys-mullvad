import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, intervalMs, normalizeConfig } from '../src/config.js';

test('defaults fill an empty or invalid configuration', () => {
  assert.deepEqual(normalizeConfig(), DEFAULT_CONFIG);
  assert.deepEqual(normalizeConfig(null), DEFAULT_CONFIG);
  assert.deepEqual(normalizeConfig({ check_interval: '3', language: 'it' }), DEFAULT_CONFIG);
});

test('the interval is bounded to the offered values, in minutes', () => {
  assert.equal(intervalMs(normalizeConfig({ check_interval: 60 })), 3600_000);
  assert.equal(intervalMs(normalizeConfig({ check_interval: '1' })), 60_000);
  assert.equal(intervalMs(normalizeConfig({})), 5 * 60_000);
});
