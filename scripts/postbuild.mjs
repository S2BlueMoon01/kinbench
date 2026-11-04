import { createHash } from 'node:crypto';
import { copyFile, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { headers, metaCsp, pathHeaders } from '../csp.config.mjs';

const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g;

/** Adds a CSP <meta> before any script (right after <meta charset>, which must stay in the first 1024 bytes). */
export function addCspMeta(html) {
  if (html.includes('http-equiv="Content-Security-Policy"')) throw new Error('CSP meta already present');
  const hashes = [...new Set([...html.matchAll(INLINE_SCRIPT)].map(([, body]) => `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`))];
  const anchor = html.match(/<head[^>]*>(\s*<meta charset="utf-8"\s*\/?>)?/i);
  if (!anchor) throw new Error('No <head> found');
  const meta = `<meta http-equiv="Content-Security-Policy" content="${metaCsp(hashes)}">`;
  return html.replace(anchor[0], anchor[0] + meta);
}

// shortcut: Next 16.4 static export writes segment-prefetch files nested (__next.$d$locale/__PAGE__.txt) while the
// client requests them flattened (__next.$d$locale.__PAGE__.txt), so every static host 404s them. Remove once fixed upstream.
export const flattenedSegmentPath = (file) => {
  const m = file.match(/^(.*?__next\.[^/\\]+)[/\\](.+\.txt)$/);
  return m ? `${m[1]}.${m[2].replace(/[/\\]/g, '.')}` : null;
};

/** Cloudflare Pages _headers format: a path line, then indented "Name: value" lines. */
export const headersFile = () =>
  Object.entries({ '/*': headers, ...pathHeaders })
    .map(([path, h]) => `${path}\n${Object.entries(h).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\n`)
    .join('\n');

/** Vercel config for deploying out/ as a static site (`vercel deploy out`): clean URLs plus the same headers. */
export const vercelJson = () =>
  JSON.stringify(
    {
      cleanUrls: true,
      headers: Object.entries({ '/(.*)': headers, ...pathHeaders }).map(([source, h]) => ({
        source,
        headers: Object.entries(h).map(([key, value]) => ({ key, value })),
      })),
    },
    null,
    2,
  );

async function main() {
  const out = 'out';
  const all = await readdir(out, { recursive: true });
  for (const f of all) {
    const flat = flattenedSegmentPath(f);
    if (flat) await copyFile(join(out, f), join(out, flat));
  }
  const files = all.filter((f) => f.endsWith('.html') && f !== 'html-preview.html'); // that frame has its own policy
  for (const f of files) {
    const path = join(out, f);
    await writeFile(path, addCspMeta(await readFile(path, 'utf8')));
  }
  // Cloudflare Pages reads out/_headers; Vercel reads out/vercel.json. Nginx: deploy/nginx.conf.
  await writeFile(join(out, '_headers'), headersFile());
  await writeFile(join(out, 'vercel.json'), vercelJson());
  console.log(`postbuild: CSP meta added to ${files.length} HTML files, wrote out/_headers and out/vercel.json`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
