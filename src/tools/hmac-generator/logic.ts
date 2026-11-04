import { bytesToBase64, decodeBase64 } from '../base64/logic';

export const ALGORITHMS = ['SHA-256', 'SHA-384', 'SHA-512', 'SHA-1'] as const;
export type Algorithm = (typeof ALGORITHMS)[number];
export type KeyFormat = 'text' | 'hex' | 'base64';

/** The key as bytes; null if it is empty or not valid hex/Base64 (Web Crypto rejects zero-length HMAC keys). */
export function keyBytes(key: string, format: KeyFormat): Uint8Array<ArrayBuffer> | null {
  if (format === 'text') return key ? new TextEncoder().encode(key) : null;
  if (format === 'hex') {
    const hex = key.replace(/\s+/g, '');
    return hex && /^([0-9a-f]{2})+$/i.test(hex) ? Uint8Array.from(hex.match(/../g)!, (h) => parseInt(h, 16)) : null;
  }
  const decoded = decodeBase64(key);
  return decoded.ok && decoded.bytes.length ? decoded.bytes : null;
}

export async function hmac(message: string, key: Uint8Array<ArrayBuffer>, algorithm: Algorithm) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: algorithm }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(message)));
  return { hex: Array.from(sig, (b) => b.toString(16).padStart(2, '0')).join(''), base64: bytesToBase64(sig) };
}
