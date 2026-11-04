'use client';

import { useFormatter } from 'next-intl';

/** Localized file size: "512 bytes", "1.5 kB", "3.2 MB". */
export function useByteFormat() {
  const format = useFormatter();
  return (n: number) =>
    n < 1024
      ? format.number(n, { style: 'unit', unit: 'byte', unitDisplay: 'long' })
      : format.number(n < 1048576 ? n / 1024 : n / 1048576, { style: 'unit', unit: n < 1048576 ? 'kilobyte' : 'megabyte', maximumFractionDigits: 1 });
}
