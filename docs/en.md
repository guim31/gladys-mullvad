# Mullvad VPN

Checks that the Internet connection of your house really goes out through the
[Mullvad VPN](https://mullvad.net/), the way the Mullvad website's connection check does, and warns your scenes when
it stops. Developed without a Mullvad tunnel on the developer's side: feedback welcome.

## What you get

A **Mullvad VPN** device with three read-only features:

- **Through Mullvad**: 1 when the traffic of Gladys leaves the Internet from a Mullvad server, 0 otherwise.
- **IP blacklisted**: 1 when the exit IP is on a blacklist known to Mullvad (spam lists…).
- **Exit country**: the country the Internet sees your traffic come from.

The public IP and the Mullvad server are deliberately **not** features, so they are never kept in the history: they
show in the widget (IP only if you ask) and in the message of the **Check the connection now** button.

## How it works

Every few minutes the integration asks `https://am.i.mullvad.net/json`, Mullvad's public connection check (no
account, no key). Only **the traffic of Gladys** is checked: it tells you whether the house is behind Mullvad when
the VPN runs on your router or on the machine hosting Gladys, not whether another computer of the house uses it.

## Installation

In Gladys, go to **Integrations → Install from GitHub** and enter `https://github.com/guim31/gladys-mullvad`. Then
open the **Discover** tab of the integration and add the **Mullvad VPN** device.

## Configuration

- **Check interval**: 1 to 60 minutes, 5 by default. One small request each time.
- **Language of the feature names**: the language of the feature names (frozen when the device is added) and of the
  messages. French by default.

## Dashboard widget

The **Mullvad VPN** widget shows, at a glance: a green "Yes" or a red "No", the exit place, the Mullvad server in use
(or your provider when not through Mullvad), the blacklists and the time of the last check. Its settings:

- **Show the server or provider** (on by default);
- **Show the public IP** (off by default: anyone looking at the dashboard would see it);
- **Show the "Check now" button** (on by default).

## Scenes

Triggers:

- **Connection no longer goes through Mullvad**: a check sees the traffic leave outside Mullvad, after it went
  through it. Variable: exit country.
- **Connection goes through Mullvad again**: variables: exit country, Mullvad server.
- **Mullvad check unreachable**: two checks in a row failed. Often an Internet outage, or a kill switch blocking the
  traffic while the tunnel is down. Variable: error. Fired once per outage.

Action: **Check the Mullvad connection** checks at once and gives `success`, `through_mullvad`, `country`, `server`
and `blacklisted` to the next actions. When the check cannot run, `success` is false: test it first.

The first check after a start never fires a trigger (there is nothing to compare with).

## Check the connection now

In the integration's Configuration screen, the **Check the connection now** button checks at once and shows the
result: through Mullvad or not, server, exit place, provider, public IP and blacklists. It turns red when
am.i.mullvad.net cannot be reached.

## Limits and privacy

- Only the traffic of the Gladys integration container is checked (see "How it works").
- While the check fails, the features keep their last known value: a failed check says nothing about the tunnel.
- am.i.mullvad.net is a free public service of Mullvad without a published quota: keep a reasonable interval (one
  request every 5 minutes by default). Mullvad sees the request, as for any visit to its website.
- Nothing is stored on disk, and the public IP is never written to the logs.

## Troubleshooting

- "am.i.mullvad.net cannot be reached": check the Internet connection of Gladys, or your kill switch.
- Feature names in the wrong language: change the language, then delete and add the device again (names are frozen at
  creation).
- More details with `LOG_LEVEL=debug`. Report problems on
  [GitHub](https://github.com/guim31/gladys-mullvad/issues).

This integration is not affiliated with Mullvad VPN AB.
