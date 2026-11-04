import { describe, expect, it } from 'vitest';
import { toTypeScript, toZod } from './logic';

const sample = {
  id: 1,
  name: 'Kinbench',
  'content-type': 'json',
  tags: ['a', 'b'],
  owner: { login: 'kin', site: null },
  users: [{ id: 1, email: 'a@x.dev' }, { id: 2, admin: true }],
  mixed: [1, 'two'],
  empty: [],
};

describe('json to types', () => {
  it('writes TypeScript interfaces, parents first, with optional keys from arrays', () => {
    expect(toTypeScript(sample)).toBe(`export interface Root {
  id: number;
  name: string;
  "content-type": string;
  tags: string[];
  owner: Owner;
  users: User[];
  mixed: (number | string)[];
  empty: unknown[];
}

export interface Owner {
  login: string;
  site: null;
}

export interface User {
  id: number;
  email?: string;
  admin?: boolean;
}`);
  });

  it('writes a Zod schema', () => {
    expect(toZod({ id: 1, users: [{ email: 'a' }, {}] })).toBe(`import { z } from 'zod';

export const RootSchema = z.object({
  id: z.number(),
  users: z.array(z.object({
    email: z.string().optional(),
  })),
});

export type Root = z.infer<typeof RootSchema>;`);
  });

  it('handles a top-level array and empty values', () => {
    expect(toTypeScript([{ a: 1 }])).toBe('export type Root = RootItem[];\n\nexport interface RootItem {\n  a: number;\n}');
    expect(toTypeScript({})).toBe('export interface Root {}');
    expect(toZod([])).toContain('export const RootSchema = z.array(z.unknown());');
  });

  it('keeps names unique', () => {
    expect(toTypeScript({ user: { a: 1 }, users: [{ b: 2 }] })).toContain('export interface User2 {');
  });
});
