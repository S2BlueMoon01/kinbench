'use client';

import { useTranslations } from 'next-intl';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = { data: string | Blob | Uint8Array<ArrayBuffer> | null; filename: string; type?: string; className?: string };

export function DownloadButton({ data, filename, type, className }: Props) {
  const t = useTranslations('ui.actions');
  const empty = data == null || (data instanceof Blob ? !data.size : !data.length);

  function download() {
    if (empty) return;
    const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }));
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); // Safari needs the URL alive briefly after click()
  }

  return (
    <Button variant="outline" onClick={download} disabled={empty} className={className} aria-label={t('download')}>
      <Download />
      <span className="max-sm:hidden">{t('download')}</span>
    </Button>
  );
}
