import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { LOGO_SVG } from './logo';

test('app/icon.svg (the tab icon) is the same mark as the header logo', () => {
  expect(readFileSync('src/app/icon.svg', 'utf8')).toBe(LOGO_SVG);
});
