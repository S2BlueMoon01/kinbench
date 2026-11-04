/** Must match the installed @ffmpeg/core (scripts/copy-vendor.mjs copies it here; a unit test checks the version). */
export const CORE_VERSION = '0.12.10';
export const CORE_DIR = `/vendor/ffmpeg-core-${CORE_VERSION}`;
/** Size of ffmpeg-core.wasm, for the progress bar when the server compresses it and sends no usable length. */
export const CORE_BYTES = 32_232_419;

export type GifOptions = { start: number; duration: number; fps: number; width: number | null };
export const LIMITS = { duration: 30, fps: [5, 30] } as const;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));

/**
 * ffmpeg arguments for a good-looking GIF: trim, then build a palette from the clip itself and dither with it
 * (one pass, via split), instead of the default 256-color web palette.
 */
export function gifArgs(o: GifOptions, input = 'input', output = 'output.gif'): string[] {
  const start = clamp(o.start, 0, 86_400);
  const duration = clamp(o.duration, 0.1, LIMITS.duration);
  const fps = Math.round(clamp(o.fps, LIMITS.fps[0], LIMITS.fps[1]));
  const scale = o.width ? `scale=${Math.round(clamp(o.width, 16, 1920))}:-1:flags=lanczos,` : '';
  return ['-ss', String(start), '-t', String(duration), '-i', input, '-vf', `fps=${fps},${scale}split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`, '-loop', '0', output];
}
