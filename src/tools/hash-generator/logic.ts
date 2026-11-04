export const algorithms = { md5: 'MD5', sha1: 'SHA-1', sha256: 'SHA-256', sha512: 'SHA-512' } as const;
export type Hashes = Record<keyof typeof algorithms, string>;

const CHUNK = 4 * 1024 * 1024;

/** Feeds every chunk to all four hashers at once, so a file is read only once. */
export async function hashChunks(chunks: Iterable<Uint8Array> | AsyncIterable<Uint8Array>): Promise<Hashes> {
  // Imported here, not at the top: the page imports this module for `algorithms`, and only the worker hashes.
  const { createMD5, createSHA1, createSHA256, createSHA512 } = await import('hash-wasm');
  const hashers = await Promise.all([createMD5(), createSHA1(), createSHA256(), createSHA512()]);
  for await (const chunk of chunks) for (const h of hashers) h.update(chunk);
  const [md5, sha1, sha256, sha512] = hashers.map((h) => h.digest('hex'));
  return { md5, sha1, sha256, sha512 };
}

export const hashText = (text: string) => hashChunks([new TextEncoder().encode(text)]);

/** Streams the file in 4 MB slices, so multi-GB files hash without loading into memory. */
export async function* fileChunks(file: Blob, onProgress?: (done: number) => void) {
  for (let offset = 0; offset < file.size; offset += CHUNK) {
    yield new Uint8Array(await file.slice(offset, offset + CHUNK).arrayBuffer());
    onProgress?.(Math.min(file.size, offset + CHUNK) / file.size);
  }
}
