// Single source of truth for security headers. scripts/postbuild.mjs puts metaCsp() into every HTML
// file and writes out/_headers; scripts/serve.mjs serves out/ with the same headers for tests.
//
// Exceptions, and why:
// - script hashes: Next.js inlines its RSC payload in <script> tags and next-themes inlines its
//   no-flash script. A static export can't use nonces, so each page gets the sha256 of its own inline scripts.
// - 'wasm-unsafe-eval': lets WebAssembly compile (hash-wasm, jSquash codecs). It does not allow eval().
// - img-src blob: data:: previews of images the user picks are blob:/data: URLs created in the page.
// - media-src blob:: the preview of a video the user picks (Video to GIF) is a blob: URL created in the page.
// - 'unsafe-eval', ONLY on /runner.worker.js and /bench.worker.js (pathHeaders below): the Function Runner and
//   Function benchmark compile the user's code with new Function() inside those dedicated workers. The same policy sets default-src 'none', so code running
//   there can make no network request at all. The pages themselves never allow eval.

/** Per-page policy, delivered in a <meta> tag because the hashes differ per page. */
export const metaCsp = (scriptHashes) =>
  [
    "default-src 'self'",
    `script-src 'self' 'wasm-unsafe-eval' ${scriptHashes.join(' ')}`.trim(),
    "style-src 'self'",
    "img-src 'self' blob: data:",
    "media-src 'self' blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ');

// Browsers enforce the header and the meta policy together, so the header must NOT set script-src or
// default-src (it would block the hashed inline scripts). It adds what <meta> can't do (frame-ancestors)
// and covers responses that have no <meta>, like Web Worker scripts.
const headerCsp = [
  "connect-src 'self'",
  "img-src 'self' blob: data:",
  "media-src 'self' blob:",
  "style-src 'self'",
  "font-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

export const headers = {
  'Content-Security-Policy': headerCsp,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};

// Extra headers for single paths. Hosts that apply several matching rules send both CSP headers; browsers
// then enforce both, which still gives the worker no network access (default-src 'none' wins over connect-src 'self').
const SANDBOX = { 'Content-Security-Policy': "default-src 'none'; script-src 'self' 'unsafe-eval'" };
export const pathHeaders = { '/runner.worker.js': SANDBOX, '/bench.worker.js': SANDBOX };
