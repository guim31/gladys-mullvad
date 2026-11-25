// -----------------------------------------------------------------------------
// The one device of the integration: the Internet connection of Gladys as
// seen from am.i.mullvad.net. Three read-only features. The exit IP and the
// Mullvad server are deliberately NOT features (privacy: no history of the
// public IP in the database); they show in the widget and the action message.
// -----------------------------------------------------------------------------

import { DEVICE_FEATURE_CATEGORIES, DEVICE_FEATURE_TYPES } from '@gladysassistant/integration-sdk';
import { NAMES, pick } from './texts.js';

export const DEVICE_TYPE = 'mullvad';
// A single connection per installation: the platform id is a constant.
export const PLATFORM_ID = 'connection';

/** Feature keys: frozen, they are part of the external ids. */
export const FEATURE_KEYS = {
  THROUGH: 'through_mullvad',
  BLACKLISTED: 'blacklisted',
  COUNTRY: 'country',
};

export const ids = (gladys) => gladys.externalIds(DEVICE_TYPE, PLATFORM_ID);

/** The discovery payload, feature names in `language`. */
export function buildDevice(gladys, language) {
  const id = ids(gladys);
  const names = pick(NAMES, language);
  const binary = (key, keepHistory) => ({
    name: names[key],
    external_id: id.feature(key),
    category: DEVICE_FEATURE_CATEGORIES.INPUT,
    type: DEVICE_FEATURE_TYPES.INPUT.BINARY,
    min: 0,
    max: 1,
    read_only: true,
    has_feedback: false,
    keep_history: keepHistory,
  });
  return {
    name: 'Mullvad VPN',
    external_id: id.device,
    // The container checks on its own timer (minutes, beyond Gladys' list).
    should_poll: false,
    features: [
      binary(FEATURE_KEYS.THROUGH, true),
      binary(FEATURE_KEYS.BLACKLISTED, true),
      {
        name: names[FEATURE_KEYS.COUNTRY],
        external_id: id.feature(FEATURE_KEYS.COUNTRY),
        category: DEVICE_FEATURE_CATEGORIES.TEXT,
        type: DEVICE_FEATURE_TYPES.TEXT.TEXT,
        min: 0,
        max: 0,
        read_only: true,
        has_feedback: false,
        keep_history: false,
      },
    ],
  };
}

/** The states of a parsed answer (src/mullvad.js). A text is never empty. */
export function statesOf(gladys, status) {
  const id = ids(gladys);
  const states = [
    { device_feature_external_id: id.feature(FEATURE_KEYS.THROUGH), state: status.through ? 1 : 0 },
    {
      device_feature_external_id: id.feature(FEATURE_KEYS.BLACKLISTED),
      state: status.blacklisted ? 1 : 0,
    },
  ];
  if (status.country) {
    states.push({
      device_feature_external_id: id.feature(FEATURE_KEYS.COUNTRY),
      text: status.country,
    });
  }
  return states;
}
