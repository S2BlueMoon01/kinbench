import { describe, expect, it } from 'vitest';
import { bit, parseOctal, parseSymbolic, toOctal, toSymbolic } from './logic';

describe('chmod', () => {
  it('converts between octal and symbolic', () => {
    expect(toSymbolic(0o755)).toBe('rwxr-xr-x');
    expect(toSymbolic(0o640)).toBe('rw-r-----');
    expect(parseSymbolic('rw-r--r--')).toBe(0o644);
    expect(parseSymbolic('drwxr-x---')).toBe(0o750);
    expect(bit('group', 'write')).toBe(0o020);
  });

  it('handles setuid, setgid and sticky bits', () => {
    expect(toSymbolic(0o4755)).toBe('rwsr-xr-x');
    expect(toSymbolic(0o1777)).toBe('rwxrwxrwt');
    expect(toSymbolic(0o2644)).toBe('rw-r-Sr--');
    expect(parseSymbolic('rwxrwxrwt')).toBe(0o1777);
    expect(toOctal(0o4755)).toBe('4755');
    expect(toOctal(0o644)).toBe('644');
  });

  it('handles empty and all-off modes', () => {
    expect(parseOctal('')).toBeNull();
    expect(toSymbolic(0)).toBe('---------');
    expect(toOctal(0)).toBe('000');
  });

  it('rejects invalid input', () => {
    expect(parseOctal('789')).toBeNull();
    expect(parseOctal('75')).toBeNull();
    expect(parseSymbolic('rwxrwx')).toBeNull();
    expect(parseSymbolic('rwzr-xr-x')).toBeNull();
  });
});
