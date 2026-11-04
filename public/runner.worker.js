// Function Runner sandbox: runs ONE test case of user code, then the page terminates this worker.
// It is served with its own CSP (see csp.config.mjs): 'unsafe-eval' is allowed here and nowhere else,
// and default-src 'none' blocks every network request. The network APIs are also removed below as a second layer.
'use strict';

const post = self.postMessage.bind(self);
for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'WebTransport', 'EventSource', 'importScripts', 'Worker', 'SharedWorker', 'BroadcastChannel', 'indexedDB', 'caches']) {
  try {
    Object.defineProperty(self, name, { value: undefined, writable: false, configurable: false });
  } catch {}
}

const show = (v) => {
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
};

self.onmessage = async ({ data: { code, args } }) => {
  self.onmessage = null;
  post({ started: true }); // the page starts the timeout now, so loading this worker doesn't count against the code
  const logs = [];
  for (const level of ['log', 'info', 'warn', 'error', 'debug']) console[level] = (...a) => logs.push(a.map(show).join(' '));
  let start = 0;
  try {
    const fn = new Function(`"use strict"; return (${code}\n);`)();
    if (typeof fn !== 'function') return post({ ok: false, code: 'notFunction', logs, ms: 0 });
    start = performance.now();
    const value = await fn(...args);
    const ms = performance.now() - start;
    try {
      post({ ok: true, value, logs, ms });
    } catch {
      post({ ok: false, code: 'uncloneable', logs, ms }); // functions, symbols, DOM-like objects
    }
  } catch (e) {
    post({ ok: false, code: 'threw', message: e instanceof Error ? `${e.name}: ${e.message}` : show(e), logs, ms: start ? performance.now() - start : 0 });
  }
};
