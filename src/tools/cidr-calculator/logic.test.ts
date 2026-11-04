import { describe, expect, it } from 'vitest';
import { cidr } from './logic';

describe('cidr', () => {
  it('computes an IPv4 subnet', () => {
    expect(cidr('192.168.1.10/24')).toEqual({
      version: 4,
      address: '192.168.1.10',
      prefix: 24,
      network: '192.168.1.0',
      last: '192.168.1.255',
      netmask: '255.255.255.0',
      hostmask: '0.0.0.255',
      firstHost: '192.168.1.1',
      lastHost: '192.168.1.254',
      total: 256n,
      usable: 254n,
    });
    expect(cidr('10.0.0.0/8')?.usable).toBe(16_777_214n);
    expect(cidr('0.0.0.0/0')?.total).toBe(4_294_967_296n);
  });

  it('follows the /31 and /32 rules', () => {
    expect(cidr('10.0.0.0/31')).toMatchObject({ firstHost: '10.0.0.0', lastHost: '10.0.0.1', usable: 2n });
    expect(cidr('10.0.0.7')).toMatchObject({ prefix: 32, network: '10.0.0.7', usable: 1n });
  });

  it('computes an IPv6 prefix with RFC 5952 formatting', () => {
    expect(cidr('2001:DB8:0:0:8:800:200C:417A/64')).toMatchObject({
      version: 6,
      address: '2001:db8::8:800:200c:417a',
      network: '2001:db8::',
      last: '2001:db8::ffff:ffff:ffff:ffff',
      netmask: 'ffff:ffff:ffff:ffff::',
      total: 18_446_744_073_709_551_616n,
    });
    expect(cidr('::1')).toMatchObject({ prefix: 128, network: '::1', total: 1n });
    expect(cidr('::ffff:192.0.2.1/128')?.address).toBe('::ffff:c000:201');
    expect(cidr('1:0:0:2:0:0:0:3')?.address).toBe('1:0:0:2::3');
  });

  it('returns null for empty input', () => {
    expect(cidr('')).toBeNull();
  });

  it('rejects invalid addresses and prefixes', () => {
    expect(cidr('256.1.1.1/24')).toBeNull();
    expect(cidr('10.0.0.010')).toBeNull();
    expect(cidr('10.0.0.0/33')).toBeNull();
    expect(cidr('1::2::3')).toBeNull();
    expect(cidr('1:2:3:4:5:6:7:8:9')).toBeNull();
    expect(cidr('2001:db8::/129')).toBeNull();
  });
});
