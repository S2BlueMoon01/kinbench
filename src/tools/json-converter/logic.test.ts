import { describe, expect, it } from 'vitest';
import { convert } from './logic';

const data = { name: 'Kinbench', local: true, tags: ['json', 'yaml'], owner: { id: 7 } };
const out = async (input: string, from: Parameters<typeof convert>[1], to: Parameters<typeof convert>[2]) => {
  const r = await convert(input, from, to);
  if (!r.ok) throw new Error(`${r.error} ${r.message}`);
  return r.output;
};

describe('json converter', () => {
  it('round-trips JSON through YAML and TOML', async () => {
    const yaml = await out(JSON.stringify(data), 'json', 'yaml');
    expect(yaml).toBe('name: Kinbench\nlocal: true\ntags:\n  - json\n  - yaml\nowner:\n  id: 7\n');
    expect(JSON.parse(await out(yaml, 'yaml', 'json'))).toEqual(data);
    const toml = await out(JSON.stringify(data), 'json', 'toml');
    expect(toml).toContain('name = "Kinbench"');
    expect(toml).toContain('[owner]\nid = 7');
    expect(JSON.parse(await out(toml, 'toml', 'json'))).toEqual(data);
  });

  it('converts XML with attributes and back', async () => {
    const json = JSON.parse(await out('<tool id="1"><name>Kinbench</name><tag>a</tag><tag>b</tag></tool>', 'xml', 'json'));
    expect(json).toEqual({ tool: { '@_id': '1', name: 'Kinbench', tag: ['a', 'b'] } }); // attributes stay text
    expect(await out(JSON.stringify(json), 'json', 'xml')).toBe('<tool id="1">\n  <name>Kinbench</name>\n  <tag>a</tag>\n  <tag>b</tag>\n</tool>');
    expect(await out('[1,2]', 'json', 'xml')).toBe('<root>\n  <item>1</item>\n  <item>2</item>\n</root>');
  });

  it('converts CSV rows with types, and objects to CSV', async () => {
    expect(JSON.parse(await out('name,age,ok\nAn,30,true\nBình,,false\n', 'csv', 'json'))).toEqual([
      { name: 'An', age: 30, ok: true },
      { name: 'Bình', age: null, ok: false },
    ]);
    expect(await out('[{"a":1,"b":{"c":2}},{"a":"x,y"}]', 'json', 'csv')).toBe('a,b\r\n1,"{""c"":2}"\r\n"x,y",');
  });

  it('returns empty output for empty input', async () => {
    expect(await convert('  ', 'json', 'yaml')).toEqual({ ok: true, output: '' });
  });

  it('reports parse errors and shapes a format cannot hold', async () => {
    expect(await convert('{"a":', 'json', 'yaml')).toMatchObject({ ok: false, error: 'parse' });
    expect(await convert('a: [1', 'yaml', 'json')).toMatchObject({ ok: false, error: 'parse' });
    expect(await convert('<a><b></a>', 'xml', 'json')).toMatchObject({ ok: false, error: 'parse' });
    expect(await convert('[1, 2]', 'json', 'toml')).toMatchObject({ ok: false, error: 'tomlShape' });
    expect(await convert('[1, 2]', 'json', 'csv')).toMatchObject({ ok: false, error: 'csvShape' });
  });
});
