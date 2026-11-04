import { getTranslations } from 'next-intl/server';
import { LockKeyhole } from 'lucide-react';
import { cn } from '@/lib/utils';

export async function PrivacyBadge({ className }: { className?: string }) {
  const t = await getTranslations('site');
  return (
    <p className={cn('inline-flex items-center gap-2 rounded-full border border-success/30 bg-card px-3 py-1 text-sm font-medium text-success', className)}>
      <LockKeyhole aria-hidden className="size-3.5" />
      {t('privacyBadge')}
    </p>
  );
}
