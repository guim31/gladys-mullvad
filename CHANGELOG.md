# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

## [1.0.0] - 2026-11-25

### Added

- A _Mullvad VPN_ device: whether the traffic of Gladys goes out through Mullvad, whether the exit IP is on a
  blacklist, and the exit country, from Mullvad's public connection check (am.i.mullvad.net, no account).
- A check every 1 to 60 minutes (5 by default), and a _Check the connection now_ button showing the full result.
- Scene triggers: the connection no longer goes through Mullvad, goes through it again, the check is unreachable.
- A scene action that checks at once and gives the result to the next actions.
- A dashboard widget: yes/no, exit place, server or provider, blacklists, last check, a check button; the public IP
  on request.
- English, French, German and Spanish.

[Unreleased]: https://github.com/guim31/gladys-mullvad/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/guim31/gladys-mullvad/releases/tag/v1.0.0
