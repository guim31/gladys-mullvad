# Mullvad VPN for Gladys Assistant

A [Gladys Assistant](https://gladysassistant.com) external integration that checks that the Internet connection of
your house really goes out through the [Mullvad VPN](https://mullvad.net/), using Mullvad's public connection check
`https://am.i.mullvad.net/json` (no account, no key).

Developed without a Mullvad tunnel on the developer's side: the "not through Mullvad" case was tested against the
real service, the "through Mullvad" case on rebuilt answers. Feedback welcome.

## Features

- **One device**, _Mullvad VPN_: through Mullvad (yes/no), IP blacklisted (yes/no), exit country. The public IP and
  the Mullvad server are deliberately not features (no history of your IP in the database).
- **Dashboard widget** _Mullvad VPN_: yes/no, exit place, Mullvad server or provider, blacklists, last check, a
  "Check now" button; the public IP on request.
- **Scene triggers**: _Connection no longer goes through Mullvad_, _Connection goes through Mullvad again_, _Mullvad
  check unreachable_ (two failed checks in a row: Internet down or a kill switch).
- **Scene action** _Check the Mullvad connection_, whose result feeds the next actions.
- **Configuration button** _Check the connection now_: the full result, IP included.
- Check every 1 to 60 minutes (5 by default), on the container's own timer.
- Four languages: English, French, German, Spanish.

## Requirements

- Gladys Assistant 5.1.0 or later.
- The traffic to check must go through Gladys' own route: the VPN runs on your router, or on the machine hosting
  Gladys. Only the traffic of the integration container is checked.

## Installation

In Gladys: **Integrations → Install from GitHub**, then `https://github.com/guim31/gladys-mullvad`. Open the
**Discover** tab of the integration and add the device. The user documentation is in [docs/en.md](docs/en.md)
([fr](docs/fr.md), [de](docs/de.md), [es](docs/es.md)).

## Limits

- am.i.mullvad.net is a free public service of Mullvad, without a published quota: the interval is bounded to one
  request a minute at most, one every 5 minutes by default.
- While the check fails, the features keep their last known value (a failure says nothing about the tunnel).
- The first check after a start never fires a trigger.

## Development

```bash
npm ci
npm run format:check && npm run lint && npm test
npx -y github:GladysAssistant/integration-store --skip-image-check .
```

The tests run against the SDK's fake Gladys and a fake am.i.mullvad.net; they never touch the network. See
[CLAUDE.md](CLAUDE.md) for the architecture and the pitfalls.

## Credits

- The equivalent [Home Assistant integration](https://www.home-assistant.io/integrations/mullvad/) (Apache 2.0) and
  its [`mullvad-api`](https://pypi.org/project/mullvad-api/) library, which read the same endpoint.
- Built from the official
  [Gladys integration template](https://github.com/GladysAssistant/integration-template-js) and
  [SDK](https://github.com/GladysAssistant/integration-sdk-js).
- The cover uses the official Mullvad logo ([Wikimedia Commons, `Mullvad_logo.svg`](https://commons.wikimedia.org/wiki/File:Mullvad_logo.svg), wordmark set in white), a trademark of Mullvad VPN AB, used to name the service.

This integration is not affiliated with, nor endorsed by, Mullvad VPN AB.

## License

[Apache-2.0](LICENSE)
