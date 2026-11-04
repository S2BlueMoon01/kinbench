'use client';

import { useEffect } from 'react';

/** Registers /sw.js (production only, so `next dev` never serves stale files) and hands it this page's files. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        const files = performance.getEntriesByType('resource').map((e) => e.name).filter((u) => u.startsWith(`${location.origin}/_next/static/`));
        reg.active?.postMessage({ cache: ['/', location.pathname, ...files] });
      })
      .catch(() => {}); // offline support is a bonus; the site works without it
  }, []);
  return null;
}
