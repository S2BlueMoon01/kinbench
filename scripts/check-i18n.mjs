// Fails (exit 1) when vi.json and en.json don't have exactly the same keys, or when a message contains "<":
// next-intl parses "<" as a rich-text tag, which otherwise only fails much later, inside the build.
import { readFileSync } from 'node:fs';

const entries = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' ? entries(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]]));

const load = (l) => new Map(entries(JSON.parse(readFileSync(`messages/${l}.json`, 'utf8'))));
const [vi, en] = [load('vi'), load('en')];
const problems = [
  ...[...en.keys()].filter((k) => !vi.has(k)).map((k) => `vi.json is missing ${k}`),
  ...[...vi.keys()].filter((k) => !en.has(k)).map((k) => `en.json is missing ${k}`),
  ...[['vi', vi], ['en', en]].flatMap(([l, m]) => [...m].filter(([, v]) => String(v).includes('<')).map(([k]) => `${l}.json ${k} contains "<" (write it out in words)`)),
];

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`i18n: ${en.size} keys, vi and en match`);
