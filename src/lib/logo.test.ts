import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { LOGO_SVG } from './logo';

test('app/icon.svg (the tab icon) is the same mark as the header logo', () => {
  // Git on Windows (core.autocrlf) checks the file out with CRLF.
  expect(readFileSync('src/app/icon.svg', 'utf8').replaceAll('\r\n', '\n')).toBe(LOGO_SVG);
});
