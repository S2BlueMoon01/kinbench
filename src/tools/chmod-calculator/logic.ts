export const WHO = ['owner', 'group', 'other'] as const;
export const PERMS = ['read', 'write', 'execute'] as const;
export const SPECIAL = ['setuid', 'setgid', 'sticky'] as const;
export type Who = (typeof WHO)[number];
export type Perm = (typeof PERMS)[number];
export type Special = (typeof SPECIAL)[number];

/** The bit for one permission: owner read = 0o400 … other execute = 0o001. Special bits sit above them. */
export const bit = (who: Who, perm: Perm) => (4 >> PERMS.indexOf(perm)) << (3 * (2 - WHO.indexOf(who)));
export const specialBit = (s: Special) => 0o4000 >> SPECIAL.indexOf(s);

export function parseOctal(s: string): number | null {
  return /^[0-7]{3,4}$/.test(s.trim()) ? parseInt(s.trim(), 8) : null;
}

export const toOctal = (mode: number) => mode.toString(8).padStart(mode > 0o777 ? 4 : 3, '0');

/** "rwxr-xr-x", with s/S for setuid/setgid and t/T for sticky (uppercase when execute is off). */
export function toSymbolic(mode: number): string {
  return WHO.map((who, i) => {
    const special = mode & specialBit(SPECIAL[i]);
    const x = mode & bit(who, 'execute');
    const xs = special ? (i === 2 ? (x ? 't' : 'T') : x ? 's' : 'S') : x ? 'x' : '-';
    return (mode & bit(who, 'read') ? 'r' : '-') + (mode & bit(who, 'write') ? 'w' : '-') + xs;
  }).join('');
}

/** Accepts the 9 permission characters, optionally after a file-type character as in `ls -l` ("drwxr-xr-x"). */
export function parseSymbolic(s: string): number | null {
  const m = s.trim().match(/^[-dlcbps]?([r-][w-][xsS-])([r-][w-][xsS-])([r-][w-][xtT-])$/);
  if (!m) return null;
  return m.slice(1).reduce((mode, part, i) => {
    const who = WHO[i];
    if (part[0] === 'r') mode |= bit(who, 'read');
    if (part[1] === 'w') mode |= bit(who, 'write');
    if ('xst'.includes(part[2])) mode |= bit(who, 'execute');
    if ('sStT'.includes(part[2])) mode |= specialBit(SPECIAL[i]);
    return mode;
  }, 0);
}
