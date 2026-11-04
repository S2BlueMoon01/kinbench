'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = { text: string; className?: string; iconOnly?: boolean; label?: string };

/** `iconOnly` for rows of values; `label` then names what is copied (e.g. "Copy SHA-256"). */
export function CopyButton({ text, className, iconOnly, label }: Props) {
  const t = useTranslations('ui.actions');
  const [state, setState] = useState<'copy' | 'copied' | 'copyFailed'>('copy');
  const timer = useRef(0);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('copyFailed');
    }
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('copy'), 1600);
  }

  return (
    <Button
      variant={iconOnly ? 'ghost' : 'outline'}
      size={iconOnly ? 'icon' : 'default'}
      onClick={copy}
      disabled={!text}
      className={className}
      aria-label={iconOnly ? (state === 'copy' ? (label ?? t('copy')) : t(state)) : undefined}
    >
      {state === 'copied' ? <Check className="text-success motion-safe:animate-in motion-safe:zoom-in-50" /> : <Copy />}
      <span aria-live="polite" className={iconOnly ? 'sr-only' : undefined}>{t(state)}</span>
    </Button>
  );
}
