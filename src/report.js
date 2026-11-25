// -----------------------------------------------------------------------------
// "Check now": the message of the Configuration button and the toast of the
// widget button. Success is returned (green), failure thrown (red).
// -----------------------------------------------------------------------------

import { ActionFailure, ERROR_TEXT, REPORT_TEXT, format, pick } from './texts.js';
import { LANGUAGES } from './config.js';

/** "Stockholm, Sweden", "France", or "unknown". */
export function placeOf(status, language) {
  const parts = [status.city, status.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : pick(REPORT_TEXT.unknown, language);
}

const fit = (text, max) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/**
 * The `{ en, fr, de, es }` report of a parsed answer, under the 200
 * characters of a Gladys toast. `ip: false` leaves the public IP out (the
 * widget button, when the widget hides it).
 */
export function report(status, { ip = true } = {}) {
  return Object.fromEntries(
    LANGUAGES.map((lang) => {
      const listed = status.blacklisted
        ? format(REPORT_TEXT.listed, {
            lists: fit(status.lists.join(', '), 30) || REPORT_TEXT.unknown[lang],
          })[lang]
        : REPORT_TEXT.clean[lang];
      const template = status.through ? REPORT_TEXT.through : REPORT_TEXT.notThrough;
      const server = [status.server, status.serverType].filter(Boolean).join(' · ');
      return [
        lang,
        format(template, {
          server: fit(server || REPORT_TEXT.unknown[lang], 40),
          place: fit(placeOf(status, lang), 30),
          organization: fit(status.organization ?? REPORT_TEXT.unknown[lang], 24),
          ip: ip ? ` IP ${status.ip}.` : '',
          listed,
        })[lang],
      ];
    }),
  );
}

/** Run a check for a user; resolve with the report or throw an ActionFailure. */
export async function checkNow(monitor, options) {
  let status;
  try {
    status = await monitor.check();
  } catch (err) {
    const error = ERROR_TEXT[err.kind] ?? ERROR_TEXT.network;
    throw new ActionFailure(
      Object.fromEntries(
        LANGUAGES.map((lang) => [lang, format(REPORT_TEXT.failed, { error: error[lang] })[lang]]),
      ),
    );
  }
  return report(status, options);
}
