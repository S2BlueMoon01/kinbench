# Kinbench

Developer tools that run entirely in the browser — JSON, CSS/SCSS, text, images, Base64, JWT, hashes, IDs,
timestamps and a sandboxed JavaScript test runner. A static site in Vietnamese and English: no backend, no
analytics, and a strict Content-Security-Policy so nothing a user pastes can leave their device.

## Run

Requires Node 24 and pnpm (`corepack enable`).

```sh
pnpm install
pnpm dev          # http://localhost:3000 (no service worker in dev)
```

## Build and preview

```sh
pnpm build        # checks vi/en keys, builds the static site into out/, adds CSP meta tags and host header files
pnpm serve        # serves out/ on http://localhost:4173 with the production headers
```

Set `NEXT_PUBLIC_SITE_URL` (e.g. `https://kinbench.dev`) when building for production; canonical URLs, hreflang,
the sitemap and social cards use it. It defaults to `https://kinbench.example`.

## Test

```sh
pnpm test         # Vitest: every tool's logic.ts, search, CSP/header generation, deploy config drift
npx playwright install chromium   # once
pnpm build && pnpm e2e            # Playwright against out/ at 375, 768 and 1440 px
```

The e2e suite uses every tool in both languages and both themes, checks for console errors, CSP violations and
horizontal scroll, and proves that **using each tool sends no request carrying user data** (`e2e/privacy.spec.ts`):
every request must be a same-origin GET for a file that exists in `out/`. It also checks SEO tags, JSON-LD, the
sitemap, search, offline support and the Function Runner sandbox. Screenshots go to `e2e/screenshots/`.

## Project layout

```
messages/{vi,en}.json     all UI text and tool content, namespaced per tool (tools.<slug>.*)
csp.config.mjs            the one definition of the CSP and security headers, with every exception explained
public/runner.worker.js   Function Runner sandbox (fixed path so it gets its own CSP); bench.worker.js likewise
public/vendor/            ffmpeg.wasm core, copied from node_modules by scripts/copy-vendor.mjs (git-ignored)
public/sw.js              service worker for offline use
scripts/                  i18n key check, postbuild (CSP hashes, _headers, vercel.json), local server
src/app/[locale]/         home, tool, category, privacy and about pages
src/app/og/               build-time social cards (PNG)
src/tools/registry.ts     the tool list; src/tools/<slug>/ holds each tool's UI, logic.ts and logic.test.ts
deploy/                   nginx config
```

## Add a tool

See [docs/ADD_A_TOOL.md](docs/ADD_A_TOOL.md).

## Add or change translations

All text lives in `messages/en.json` and `messages/vi.json`. Both files must have exactly the same keys:
`pnpm lint:i18n` (and every build) fails otherwise. Things to know:

- Messages use ICU syntax, so `{` and `}` are placeholders. Don't put literal braces in text.
- Lists (how-to steps, FAQ) are objects with named keys, not arrays, because next-intl's typed keys don't support arrays.
- Vietnamese copy should read naturally for Vietnamese developers and keep the English terms they use (JSON, hash, format…).
- Keep `metaDescription` under 155 characters and say that processing is local; the SEO test checks the length.
- Keep `metaTitle` under 70 characters (60 is better): main search keyword first, then "Online" / "No Upload"
  ("không tải lên"), then `| Kinbench`. Google cuts longer titles and often rewrites them.

## Deploy

Build once with `NEXT_PUBLIC_SITE_URL` set, then publish `out/`. The security headers are generated from
`csp.config.mjs`; the HTML pages also carry their own CSP `<meta>` with the hashes of their inline scripts.

**Cloudflare Pages** — build command `pnpm build`, output directory `out`. `out/_headers` is applied automatically.

**Vercel** — deploy the built folder as a static site: `pnpm build && vercel deploy out --prod`.
`out/vercel.json` sets clean URLs and the headers. (With Vercel's Git integration, copy that file to the repository
root and set the output directory to `out`.)

**Nginx** — copy `out/` to `/var/www/kinbench/out`, `deploy/nginx-security-headers.conf` to `/etc/nginx/kinbench/`,
and use `deploy/nginx.conf` as the server block (add TLS as usual). `pnpm test` fails if the nginx headers drift
from `csp.config.mjs`.

## Security notes

- **CSP exceptions** (all in `csp.config.mjs`): per-page `sha256` hashes for Next.js's and next-themes' inline
  scripts; `'wasm-unsafe-eval'` for the WebAssembly codecs; `img-src blob: data:` and `media-src blob:` for previews
  of images and videos the user picks; and `'unsafe-eval'` only on `/runner.worker.js` and `/bench.worker.js`, whose
  policy also sets `default-src 'none'` so user code has no network access. Styles stay `'self'` only.
- Video to GIF downloads the ~31 MB ffmpeg.wasm core from this site (`/vendor/`, never a CDN) only when a
  conversion starts, with a progress bar; the page hands the bytes to the worker, and the service worker keeps them.
- The Function Runner never evaluates code on the page: each test case runs in a new dedicated worker that is
  terminated when it finishes or times out.
- Nothing is persisted by default. "Remember input" (per tool, off by default) and the recent-tools list (slugs only)
  use localStorage.

## Known limits

- Tested in Chromium only; Firefox and WebKit are not in the Playwright config yet.
- Next.js 16.4 writes segment-prefetch files under names the client doesn't request; `scripts/postbuild.mjs`
  copies them to the expected names (marked `shortcut:`), to be removed once fixed upstream.
- The service worker keeps one cache that grows with each deploy's hashed files (and each ffmpeg core version).
- Image tools take a pasted image (Ctrl+V / ⌘V); pasting again replaces it. Camera capture is not offered (the
  Permissions-Policy blocks the camera).
- The web manifest has only an SVG icon, so some platforms won't offer "Install".
