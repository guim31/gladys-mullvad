// -----------------------------------------------------------------------------
// The check loop: asks am.i.mullvad.net every `check_interval` minutes (own
// timer: Gladys only polls up to once a minute, and never polls a device
// created without should_poll, GladysAssistant/Gladys#3198), publishes the
// changed states, fires the scene triggers and reports the status.
//
// A failed check is retried once 30 s later; the second failure in a row is
// an outage: one log line, the status turns red, `check_failed` fires once.
// The states keep their last known value meanwhile: an unreachable check
// says nothing about the tunnel (a kill switch blocks it too, which is what
// `check_failed` is for).
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { intervalMs } from './config.js';
import { buildDevice, ids, statesOf } from './devices.js';
import { checkConnection } from './mullvad.js';
import { ERROR_TEXT, pick } from './texts.js';

const logger = createLogger({ name: 'mullvad' });

export const WIDGET_KEY = 'connection';

/** Scene trigger keys: frozen once published. */
export const TRIGGERS = {
  LOST: 'mullvad_lost',
  RESTORED: 'mullvad_restored',
  FAILED: 'check_failed',
};

export const RETRY_MS = 30_000;
// Re-send unchanged values so Gladys never shows "no recent value" (48 h).
export const HEARTBEAT_MS = 12 * 3600_000;

export class Monitor {
  /**
   * @param {object} options
   * @param {object} options.gladys GladysIntegration (or the SDK's fake)
   * @param {typeof fetch} [options.fetch] test seam
   * @param {() => number} [options.now] clock
   * @param {boolean} [options.timers] false in tests: no timer is armed
   */
  constructor({ gladys, fetch: fetchImpl, now = Date.now, timers = true }) {
    this.gladys = gladys;
    this.fetch = fetchImpl;
    this.now = now;
    this.timers = timers;
    this.config = null;
    /** Last successful answer (parsed), with `at` (ms). */
    this.status = null;
    /** Last failure: { kind, at }, null once a check works again. */
    this.error = null;
    this.failures = 0;
    this.timer = null;
    this.running = null;
    this.stopped = false;
  }

  async start(config) {
    this.config = config;
    this.stopped = false;
    logger.info(`Checking the connection every ${config.check_interval} min`);
    await this.publishDevice();
    await this.check();
  }

  /** After a reconnection: Gladys may have restarted, send everything again. */
  async resync(config) {
    this.config = config;
    this.stopped = false;
    this.gladys.forgetPublishedStates?.();
    await this.publishDevice();
    await this.check();
  }

  async reconfigure(config) {
    const intervalChanged = config.check_interval !== this.config?.check_interval;
    this.config = config;
    await this.publishDevice();
    if (intervalChanged) {
      logger.info(`Checking the connection every ${config.check_interval} min`);
      this.schedule(intervalMs(config));
    }
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.timer);
    this.timer = null;
  }

  publishDevice() {
    return this.gladys.publishDiscoveredDevices([buildDevice(this.gladys, this.config.language)]);
  }

  schedule(delay) {
    clearTimeout(this.timer);
    this.timer = null;
    if (!this.timers || this.stopped) {
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      this.check().catch((err) => logger.error('Check loop failed', err));
    }, delay);
    this.timer.unref?.();
  }

  /**
   * One check. Concurrent callers (timer, button, scene) share the same one.
   * Resolves with the parsed answer, rejects with a CheckError.
   */
  check() {
    if (!this.running) {
      this.running = this.runCheck().finally(() => {
        this.running = null;
      });
    }
    return this.running;
  }

  async runCheck() {
    let status;
    let failure = null;
    try {
      status = await checkConnection(this.fetch);
    } catch (err) {
      failure = err;
    }
    try {
      if (failure) {
        await this.onFailure(failure);
      } else {
        await this.onSuccess(status);
      }
    } finally {
      // Whatever happens, the next one is scheduled (sooner after a first failure).
      if (!this.stopped) {
        this.schedule(failure && this.failures === 1 ? RETRY_MS : intervalMs(this.config));
      }
    }
    if (failure) {
      throw failure;
    }
    return status;
  }

  async onSuccess(status) {
    const previous = this.status;
    const wasDown = this.failures >= 2;
    this.failures = 0;
    this.error = null;
    this.status = { ...status, at: this.now() };
    if (wasDown) {
      logger.info('am.i.mullvad.net answers again');
    }
    if (!previous || wasDown) {
      await this.gladys.setConnectionStatus(true).catch((err) => {
        logger.debug(`Connection status refused: ${err.message}`);
      });
    }
    // Never log the IP: only whether the traffic goes through Mullvad.
    logger.debug(`Check done: through Mullvad = ${status.through}`);
    await this.gladys.publishChangedStates(statesOf(this.gladys, status), {
      heartbeat: HEARTBEAT_MS,
    });
    if (previous && previous.through !== status.through) {
      logger.info(
        status.through
          ? 'The connection goes through Mullvad again'
          : 'The connection no longer goes through Mullvad',
      );
      await this.fire(
        status.through ? TRIGGERS.RESTORED : TRIGGERS.LOST,
        status.through
          ? { country: status.country ?? '', server: status.server ?? '' }
          : { country: status.country ?? '' },
      );
    }
    if (!previous || previous.through !== status.through || wasDown) {
      this.refreshWidget();
    }
  }

  async onFailure(err) {
    this.failures += 1;
    this.error = { kind: err.kind ?? 'network', at: this.now() };
    if (this.failures !== 2) {
      logger.debug(`Check failed (${this.failures} in a row): ${err.message}`);
      return;
    }
    // Second failure in a row: an outage, said once.
    logger.error(`Connection check failed: ${err.message}`);
    const text = ERROR_TEXT[this.error.kind] ?? ERROR_TEXT.network;
    await this.gladys.setConnectionStatus(false, text).catch((error) => {
      logger.debug(`Connection status refused: ${error.message}`);
    });
    await this.fire(TRIGGERS.FAILED, { error: pick(text, this.config?.language) });
    this.refreshWidget();
  }

  async fire(key, data) {
    try {
      await this.gladys.publishSceneEvent(key, data);
    } catch (err) {
      logger.debug(`Scene event ${key} refused: ${err.message}`);
    }
  }

  refreshWidget() {
    try {
      this.gladys.requestWidgetRefresh?.(WIDGET_KEY);
    } catch (err) {
      logger.debug(`Widget refresh refused: ${err.message}`);
    }
  }

  /** The device was just added: publish what we know (Gladys dropped it). */
  async onDeviceCreated(device) {
    if (device?.external_id !== ids(this.gladys).device) {
      return;
    }
    if (this.status) {
      this.gladys.forgetPublishedStates?.(device.external_id);
      await this.gladys.publishChangedStates(statesOf(this.gladys, this.status), {
        heartbeat: HEARTBEAT_MS,
      });
    }
    this.refreshWidget();
  }
}
