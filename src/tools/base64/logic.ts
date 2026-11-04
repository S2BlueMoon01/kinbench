export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  // Chunked: spreading millions of bytes into one fromCharCode call overflows the call stack.
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export const encodeText = (text: string) => bytesToBase64(new TextEncoder().encode(text));

export type Decoded = { ok: true; bytes: Uint8Array<ArrayBuffer>; text: string | null } | { ok: false };

/** Accepts standard and URL-safe Base64, with or without padding and line breaks. `text` is null for binary data. */
export function decodeBase64(input: string): Decoded {
  let binary: string;
  try {
    binary = atob(input.replace(/[-_]/g, (c) => (c === '-' ? '+' : '/')));
  } catch {
    return { ok: false };
  }
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  let text: string | null = null;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (text.includes('\0')) text = null; // valid UTF-8 but clearly binary
  } catch {}
  return { ok: true, bytes, text };
}
