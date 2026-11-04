import { describe, expect, it } from 'vitest';
import { accepts } from './accepts';

const png = { name: 'image.png', type: 'image/png' };

describe('accepts', () => {
  it('matches wildcards, exact types and extensions', () => {
    expect(accepts(png, 'image/*')).toBe(true);
    expect(accepts({ name: 'Logo.SVG', type: '' }, '.svg,image/svg+xml')).toBe(true);
    expect(accepts({ name: 'a.pdf', type: 'application/pdf' }, 'application/pdf, .pdf')).toBe(true);
  });

  it('accepts anything without an accept list', () => {
    expect(accepts(png, '')).toBe(true);
    expect(accepts(png, undefined)).toBe(true);
  });

  it('rejects other types', () => {
    expect(accepts(png, 'video/*')).toBe(false);
    expect(accepts(png, 'application/pdf,.pdf')).toBe(false);
  });
});
