import { expose, transfer } from 'comlink';

/** The parts of the ffmpeg.wasm core module this tool uses. */
type Core = {
  FS: { writeFile(path: string, data: Uint8Array): void; readFile(path: string): Uint8Array; unlink(path: string): void };
  exec(...args: string[]): void;
  ret: number;
  reset(): void;
  setProgress(cb: (p: { progress: number }) => void): void;
  setLogger(cb: (l: { message: string }) => void): void;
};
let core: Core | null = null;

const api = {
  /** The page downloads the wasm itself (with a progress bar) and hands over the bytes, so nothing is fetched twice. */
  async load(coreURL: string, wasmBinary: ArrayBuffer) {
    const { default: create } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ coreURL);
    // The core reads wasmURL/workerURL from this hash; with wasmBinary set it fetches nothing.
    core = (await create({ wasmBinary, mainScriptUrlOrBlob: `${coreURL}#${btoa(JSON.stringify({ wasmURL: '', workerURL: '' }))}` })) as Core;
  },

  convert(input: Uint8Array, args: string[], onProgress: (p: number) => void) {
    if (!core) throw new Error('ffmpeg is not loaded');
    const c = core;
    const logs: string[] = [];
    c.setLogger(({ message }) => logs.push(message));
    c.setProgress(({ progress }) => onProgress(Math.min(1, Math.max(0, progress))));
    try {
      c.FS.writeFile('input', input);
      c.exec(...args);
      if (c.ret !== 0) throw new Error(logs.slice(-4).join('\n') || `ffmpeg exited with ${c.ret}`);
      const out = c.FS.readFile('output.gif');
      return transfer(out, [out.buffer]);
    } finally {
      for (const f of ['input', 'output.gif']) try { c.FS.unlink(f); } catch {}
      c.reset();
    }
  },
};

export type FfmpegApi = typeof api;
expose(api);
