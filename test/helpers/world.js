// -----------------------------------------------------------------------------
// A complete test world: the SDK's fake Gladys, a fake am.i.mullvad.net and a
// manual clock, with the integration wired on top through registerHandlers.
// No timer runs unless `timers: true` (with node:test mock timers).
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { registerHandlers } from '../../src/app.js';
import { DEVICE_TYPE, PLATFORM_ID } from '../../src/devices.js';

process.env.LOG_LEVEL ??= 'silent';
process.env.TZ = 'Europe/Paris';

const load = (name) =>
  JSON.parse(readFileSync(new URL(`../fixtures/mullvad/${name}.json`, import.meta.url), 'utf8'));

export const FIXTURES = {
  notThrough: load('not-through'),
  through: load('through'),
  blacklisted: load('through-blacklisted'),
};

// 25/11/2026 20:00 UTC.
export const START = Date.UTC(2026, 10, 25, 20, 0, 0);

export function createClock(start = START) {
  const clock = {
    time: start,
    now: () => clock.time,
    advance(ms) {
      clock.time += ms;
    },
  };
  return clock;
}

/**
 * A fake am.i.mullvad.net: `answer` is the JSON served, or a mode string:
 * 'down' (network error), 'timeout', 'http500', 'html'.
 */
export function createService(answer = FIXTURES.through) {
  const service = {
    answer,
    requests: [],
    fetch: async (url, options) => {
      service.requests.push({ url, options });
      const current = service.answer;
      if (current === 'down') {
        throw new TypeError('fetch failed', { cause: { code: 'ENOTFOUND' } });
      }
      if (current === 'timeout') {
        throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
      }
      if (current === 'http500') {
        return new Response('oops', { status: 500 });
      }
      if (current === 'html') {
        return new Response('<html>captive portal</html>', { status: 200 });
      }
      return new Response(JSON.stringify(current), { status: 200 });
    },
  };
  return service;
}

export async function createWorld({
  clock = createClock(),
  service = createService(),
  config = { language: 'en' },
  devices = [],
  connect = true,
  timers = false,
} = {}) {
  const gladys = createFakeGladys({ config, devices });
  const app = registerHandlers(gladys, { fetch: service.fetch, now: clock.now, timers });
  if (connect) {
    await gladys.connect();
    await app.ready;
  }
  return { gladys, fake: gladys.fake, service, app, monitor: app.monitor, clock };
}

export const featureId = (gladys, key) => gladys.externalIds(DEVICE_TYPE, PLATFORM_ID).feature(key);

/** Add the discovered device in Gladys, as the user would. */
export async function createAll(world) {
  for (const device of world.fake.discoveredDevices) {
    await world.fake.deviceCreated(device);
  }
}
