'use client';

import { useEffect, useState } from 'react';

/** State persisted to localStorage (as JSON) only while the user opts in. The saved key existing = opted in. */
export function useRememberedInput<T>(slug: string, initial: T) {
  const key = `kinbench:input:${slug}`;
  const [value, setValue] = useState(initial);
  const [remember, setRememberState] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        setValue(JSON.parse(saved) as T);
        setRememberState(true);
      }
    } catch {} // storage blocked or a corrupt entry: start empty
  }, [key]);

  useEffect(() => {
    if (!remember) return;
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {} // quota errors: keep working without persistence
  }, [key, remember, value]);

  function setRemember(on: boolean) {
    setRememberState(on);
    if (!on) try { localStorage.removeItem(key); } catch {}
  }

  return [value, setValue, remember, setRemember] as const;
}
