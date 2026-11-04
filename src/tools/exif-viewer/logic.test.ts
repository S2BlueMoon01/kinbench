import { crc32 } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { formatValue, stripJpeg, stripPng } from './logic';

const seg = (marker: number, payload: number[]) => [0xff, marker, (payload.length + 2) >> 8, (payload.length + 2) & 255, ...payload];
const jpeg = Uint8Array.from([
  0xff, 0xd8,
  ...seg(0xe0, [74, 70, 73, 70, 0]), // APP0 JFIF: kept
  ...seg(0xe1, [69, 120, 105, 102, 0, 0, 1, 2, 3]), // APP1 Exif: dropped
  ...seg(0xe2, [73, 67, 67]), // APP2 ICC: kept
  ...seg(0xfe, [104, 105]), // comment: dropped
  ...seg(0xdb, [0, 1, 2]), // quantization table: kept
  0xff, 0xda, 0, 2, 9, 9, 9, 0xff, 0xd9, // scan data + end
]);

const chunk = (type: string, data: number[]) => {
  const body = Buffer.from([...Buffer.from(type), ...data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return [...len, ...body, ...crc];
};
const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, ...chunk('IHDR', [0, 0, 0, 1]), ...chunk('tEXt', [65, 0, 66]), ...chunk('eXIf', [1]), ...chunk('IDAT', [7]), ...chunk('IEND', [])]);

describe('metadata removal', () => {
  it('drops EXIF and comments from a JPEG, keeping color info and image data', () => {
    const out = stripJpeg(jpeg)!;
    expect([...out]).toEqual([0xff, 0xd8, ...seg(0xe0, [74, 70, 73, 70, 0]), ...seg(0xe2, [73, 67, 67]), ...seg(0xdb, [0, 1, 2]), 0xff, 0xda, 0, 2, 9, 9, 9, 0xff, 0xd9]);
  });

  it('drops text and EXIF chunks from a PNG', () => {
    expect([...stripPng(png)!]).toEqual([137, 80, 78, 71, 13, 10, 26, 10, ...chunk('IHDR', [0, 0, 0, 1]), ...chunk('IDAT', [7]), ...chunk('IEND', [])]);
  });

  it('returns null for empty input', () => {
    expect(stripJpeg(new Uint8Array())).toBeNull();
    expect(stripPng(new Uint8Array())).toBeNull();
  });

  it('returns null for other or truncated files', () => {
    expect(stripJpeg(png)).toBeNull();
    expect(stripJpeg(jpeg.subarray(0, 12))).toBeNull();
    expect(stripPng(png.subarray(0, 30))).toBeNull();
  });

  it('formats metadata values', () => {
    expect(formatValue(new Date('2024-05-01T10:00:00Z'))).toBe('2024-05-01T10:00:00.000Z');
    expect(formatValue(new Uint8Array(4))).toBe('4 bytes');
    expect(formatValue([1, 2])).toBe('1, 2');
  });
});
