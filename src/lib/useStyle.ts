'use client';

import { useEffect, useRef } from 'react';

/** Sets CSS properties on an element through CSSOM: the CSP allows no inline style attributes. */
export function useStyle<T extends HTMLElement = HTMLDivElement>(vars: Record<string, string>) {
  const ref = useRef<T>(null);
  const key = JSON.stringify(vars);
  useEffect(() => {
    for (const [k, v] of Object.entries(JSON.parse(key) as Record<string, string>)) ref.current?.style.setProperty(k, v);
  }, [key]);
  return ref;
}
