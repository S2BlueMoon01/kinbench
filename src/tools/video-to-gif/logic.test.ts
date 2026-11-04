import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CORE_BYTES, CORE_VERSION, gifArgs } from './logic';

describe('video to gif', () => {
  it('builds trim + palette arguments', () => {
    expect(gifArgs({ start: 1.5, duration: 4, fps: 12, width: 480 })).toEqual([
      '-ss', '1.5', '-t', '4', '-i', 'input',
      '-vf', 'fps=12,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
      '-loop', '0', 'output.gif',
    ]);
  });

  it('keeps the original size when no width is set', () => {
    expect(gifArgs({ start: 0, duration: 2, fps: 10, width: null })[7]).toBe('fps=10,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4');
  });

  it('clamps empty and out-of-range options', () => {
    const args = gifArgs({ start: -3, duration: 999, fps: Number.NaN, width: 5000 });
    expect(args.slice(0, 4)).toEqual(['-ss', '0', '-t', '30']);
    expect(args[7]).toMatch(/^fps=5,scale=1920:-1/);
  });

  it('matches the installed ffmpeg core', () => {
    expect(JSON.parse(readFileSync('node_modules/@ffmpeg/core/package.json', 'utf8')).version).toBe(CORE_VERSION);
    expect(statSync('node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm').size).toBe(CORE_BYTES);
  });
});
