export const FORMATS = ['json', 'yaml', 'xml', 'csv', 'toml'] as const;
export type Format = (typeof FORMATS)[number];
export type Converted = { ok: true; output: string } | { ok: false; error: 'parse' | 'csvShape' | 'tomlShape'; message: string };

// XML attributes become "@_name" keys and back, so documents round-trip.
const XML_OPTIONS = { ignoreAttributes: false, attributeNamePrefix: '@_', parseTagValue: true, format: true, indentBy: '  ', suppressEmptyNode: true };

/** Each library is imported only when its format is used. */
async function parse(input: string, from: Format): Promise<unknown> {
  switch (from) {
    case 'json': return JSON.parse(input);
    case 'yaml': return (await import('yaml')).parse(input);
    case 'toml': return (await import('smol-toml')).parse(input);
    case 'xml': {
      const { XMLParser, XMLValidator } = await import('fast-xml-parser');
      const valid = XMLValidator.validate(input);
      if (valid !== true) throw new Error(`${valid.err.msg} (line ${valid.err.line})`);
      return new XMLParser(XML_OPTIONS).parse(input);
    }
    case 'csv': {
      const { default: Papa } = await import('papaparse');
      const r = Papa.parse(input.trim(), { header: true, dynamicTyping: true, skipEmptyLines: true });
      if (r.errors.length) throw new Error(`${r.errors[0].message} (row ${(r.errors[0].row ?? 0) + 2})`);
      return r.data;
    }
  }
}

const isPlainObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

async function stringify(value: unknown, to: Format): Promise<Converted> {
  switch (to) {
    case 'json': return { ok: true, output: JSON.stringify(value, null, 2) };
    case 'yaml': return { ok: true, output: (await import('yaml')).stringify(value) };
    case 'toml':
      if (!isPlainObject(value)) return { ok: false, error: 'tomlShape', message: '' };
      return { ok: true, output: (await import('smol-toml')).stringify(value) };
    case 'xml': {
      const { XMLBuilder } = await import('fast-xml-parser');
      // XML needs a single root element.
      const root = isPlainObject(value) && Object.keys(value).length === 1 ? value : { root: Array.isArray(value) ? { item: value } : value };
      return { ok: true, output: new XMLBuilder(XML_OPTIONS).build(root).trim() };
    }
    case 'csv': {
      const rows = Array.isArray(value) ? value : [value];
      if (!rows.every(isPlainObject)) return { ok: false, error: 'csvShape', message: '' };
      const { default: Papa } = await import('papaparse');
      // Nested values don't fit a cell, so they are written as JSON.
      const flat = rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'object' && v !== null ? JSON.stringify(v) : v])));
      return { ok: true, output: Papa.unparse(flat) };
    }
  }
}

export async function convert(input: string, from: Format, to: Format): Promise<Converted> {
  if (!input.trim()) return { ok: true, output: '' };
  let value: unknown;
  try {
    value = await parse(input, from);
  } catch (e) {
    return { ok: false, error: 'parse', message: (e as Error).message.split('\n')[0] };
  }
  return stringify(value, to);
}
