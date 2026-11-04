'use client';

import { useEffect, useRef } from 'react';
import { wrap, type Remote } from 'comlink';

/**
 * A Comlink proxy to a module worker, created on first use and terminated on unmount.
 * `create` must call `new Worker(new URL('./x.worker.ts', import.meta.url), { type: 'module' })` inline,
 * because that exact pattern is what tells the bundler to emit the worker as its own file.
 */
export function useWorker<T>(create: () => Worker) {
  const ref = useRef<{ worker: Worker; api: Remote<T> } | null>(null);
  useEffect(() => () => { ref.current?.worker.terminate(); ref.current = null; }, []);
  return () => {
    if (!ref.current) {
      const worker = create();
      ref.current = { worker, api: wrap<T>(worker) };
    }
    return ref.current.api;
  };
}
