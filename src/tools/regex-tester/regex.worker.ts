import { runRegex } from './logic';

// Plain postMessage instead of Comlink: the page terminates this worker when a pattern runs too long.
self.onmessage = ({ data }: MessageEvent<{ id: number; pattern: string; flags: string; text: string; replacement: string | null }>) => {
  self.postMessage({ id: data.id, result: runRegex(data.pattern, data.flags, data.text, data.replacement) });
};
