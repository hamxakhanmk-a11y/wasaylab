/** Shared bits for the GitHub OAuth handshake used by the CMS at /admin. */

export const PROVIDER = 'github';

/** Origins allowed to receive the access token, as hostname suffixes. */
export function allowedOrigins() {
  return (process.env.ALLOWED_DOMAINS || 'localhost')
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);
}

export function readCookie(header, name) {
  return (header || '')
    .split(';')
    .map((c) => c.trim().split('='))
    .find(([k]) => k === name)?.[1];
}

/**
 * The page the OAuth popup lands on. It speaks the Netlify/Decap handshake that
 * Sveltia CMS expects: announce readiness to the opener, then hand the token
 * only to an origin we trust.
 */
export function handshakePage(state, content) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>Signing in…</title></head>
<body><p>Signing in…</p><script>
(() => {
  const provider = ${JSON.stringify(PROVIDER)};
  const state = ${JSON.stringify(state)};
  const content = ${JSON.stringify(content)};
  const allowed = ${JSON.stringify(allowedOrigins())};

  const trusted = (origin) => {
    try {
      const { hostname } = new URL(origin);
      return allowed.some((d) => hostname === d || hostname.endsWith('.' + d));
    } catch { return false; }
  };

  window.addEventListener('message', ({ origin, data }) => {
    if (data !== 'authorizing:' + provider) return;
    if (!trusted(origin)) {
      document.body.textContent = 'Untrusted origin: ' + origin;
      return;
    }
    window.opener.postMessage(
      'authorization:' + provider + ':' + state + ':' + JSON.stringify(content),
      origin
    );
  });

  window.opener.postMessage('authorizing:' + provider, '*');
})();
</script></body></html>`;
}
