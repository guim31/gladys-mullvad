// -----------------------------------------------------------------------------
// The am.i.mullvad.net client: real (anonymized) and rebuilt answers, and
// every way the check can fail.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHECK_URL,
  CheckError,
  ERROR_KINDS,
  checkConnection,
  parseAnswer,
} from '../src/mullvad.js';
import { FIXTURES, createService } from './helpers/world.js';

test('the real answer of a connection without VPN', async () => {
  const service = createService(FIXTURES.notThrough);
  const status = await checkConnection(service.fetch);
  assert.equal(service.requests[0].url, CHECK_URL);
  assert.deepEqual(status, {
    through: false,
    ip: '198.51.100.42',
    country: 'France',
    city: null,
    organization: 'Example Telecom',
    server: null,
    serverType: null,
    blacklisted: false,
    lists: [],
  });
});

test('an answer through Mullvad gives the server', () => {
  const status = parseAnswer(FIXTURES.through);
  assert.equal(status.through, true);
  assert.equal(status.server, 'se-sto-wg-001');
  assert.equal(status.serverType, 'WireGuard');
  assert.equal(status.city, 'Stockholm');
  assert.equal(status.blacklisted, false);
});

test('a blacklisted exit names the lists it is on', () => {
  const status = parseAnswer(FIXTURES.blacklisted);
  assert.equal(status.blacklisted, true);
  assert.deepEqual(status.lists, ['spamhaus.org']);
});

test('a server name is ignored when the exit is not Mullvad', () => {
  const status = parseAnswer({ ...FIXTURES.notThrough, mullvad_exit_ip_hostname: 'x' });
  assert.equal(status.server, null);
});

for (const [label, body] of [
  ['null', null],
  ['an array', []],
  ['no mullvad_exit_ip', { ip: '192.0.2.1' }],
  ['a string mullvad_exit_ip', { ip: '192.0.2.1', mullvad_exit_ip: 'true' }],
  ['no ip', { mullvad_exit_ip: true }],
]) {
  test(`an invalid answer is refused (${label})`, () => {
    assert.throws(
      () => parseAnswer(body),
      (err) => err instanceof CheckError && err.kind === ERROR_KINDS.INVALID,
    );
  });
}

for (const [mode, kind] of [
  ['down', ERROR_KINDS.NETWORK],
  ['timeout', ERROR_KINDS.TIMEOUT],
  ['http500', ERROR_KINDS.HTTP],
  ['html', ERROR_KINDS.INVALID],
]) {
  test(`a failure is typed (${mode} → ${kind})`, async () => {
    await assert.rejects(checkConnection(createService(mode).fetch), (err) => err.kind === kind);
  });
}
