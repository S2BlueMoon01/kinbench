// Serves out/ like a static host (clean URLs, 404.html) with the production security headers.
// Used by Playwright and `pnpm serve`; not meant for production.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { headers, pathHeaders } from '../csp.config.mjs';

const root = resolve('out');
const port = Number(process.env.PORT ?? 4173);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml',
};

async function find(pathname) {
  const base = normalize(join(root, decodeURIComponent(pathname)));
  if (!base.startsWith(root)) return null; // path traversal
  for (const p of [base, `${base}.html`, join(base, 'index.html')]) {
    try { if ((await stat(p)).isFile()) return p; } catch {}
  }
  return null;
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  const file = await find(pathname);
  const path = file ?? join(root, '404.html');
  res.writeHead(file ? 200 : 404, { ...headers, ...pathHeaders[pathname], 'Content-Type': types[extname(path)] ?? 'application/octet-stream' });
  res.end(await readFile(path));
}).listen(port, () => console.log(`serving out/ on http://localhost:${port}`));
