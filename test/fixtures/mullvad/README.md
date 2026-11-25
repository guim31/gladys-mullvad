# Fixtures of am.i.mullvad.net

- `not-through.json`: a **real** answer of `https://am.i.mullvad.net/json`, recorded on 25/11/2026 from a home
  connection without VPN; the IP and the provider are replaced by a documentation address (198.51.100.0/24, "Example Telecom").
- `through.json`, `through-blacklisted.json`: answers **rebuilt** from the documented format of the same endpoint
  (fields `mullvad_exit_ip_hostname`, `mullvad_server_type` and the `blacklisted.results` list), with documentation
  addresses (192.0.2.0/24): not recorded through a real tunnel.
