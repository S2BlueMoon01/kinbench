import { convertCase } from '../case-converter/logic';

type Primitive = 'string' | 'number' | 'boolean' | 'null' | 'unknown';
export type Shape =
  | { kind: Primitive }
  | { kind: 'array'; of: Shape }
  | { kind: 'object'; fields: Record<string, { shape: Shape; optional: boolean }> }
  | { kind: 'union'; of: Shape[] };

const PRIMITIVES = ['string', 'number', 'boolean', 'null', 'unknown'];

export function infer(v: unknown): Shape {
  if (v === null) return { kind: 'null' };
  if (Array.isArray(v)) return { kind: 'array', of: v.length ? v.map(infer).reduce(merge) : { kind: 'unknown' } };
  if (typeof v === 'object') return { kind: 'object', fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, { shape: infer(x), optional: false }])) };
  return { kind: typeof v as Primitive };
}

/** Merges the shapes of array items: keys missing from some objects become optional, different types become a union. */
export function merge(a: Shape, b: Shape): Shape {
  if (a.kind === 'unknown') return b;
  if (b.kind === 'unknown') return a;
  if (a.kind === b.kind && PRIMITIVES.includes(a.kind)) return a;
  if (a.kind === 'object' && b.kind === 'object') {
    const keys = [...new Set([...Object.keys(a.fields), ...Object.keys(b.fields)])];
    return {
      kind: 'object',
      fields: Object.fromEntries(keys.map((k) => {
        const [x, y] = [a.fields[k], b.fields[k]];
        return [k, x && y ? { shape: merge(x.shape, y.shape), optional: x.optional || y.optional } : { shape: (x ?? y).shape, optional: true }];
      })),
    };
  }
  if (a.kind === 'array' && b.kind === 'array') return { kind: 'array', of: merge(a.of, b.of) };
  const members = a.kind === 'union' ? [...a.of] : [a];
  for (const m of b.kind === 'union' ? b.of : [b]) {
    const i = members.findIndex((x) => x.kind === m.kind);
    if (i >= 0) members[i] = merge(members[i], m);
    else members.push(m);
  }
  return members.length === 1 ? members[0] : { kind: 'union', of: members };
}

const key = (k: string) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k));
const typeName = (k: string) => convertCase(k, 'pascal', 'en') || 'Item';
/** "users" → "User", "categories" → "Category", otherwise "<Name>Item". */
const itemName = (n: string) => (/ies$/.test(n) ? n.replace(/ies$/, 'y') : /[^s]s$/.test(n) ? n.slice(0, -1) : `${n}Item`);

export function toTypeScript(value: unknown, root = 'Root'): string {
  const decls: string[] = [];
  const used = new Set<string>();
  const unique = (name: string) => {
    let n = name;
    for (let i = 2; used.has(n); i++) n = `${name}${i}`;
    used.add(n);
    return n;
  };
  const type = (s: Shape, name: string): string => {
    if (s.kind === 'object') {
      const n = unique(name);
      const slot = decls.push('') - 1; // reserve the slot first, so parents are listed before their children
      const body = Object.entries(s.fields).map(([k, f]) => `  ${key(k)}${f.optional ? '?' : ''}: ${type(f.shape, typeName(k))};`);
      decls[slot] = body.length ? `export interface ${n} {\n${body.join('\n')}\n}` : `export interface ${n} {}`;
      return n;
    }
    if (s.kind === 'array') {
      const t = type(s.of, itemName(name));
      return s.of.kind === 'union' ? `(${t})[]` : `${t}[]`;
    }
    if (s.kind === 'union') return s.of.map((m) => type(m, name)).join(' | ');
    return s.kind;
  };
  const shape = infer(value);
  if (shape.kind === 'object') type(shape, root);
  else decls.unshift(`export type ${unique(root)} = ${type(shape, root)};`);
  return decls.join('\n\n');
}

export function toZod(value: unknown, root = 'Root'): string {
  const zod = (s: Shape, depth: number): string => {
    if (s.kind === 'array') return `z.array(${zod(s.of, depth)})`;
    if (s.kind === 'union') return `z.union([${s.of.map((m) => zod(m, depth)).join(', ')}])`;
    if (s.kind === 'object') {
      const pad = '  '.repeat(depth + 1);
      const fields = Object.entries(s.fields).map(([k, f]) => `${pad}${key(k)}: ${zod(f.shape, depth + 1)}${f.optional ? '.optional()' : ''},`);
      return fields.length ? `z.object({\n${fields.join('\n')}\n${'  '.repeat(depth)}})` : 'z.object({})';
    }
    return `z.${s.kind}()`;
  };
  return `import { z } from 'zod';\n\nexport const ${root}Schema = ${zod(infer(value), 0)};\n\nexport type ${root} = z.infer<typeof ${root}Schema>;`;
}
