// Copies the ffmpeg.wasm core (~32 MB) to public/vendor/ so it is served from our own origin: no CDN, and the CSP
// stays connect-src 'self'. The folder name carries the version, so the service worker may cache it for good.
import { copyFile, mkdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const src = 'node_modules/@ffmpeg/core/dist/esm';
const { version } = JSON.parse(await readFile('node_modules/@ffmpeg/core/package.json', 'utf8'));
const dest = join('public/vendor', `ffmpeg-core-${version}`);

await mkdir(dest, { recursive: true });
for (const f of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) {
  const exists = await stat(join(dest, f)).then((s) => s.size > 0, () => false);
  if (!exists) await copyFile(join(src, f), join(dest, f));
}
console.log(`vendor: ffmpeg core ${version} in ${dest}`);
