// -----------------------------------------------------------------------------
// Integration configuration: defaults (mirroring the manifest `config_schema`)
// and normalization, so the rest of the code never deals with `undefined`.
// -----------------------------------------------------------------------------

/** The languages of the Gladys interface, the feature names and messages. */
export const LANGUAGES = ['en', 'fr', 'de', 'es'];

/**
 * Minutes between two checks, offered as a select: a `number` field is
 * rendered without `step` by Gladys. Bounded on both sides: once a minute at
 * most (a free public service, be gentle), once an hour at least.
 */
export const CHECK_INTERVALS = ['1', '2', '5', '10', '15', '30', '60'];

export const DEFAULT_CONFIG = {
  check_interval: '5',
  language: 'fr',
};

/**
 * Merge the configuration received from Gladys with the defaults.
 * @param {Record<string, unknown>} [raw]
 */
export function normalizeConfig(raw = {}) {
  const interval = String(raw?.check_interval ?? '');
  const language = String(raw?.language ?? '');
  return {
    check_interval: CHECK_INTERVALS.includes(interval) ? interval : DEFAULT_CONFIG.check_interval,
    language: LANGUAGES.includes(language) ? language : DEFAULT_CONFIG.language,
  };
}

/** The check interval of a normalized configuration, in milliseconds. */
export function intervalMs(config) {
  return Number(config.check_interval) * 60_000;
}
