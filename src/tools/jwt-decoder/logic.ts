import { decodeBase64 } from '../base64/logic';

export type Jwt = { header: Record<string, unknown>; payload: unknown; signature: string; signingInput: string };
export type JwtResult = { ok: true; jwt: Jwt } | { ok: false; error: 'parts' | 'header' | 'payload' };

function decodePart(part: string): unknown {
  const decoded = decodeBase64(part);
  if (!decoded.ok || decoded.text === null) throw new Error('not base64url text');
  return JSON.parse(decoded.text);
}

export function decodeJwt(token: string): JwtResult {
  const parts = token.trim().split('.');
  if (parts.length !== 3 || !parts[0] || !parts[1]) return { ok: false, error: 'parts' };
  let header: unknown;
  let payload: unknown;
  try { header = decodePart(parts[0]); } catch { return { ok: false, error: 'header' }; }
  if (typeof header !== 'object' || header === null || Array.isArray(header)) return { ok: false, error: 'header' };
  try { payload = decodePart(parts[1]); } catch { return { ok: false, error: 'payload' }; }
  return { ok: true, jwt: { header: header as Record<string, unknown>, payload, signature: parts[2], signingInput: `${parts[0]}.${parts[1]}` } };
}

const HMAC = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' } as const;
export const canVerify = (alg: unknown): alg is keyof typeof HMAC => typeof alg === 'string' && alg in HMAC;

/** Checks an HS256/384/512 signature with Web Crypto. The secret never leaves this function. */
export async function verifyHmac(jwt: Jwt, secret: string): Promise<boolean> {
  const alg = jwt.header.alg;
  if (!canVerify(alg)) return false;
  const sig = decodeBase64(jwt.signature);
  if (!sig.ok) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: HMAC[alg] }, false, ['verify']);
  return crypto.subtle.verify('HMAC', key, sig.bytes, enc.encode(jwt.signingInput));
}

export type TimeClaim = { name: 'exp' | 'nbf' | 'iat'; date: Date };

/** Registered time claims (RFC 7519 §4.1), which are seconds since the epoch. */
export function timeClaims(payload: unknown): TimeClaim[] {
  if (typeof payload !== 'object' || payload === null) return [];
  const p = payload as Record<string, unknown>;
  return (['exp', 'nbf', 'iat'] as const).flatMap((name) => (typeof p[name] === 'number' ? [{ name, date: new Date(p[name] * 1000) }] : []));
}
