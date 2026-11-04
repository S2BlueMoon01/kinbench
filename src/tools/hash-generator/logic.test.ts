import { describe, expect, it } from 'vitest';
import { fileChunks, hashChunks, hashText } from './logic';

describe('hashes', () => {
  it('matches the standard test vectors for "abc"', async () => {
    expect(await hashText('abc')).toEqual({
      md5: '900150983cd24fb0d6963f7d28e17f72',
      sha1: 'a9993e364706816aba3e25717850c26c9cd0d89d',
      sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      sha512: 'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f',
    });
  });

  it('hashes empty input', async () => {
    expect((await hashText('')).md5).toBe('d41d8cd98f00b204e9800998ecf8427e');
    expect((await hashChunks(fileChunks(new Blob([])))).sha1).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');
  });

  it('gives the same result for a file streamed in chunks as for the whole text', async () => {
    const text = 'Việt Nam '.repeat(1_000_000); // ~10 MB, so it spans several chunks
    const progress: number[] = [];
    const streamed = await hashChunks(fileChunks(new Blob([text]), (p) => progress.push(p)));
    expect(streamed).toEqual(await hashText(text));
    expect(progress.length).toBeGreaterThan(1);
    expect(progress.at(-1)).toBe(1);
  });
});
