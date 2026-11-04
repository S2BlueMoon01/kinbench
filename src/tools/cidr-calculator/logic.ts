export type CidrInfo = {
  version: 4 | 6;
  address: string;
  prefix: number;
  network: string;
  last: string;
  netmask: string;
  hostmask: string;
  firstHost: string;
  lastHost: string;
  total: bigint;
  usable: bigint;
};

function parseV4(s: string): bigint | null {
  const parts = s.split('.');
  if (parts.length !== 4) return null;
  let n = 0n;
  for (const p of parts) {
    if (!/^(0|[1-9]\d{0,2})$/.test(p) || Number(p) > 255) return null; // no leading zeros: "010" is ambiguous
    n = (n << 8n) | BigInt(p);
  }
  return n;
}

function parseV6(s: string): bigint | null {
  let str = s.toLowerCase();
  const tail4 = str.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/); // ::ffff:192.0.2.1
  if (tail4) {
    const n = parseV4(tail4[2]);
    if (n === null) return null;
    str = `${tail4[1]}${(n >> 16n).toString(16)}:${(n & 0xffffn).toString(16)}`;
  }
  const halves = str.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  let n = 0n;
  for (const g of [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill('0'), ...tail]) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    n = (n << 16n) | BigInt(`0x${g}`);
  }
  return n;
}

const formatV4 = (n: bigint) => [24n, 16n, 8n, 0n].map((s) => ((n >> s) & 255n).toString()).join('.');

/** RFC 5952: lowercase, no leading zeros, the longest run of two or more zero groups becomes "::". */
function formatV6(n: bigint): string {
  const groups = Array.from({ length: 8 }, (_, i) => Number((n >> BigInt(112 - 16 * i)) & 0xffffn));
  let best = -1;
  let bestLen = 1;
  for (let i = 0; i < 8; i++) {
    let j = i;
    while (j < 8 && groups[j] === 0) j++;
    if (j - i > bestLen) [best, bestLen] = [i, j - i];
  }
  const hex = groups.map((g) => g.toString(16));
  return best < 0 ? hex.join(':') : `${hex.slice(0, best).join(':')}::${hex.slice(best + bestLen).join(':')}`;
}

/** "192.168.1.10/24" or "2001:db8::/32"; without a prefix the address is a single host. */
export function cidr(input: string): CidrInfo | null {
  const m = input.trim().match(/^([^/\s]+)(?:\/(\d{1,3}))?$/);
  if (!m) return null;
  const v4 = parseV4(m[1]);
  const ip = v4 ?? parseV6(m[1]);
  if (ip === null) return null;
  const version = v4 !== null ? 4 : 6;
  const bits = version === 4 ? 32 : 128;
  const prefix = m[2] === undefined ? bits : Number(m[2]);
  if (prefix > bits) return null;
  const hostmask = (1n << BigInt(bits - prefix)) - 1n;
  const netmask = ((1n << BigInt(bits)) - 1n) ^ hostmask;
  const network = ip & netmask;
  const last = network | hostmask;
  const fmt = version === 4 ? formatV4 : formatV6;
  // IPv4 reserves the network and broadcast addresses, except /31 point-to-point links (RFC 3021) and /32.
  const reserve = version === 4 && prefix < 31;
  return {
    version,
    address: fmt(ip),
    prefix,
    network: fmt(network),
    last: fmt(last),
    netmask: fmt(netmask),
    hostmask: fmt(hostmask),
    firstHost: fmt(reserve ? network + 1n : network),
    lastHost: fmt(reserve ? last - 1n : last),
    total: hostmask + 1n,
    usable: reserve ? hostmask - 1n : hostmask + 1n,
  };
}
