'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { useTheme } from 'next-themes';
import { Segmented } from './Segmented';

type Theme = 'light' | 'dark' | 'system';
const noop = () => () => {};

// Label and icons are rendered by the server (Header), so pages without a tool ship no icon or i18n runtime.
export function ThemeToggle({ label, options, className }: { label: string; options: { value: Theme; label: ReactNode }[]; className?: string }) {
  const { theme, setTheme } = useTheme();
  // The stored theme is only known on the client; render no selection on the server to avoid a mismatch.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  return <Segmented label={label} className={className} value={mounted ? (theme as Theme) : undefined} onChange={setTheme} options={options} />;
}
