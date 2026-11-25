// -----------------------------------------------------------------------------
// Client of the public Mullvad connection check, https://am.i.mullvad.net/json
// (no account, no key): what the Internet sees of this container's traffic —
// exit IP, its location, whether it is a Mullvad exit, and the blacklists it
// is on. The same endpoint the Mullvad website's "Connection check" uses.
// -----------------------------------------------------------------------------

export const CHECK_URL = 'https://am.i.mullvad.net/json';
export const TIMEOUT_MS = 15_000;

export const ERROR_KINDS = {
  NETWORK: 'network',
  TIMEOUT: 'timeout',
  HTTP: 'http',
  INVALID: 'invalid',
};

export class CheckError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}

const text = (value) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null);

/**
 * The useful part of an answer, or a CheckError `invalid`.
 * @param {unknown} body the parsed JSON
 */
export function parseAnswer(body) {
  if (
    !body ||
    typeof body !== 'object' ||
    typeof body.mullvad_exit_ip !== 'boolean' ||
    !text(body.ip)
  ) {
    throw new CheckError(ERROR_KINDS.INVALID, 'unexpected answer (no ip or mullvad_exit_ip)');
  }
  const results = Array.isArray(body.blacklisted?.results) ? body.blacklisted.results : [];
  const lists = results
    .filter((entry) => entry?.blacklisted === true)
    .map((entry) => text(entry.name))
    .filter(Boolean);
  return {
    through: body.mullvad_exit_ip,
    ip: text(body.ip),
    country: text(body.country),
    city: text(body.city),
    organization: text(body.organization),
    server: body.mullvad_exit_ip ? text(body.mullvad_exit_ip_hostname) : null,
    serverType: body.mullvad_exit_ip ? text(body.mullvad_server_type) : null,
    blacklisted: body.blacklisted?.blacklisted === true || lists.length > 0,
    lists,
  };
}

/**
 * Ask am.i.mullvad.net. Resolves with parseAnswer(), rejects with a
 * CheckError whose `kind` is one of ERROR_KINDS.
 * @param {typeof fetch} [fetchImpl] test seam
 */
export async function checkConnection(fetchImpl = fetch) {
  let response;
  try {
    response = await fetchImpl(CHECK_URL, {
      headers: { accept: 'application/json', 'user-agent': 'gladys-mullvad' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new CheckError(ERROR_KINDS.TIMEOUT, `no answer within ${TIMEOUT_MS / 1000} s`);
    }
    throw new CheckError(ERROR_KINDS.NETWORK, err?.cause?.code ?? err?.message ?? 'fetch failed');
  }
  if (!response.ok) {
    throw new CheckError(ERROR_KINDS.HTTP, `HTTP ${response.status}`);
  }
  let raw;
  try {
    raw = await response.text();
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new CheckError(ERROR_KINDS.TIMEOUT, `no answer within ${TIMEOUT_MS / 1000} s`);
    }
    throw new CheckError(ERROR_KINDS.NETWORK, err?.cause?.code ?? err?.message ?? 'read failed');
  }
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new CheckError(ERROR_KINDS.INVALID, 'answer is not JSON');
  }
  return parseAnswer(body);
}
