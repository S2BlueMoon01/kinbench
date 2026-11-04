import { bytesToBase64, decodeBase64 } from '../base64/logic';

/** OWASP's 2023 recommendation for PBKDF2-HMAC-SHA256. */
export const ITERATIONS = 600_000;
const SALT = 16;
const IV = 12;

async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/**
 * AES-256-GCM with a key derived from the password. Output: Base64 of salt (16 bytes) + IV (12 bytes) +
 * ciphertext with its 16-byte authentication tag, so the text alone (plus the password) is enough to decrypt.
 */
export async function encrypt(plaintext: string, password: string, iterations = ITERATIONS): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT));
  const iv = crypto.getRandomValues(new Uint8Array(IV));
  const key = await deriveKey(password, salt, iterations);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext)));
  return bytesToBase64(new Uint8Array([...salt, ...iv, ...ciphertext]));
}

/** Null when the password is wrong or the data was changed: GCM's tag check fails for both. */
export async function decrypt(payload: string, password: string, iterations = ITERATIONS): Promise<string | null> {
  const decoded = decodeBase64(payload);
  if (!decoded.ok || decoded.bytes.length < SALT + IV + 16) return null;
  const bytes = decoded.bytes;
  try {
    const key = await deriveKey(password, bytes.slice(0, SALT), iterations);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(SALT, SALT + IV) }, key, bytes.slice(SALT + IV));
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}
