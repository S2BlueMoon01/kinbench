// Function benchmark sandbox: measures ONE function, then the page terminates this worker. Same isolation as
// runner.worker.js: its own CSP (csp.config.mjs) allows eval but no network, and network APIs are removed too.
'use strict';

const post = self.postMessage.bind(self);
for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'WebTransport', 'EventSource', 'importScripts', 'Worker', 'SharedWorker', 'BroadcastChannel', 'indexedDB', 'caches']) {
  try {
    Object.defineProperty(self, name, { value: undefined, writable: false, configurable: false });
  } catch {}
}
console.log = console.info = console.warn = console.error = console.debug = () => {}; // logging would skew timings

self.onmessage = ({ data: { code, args, budgetMs } }) => {
  self.onmessage = null;
  post({ started: true });
  try {
    const fn = new Function(`"use strict"; return (${code}\n);`)();
    if (typeof fn !== 'function') return post({ ok: false, code: 'notFunction' });
    // Warm up so the JIT has compiled the function, then size batches to ~25 ms so timer resolution doesn't matter.
    let calls = 1;
    for (let t = performance.now(); performance.now() - t < 100; ) for (let i = 0; i < calls; i++) fn(...args);
    for (let elapsed = 0; elapsed < 25; calls *= 2) {
      const t = performance.now();
      for (let i = 0; i < calls; i++) fn(...args);
      elapsed = performance.now() - t;
      if (elapsed >= 25) break;
    }
    const samples = [];
    for (const end = performance.now() + budgetMs; performance.now() < end || samples.length < 5; ) {
      const t = performance.now();
      for (let i = 0; i < calls; i++) fn(...args);
      samples.push((calls * 1000) / (performance.now() - t)); // operations per second in this batch
    }
    post({ ok: true, samples });
  } catch (e) {
    post({ ok: false, code: 'threw', message: e instanceof Error ? `${e.name}: ${e.message}` : String(e) });
  }
};
