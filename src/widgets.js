// -----------------------------------------------------------------------------
// Dashboard widget (manifest `widgets`, Gladys 5.1+): `connection`.
//
// The use case: "is the house still behind Mullvad?" at a glance on a wall
// tablet. One tile (yes / no, green / red), one status list (exit place,
// server, IP on request, blacklist, last check) and a "Check now" button.
// Every optional block has a setting to hide it. Served from memory: the
// widget never calls am.i.mullvad.net by itself, only the button does.
// -----------------------------------------------------------------------------

import { WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { WIDGET_KEY } from './monitor.js';
import { checkNow, placeOf } from './report.js';
import { ERROR_TEXT, pick } from './texts.js';

export const WIDGET_ACTION = { CHECK: 'check' };

export const TEXT = {
  mullvad: { en: 'Through Mullvad', fr: 'Via Mullvad', de: 'Über Mullvad', es: 'Vía Mullvad' },
  yes: { en: 'Yes', fr: 'Oui', de: 'Ja', es: 'Sí' },
  no: { en: 'No', fr: 'Non', de: 'Nein', es: 'No' },
  exit: { en: 'Exit', fr: 'Sortie', de: 'Ausgang', es: 'Salida' },
  server: { en: 'Server', fr: 'Serveur', de: 'Server', es: 'Servidor' },
  provider: { en: 'Provider', fr: 'Fournisseur', de: 'Anbieter', es: 'Proveedor' },
  ip: { en: 'Public IP', fr: 'IP publique', de: 'Öffentliche IP', es: 'IP pública' },
  blacklist: { en: 'Blacklists', fr: 'Listes noires', de: 'Sperrlisten', es: 'Listas negras' },
  clean: { en: 'Clean', fr: 'Aucune', de: 'Keine', es: 'Ninguna' },
  listed: { en: 'Listed', fr: 'Listée', de: 'Gelistet', es: 'Listada' },
  checked: {
    en: 'Last check',
    fr: 'Dernière vérification',
    de: 'Letzte Prüfung',
    es: 'Última comprobación',
  },
  failing: {
    en: 'Check failing',
    fr: 'Vérification en échec',
    de: 'Prüfung scheitert',
    es: 'Comprobación fallida',
  },
  unknown: { en: 'Unknown', fr: 'Inconnu', de: 'Unbekannt', es: 'Desconocido' },
  button: { en: 'Check now', fr: 'Vérifier', de: 'Jetzt prüfen', es: 'Comprobar' },
  waiting: {
    en: 'Waiting for the first check of am.i.mullvad.net…',
    fr: 'En attente de la première vérification par am.i.mullvad.net…',
    de: 'Warte auf die erste Prüfung durch am.i.mullvad.net…',
    es: 'Esperando la primera comprobación de am.i.mullvad.net…',
  },
};

const fit = (text, max) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** The settings, with their defaults (manifest widget settings). */
export function widgetSettings(settings = {}) {
  const flag = (value, fallback) =>
    value === undefined || value === null ? fallback : value === true || value === 'true';
  return {
    show_server: flag(settings.show_server, true),
    show_ip: flag(settings.show_ip, false),
    show_button: flag(settings.show_button, true),
  };
}

/** Local time of a check, in the time zone of Gladys (TZ). */
function timeOf(at, language) {
  return new Intl.DateTimeFormat(language, { dateStyle: 'short', timeStyle: 'short' }).format(at);
}

export function buildContent(monitor, { settings, language = 'en' } = {}) {
  const options = widgetSettings(settings);
  const { status, error } = monitor;
  const button = options.show_button
    ? [
        {
          type: 'button',
          label: pick(TEXT.button, language),
          icon: 'refresh-cw',
          style: 'secondary',
          action: { key: WIDGET_ACTION.CHECK },
        },
      ]
    : [];
  if (!status) {
    const text = error ? (ERROR_TEXT[error.kind] ?? ERROR_TEXT.network) : TEXT.waiting;
    return {
      ttl_seconds: 30,
      components: [{ type: 'text', variant: 'body', text: pick(text, language) }, ...button],
    };
  }
  const items = [
    {
      label: pick(TEXT.exit, language),
      icon: 'map-pin',
      value: fit(placeOf(status, language), 40),
      color: WIDGET_COLORS.NEUTRAL,
    },
  ];
  if (options.show_server) {
    items.push(
      status.through
        ? {
            label: pick(TEXT.server, language),
            icon: 'server',
            value: fit(
              [status.server, status.serverType].filter(Boolean).join(' · ') ||
                pick(TEXT.unknown, language),
              40,
            ),
            color: WIDGET_COLORS.SUCCESS,
          }
        : {
            label: pick(TEXT.provider, language),
            icon: 'globe',
            value: fit(status.organization ?? pick(TEXT.unknown, language), 40),
            color: WIDGET_COLORS.WARNING,
          },
    );
  }
  if (options.show_ip) {
    items.push({
      label: pick(TEXT.ip, language),
      icon: 'hash',
      value: fit(status.ip, 40),
      color: WIDGET_COLORS.NEUTRAL,
    });
  }
  items.push({
    label: pick(TEXT.blacklist, language),
    icon: status.blacklisted ? 'alert-triangle' : 'check-circle',
    value: fit(
      status.blacklisted
        ? [pick(TEXT.listed, language), status.lists.join(', ')].filter(Boolean).join(': ')
        : pick(TEXT.clean, language),
      40,
    ),
    color: status.blacklisted ? WIDGET_COLORS.WARNING : WIDGET_COLORS.SUCCESS,
  });
  items.push(
    error
      ? {
          label: pick(TEXT.failing, language),
          icon: 'alert-circle',
          value: fit(pick(ERROR_TEXT[error.kind] ?? ERROR_TEXT.network, language), 40),
          color: WIDGET_COLORS.DANGER,
        }
      : {
          label: pick(TEXT.checked, language),
          icon: 'clock',
          value: timeOf(status.at, language),
          color: WIDGET_COLORS.NEUTRAL,
        },
  );
  return {
    ttl_seconds: 60,
    components: [
      {
        type: 'value',
        value: pick(status.through ? TEXT.yes : TEXT.no, language),
        label: pick(TEXT.mullvad, language),
        icon: status.through ? 'shield' : 'shield-off',
        color: status.through ? WIDGET_COLORS.SUCCESS : WIDGET_COLORS.DANGER,
      },
      { type: 'status', items },
      ...button,
    ],
  };
}

export const WIDGETS = {
  [WIDGET_KEY]: {
    get: (monitor, request) => buildContent(monitor, request),
    async action(monitor, actionKey) {
      if (actionKey !== WIDGET_ACTION.CHECK) {
        throw new Error(`Unknown widget action "${actionKey}"`);
      }
      return checkNow(monitor);
    },
  },
};
