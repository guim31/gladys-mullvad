// -----------------------------------------------------------------------------
// Every text the container sends to Gladys, in the four languages of its
// interface (test/i18n.test.js keeps them complete). German says "du",
// Spanish "usted". Mullvad is a brand: never translated.
// -----------------------------------------------------------------------------

import { LANGUAGES } from './config.js';

/** The text of `texts` in `language`, English when unknown. */
export function pick(texts, language) {
  return texts[LANGUAGES.includes(language) ? language : 'en'];
}

/** A `{ en, fr, de, es }` object whose `{name}` placeholders are filled in. */
export function format(texts, vars = {}) {
  return Object.fromEntries(
    LANGUAGES.map((lang) => [
      lang,
      texts[lang].replace(/\{(\w+)\}/g, (match, name) =>
        name in vars ? String(vars[name]) : match,
      ),
    ]),
  );
}

/**
 * A failure shown in red by Gladys: the handler throws, the SDK sends
 * `success: false` and the multi-language object as the error.
 */
export class ActionFailure extends Error {
  constructor(text) {
    super(text.en);
    this.message = text;
  }
}

/** Feature names, in the configured language (frozen at creation in Gladys). */
export const NAMES = {
  en: {
    through_mullvad: 'Through Mullvad',
    blacklisted: 'IP blacklisted',
    country: 'Exit country',
  },
  fr: {
    through_mullvad: 'Via Mullvad',
    blacklisted: 'IP sur liste noire',
    country: 'Pays de sortie',
  },
  de: {
    through_mullvad: 'Über Mullvad',
    blacklisted: 'IP auf Sperrliste',
    country: 'Ausgangsland',
  },
  es: {
    through_mullvad: 'A través de Mullvad',
    blacklisted: 'IP en lista negra',
    country: 'País de salida',
  },
};

/** Why a check failed, by error kind (src/mullvad.js). */
export const ERROR_TEXT = {
  network: {
    en: 'am.i.mullvad.net cannot be reached (no Internet?)',
    fr: 'am.i.mullvad.net est injoignable (pas d’Internet ?)',
    de: 'am.i.mullvad.net ist nicht erreichbar (kein Internet?)',
    es: 'am.i.mullvad.net no responde (¿sin Internet?)',
  },
  timeout: {
    en: 'am.i.mullvad.net did not answer within 15 s',
    fr: 'am.i.mullvad.net n’a pas répondu en 15 s',
    de: 'am.i.mullvad.net hat nicht innerhalb von 15 s geantwortet',
    es: 'am.i.mullvad.net no respondió en 15 s',
  },
  http: {
    en: 'am.i.mullvad.net answered with an error',
    fr: 'am.i.mullvad.net a répondu par une erreur',
    de: 'am.i.mullvad.net hat mit einem Fehler geantwortet',
    es: 'am.i.mullvad.net respondió con un error',
  },
  invalid: {
    en: 'am.i.mullvad.net sent an unexpected answer',
    fr: 'am.i.mullvad.net a envoyé une réponse inattendue',
    de: 'am.i.mullvad.net hat eine unerwartete Antwort gesendet',
    es: 'am.i.mullvad.net envió una respuesta inesperada',
  },
};

/** The connection status when the post-connection setup fails. */
export const INIT_FAILED = {
  en: 'Initialization failed, check the integration logs.',
  fr: "L'initialisation a échoué, consultez les logs de l'intégration.",
  de: 'Initialisierung fehlgeschlagen, prüfe die Logs der Integration.',
  es: 'La inicialización falló, consulte los registros de la integración.',
};

/** The messages of the "Check now" button (Configuration screen, widget). */
export const REPORT_TEXT = {
  through: {
    en: 'Through Mullvad: yes, server {server} ({place}).{ip} {listed}',
    fr: 'Via Mullvad : oui, serveur {server} ({place}).{ip} {listed}',
    de: 'Über Mullvad: ja, Server {server} ({place}).{ip} {listed}',
    es: 'A través de Mullvad: sí, servidor {server} ({place}).{ip} {listed}',
  },
  notThrough: {
    en: 'Through Mullvad: NO. Exit {place}, provider {organization}.{ip} {listed}',
    fr: 'Via Mullvad : NON. Sortie {place}, fournisseur {organization}.{ip} {listed}',
    de: 'Über Mullvad: NEIN. Ausgang {place}, Anbieter {organization}.{ip} {listed}',
    es: 'A través de Mullvad: NO. Salida {place}, proveedor {organization}.{ip} {listed}',
  },
  clean: {
    en: 'On no blacklist.',
    fr: 'Sur aucune liste noire.',
    de: 'Auf keiner Sperrliste.',
    es: 'En ninguna lista negra.',
  },
  listed: {
    en: 'On a blacklist: {lists}.',
    fr: 'Sur liste noire : {lists}.',
    de: 'Auf einer Sperrliste: {lists}.',
    es: 'En lista negra: {lists}.',
  },
  unknown: { en: 'unknown', fr: 'inconnu', de: 'unbekannt', es: 'desconocido' },
  failed: {
    en: 'Check failed: {error}.',
    fr: 'Vérification impossible : {error}.',
    de: 'Prüfung fehlgeschlagen: {error}.',
    es: 'Comprobación fallida: {error}.',
  },
};
