'use client';

import { useTranslations } from 'next-intl';

export function RememberToggle({ checked, onChange }: { checked: boolean; onChange: (on: boolean) => void }) {
  const t = useTranslations('ui.actions');
  return (
    <label className="group inline-flex min-h-9 items-center gap-2.5 text-sm text-muted-foreground select-none pointer-coarse:min-h-11">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className="relative h-5 w-9 shrink-0 rounded-full border border-input bg-muted transition-colors peer-checked:border-transparent peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
        <span className="absolute top-0.5 left-0.5 size-3.5 rounded-full bg-muted-foreground transition-transform group-has-checked:translate-x-4 group-has-checked:bg-primary-foreground motion-reduce:transition-none" />
      </span>
      {t('remember')}
    </label>
  );
}
