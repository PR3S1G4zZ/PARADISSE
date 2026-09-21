export const SESSION_COOKIE = 'paradisse_session';

export function sessionCookieOptions({ secure, maxAgeMs }) {
  return {
    httpOnly: true,
    secure: Boolean(secure),
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };
}

export function readSessionToken(request) {
  const header = request.headers?.cookie;
  if (!header) return null;

  for (const part of String(header).split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    const name = part.slice(0, separator).trim();
    if (name !== SESSION_COOKIE) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }

  return null;
}
