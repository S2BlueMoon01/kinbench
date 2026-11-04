export type Scope = 'component' | 'full';

/** "component" escapes everything but A–Z a–z 0–9 - _ . ! ~ * ' ( ); "full" keeps URL syntax like / ? & = #. */
export function encodeUrl(s: string, scope: Scope): string | null {
  try {
    return scope === 'component' ? encodeURIComponent(s) : encodeURI(s);
  } catch {
    return null; // lone surrogate halves can't be encoded
  }
}

export function decodeUrl(s: string, scope: Scope): string | null {
  try {
    return scope === 'component' ? decodeURIComponent(s) : decodeURI(s);
  } catch {
    return null; // malformed %-sequence
  }
}

export type UrlParts = {
  protocol: string;
  username: string;
  password: string;
  hostname: string;
  port: string;
  pathname: string;
  hash: string;
  params: [string, string][];
};

/** Splits an absolute URL into its parts; query parameters are decoded (with + as a space). */
export function parseUrl(s: string): UrlParts | null {
  if (!URL.canParse(s.trim())) return null;
  const u = new URL(s.trim());
  const { protocol, username, password, hostname, port, pathname, hash } = u;
  return { protocol, username, password, hostname, port, pathname, hash, params: [...u.searchParams] };
}
