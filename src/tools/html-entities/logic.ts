// The entity tables are ~20 KB, so the library loads on first use instead of with the page.

/** "special" escapes only & < > " '; "all" also turns every non-ASCII character into an entity. */
export async function encodeEntities(s: string, scope: 'special' | 'all') {
  const { encodeHTML, escapeUTF8 } = await import('entities');
  return scope === 'all' ? encodeHTML(s) : escapeUTF8(s);
}

/** Decodes exactly as a browser renders text: all HTML5 named entities, numeric ones, and the legacy semicolon-less forms. */
export const decodeEntities = async (s: string) => (await import('entities')).decodeHTML(s);
