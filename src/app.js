// -----------------------------------------------------------------------------
// Registers every SDK handler on a GladysIntegration (or the SDK's fake
// Gladys) and returns the monitor, so index.js stays a few lines and the
// tests drive the very same wiring. (Adapted from guim31/gladys-wg-easy.)
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { normalizeConfig } from './config.js';
import { Monitor, WIDGET_KEY } from './monitor.js';
import { checkNow } from './report.js';
import { INIT_FAILED } from './texts.js';
import { WIDGETS } from './widgets.js';

const logger = createLogger({ name: 'mullvad-app' });

export const ACTION_KEYS = { CHECK: 'check_now' };
export const SCENE_ACTION_KEYS = { CHECK: 'check_connection' };

/**
 * @param {object} gladys GladysIntegration instance
 * @param {object} [options] test seams: fetch, now, timers
 */
export function registerHandlers(gladys, options = {}) {
  const monitor = new Monitor({
    gladys,
    fetch: options.fetch,
    now: options.now,
    timers: options.timers ?? true,
  });

  // Every handler waits for the first setup, so nothing runs without config.
  let resolveReady;
  const ready = new Promise((resolve) => {
    resolveReady = resolve;
  });
  let started = false;
  const whenReady =
    (fn) =>
    async (...args) => {
      await ready;
      return fn(...args);
    };

  gladys.on('connected', async () => {
    try {
      const config = normalizeConfig(await gladys.getConfig());
      if (started) {
        await monitor.resync(config).catch((err) => {
          logger.debug(`Check after reconnection failed: ${err.message}`);
        });
        return;
      }
      started = true;
      // A failed first check is already reported by the monitor.
      await monitor.start(config).catch((err) => {
        if (!err.kind) {
          throw err;
        }
      });
    } catch (err) {
      logger.error('Initialization failed', err);
      await gladys.setConnectionStatus(false, INIT_FAILED).catch(() => {});
    } finally {
      resolveReady();
    }
  });

  gladys.on('disconnected', () => monitor.stop());

  gladys.onScanRequest(whenReady(() => monitor.publishDevice()));

  gladys.onSetValue(async (device, feature) => {
    throw new Error(`Mullvad features are read-only (${feature.external_id})`);
  });

  // Published with should_poll: false; serves a Gladys that would poll anyway.
  gladys.onPoll(
    whenReady(async () => {
      await monitor.check().catch(() => {});
    }),
  );

  gladys.onDeviceCreated(whenReady((device) => monitor.onDeviceCreated(device)));

  gladys.onConfigUpdated(whenReady((newConfig) => monitor.reconfigure(normalizeConfig(newConfig))));

  gladys.onAction(
    ACTION_KEYS.CHECK,
    whenReady(() => {
      logger.info('Check requested from the Configuration screen');
      return checkNow(monitor);
    }),
  );

  // Scene action: a failed check is an output (success: false), not a failed
  // action, so the scene can branch on it (a kill switch blocks the check).
  gladys.onSceneAction(
    SCENE_ACTION_KEYS.CHECK,
    whenReady(async () => {
      logger.info('Check requested by a scene');
      try {
        const status = await monitor.check();
        return {
          success: true,
          through_mullvad: status.through,
          country: status.country ?? '',
          server: status.server ?? '',
          blacklisted: status.blacklisted,
        };
      } catch {
        return {
          success: false,
          through_mullvad: false,
          country: '',
          server: '',
          blacklisted: false,
        };
      }
    }),
  );

  const widget = WIDGETS[WIDGET_KEY];
  gladys.onWidgetGet(
    WIDGET_KEY,
    whenReady((request) => widget.get(monitor, request)),
  );
  gladys.onWidgetAction(
    WIDGET_KEY,
    whenReady((actionKey, params, { settings } = {}) => {
      logger.info('Check requested from the dashboard widget');
      return widget.action(monitor, actionKey, settings);
    }),
  );

  return {
    monitor,
    ready,
    stop: () => monitor.stop(),
  };
}
