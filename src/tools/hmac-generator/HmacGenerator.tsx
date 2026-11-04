'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/Segmented';
import { SplitPanes } from '@/components/SplitPanes';
import { editorClass, fieldClass, Pane, ToolCard } from '@/components/ToolCard';
import { ValueRows } from '@/components/ValueRows';
import { cn } from '@/lib/utils';
import { ALGORITHMS, hmac, keyBytes, type Algorithm, type KeyFormat } from './logic';

// Message and key are secrets more often than not, so this tool has no "remember input" option.
export default function HmacGenerator() {
  const t = useTranslations('tools.hmac-generator.ui');
  const tActions = useTranslations('ui.actions');
  const [message, setMessage] = useState('');
  const [key, setKey] = useState('');
  const [keyFormat, setKeyFormat] = useState<KeyFormat>('text');
  const [algorithm, setAlgorithm] = useState<Algorithm>('SHA-256');
  const [result, setResult] = useState<{ hex: string; base64: string } | null>(null);
  const bytes = keyBytes(key, keyFormat);

  useEffect(() => {
    let stale = false;
    const k = keyBytes(key, keyFormat);
    if (!k) { setResult(null); return; }
    const id = setTimeout(() => hmac(message, k, algorithm).then((r) => !stale && setResult(r)), 120);
    return () => { stale = true; clearTimeout(id); };
  }, [message, key, keyFormat, algorithm]);

  return (
    <ToolCard
      options={<Segmented label={t('algorithm')} showLabel value={algorithm} onChange={setAlgorithm} options={ALGORITHMS.map((a) => ({ value: a, label: a }))} />}
    >
      <SplitPanes
        label={tActions('resize')}
        left={
          <Pane
            label={t('message')}
            htmlFor="hmac-message"
            aside={message && (
              <Button variant="ghost" size="xs" onClick={() => setMessage('')}>
                <X />
                {tActions('clear')}
              </Button>
            )}
          >
            <textarea id="hmac-message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('messagePlaceholder')} spellCheck={false} className={cn(editorClass, 'lg:h-[min(50vh,520px)]')} />
          </Pane>
        }
        right={
          <Pane label={t('key')} className="max-lg:border-t">
            <div className="space-y-3 p-4">
              <Segmented label={t('keyFormat')} showLabel value={keyFormat} onChange={setKeyFormat} options={(['text', 'hex', 'base64'] as const).map((f) => ({ value: f, label: t(`formats.${f}`) }))} />
              <label htmlFor="hmac-key" className="sr-only">{t('key')}</label>
              <input
                id="hmac-key"
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={t('keyPlaceholder')}
                autoComplete="off"
                aria-invalid={key !== '' && !bytes}
                aria-describedby="hmac-key-note"
                className={cn(fieldClass, 'w-full text-base')}
              />
              <p id="hmac-key-note" className={cn('text-xs', key !== '' && !bytes ? 'text-destructive' : 'text-muted-foreground')}>
                {key !== '' && !bytes ? t(`invalidKey.${keyFormat}`) : t('keyNote')}
              </p>
            </div>
            <div className="border-t border-dashed" aria-live="polite">
              {result ? (
                <ValueRows rows={[{ label: t('hex', { algorithm }), value: result.hex }, { label: t('base64', { algorithm }), value: result.base64 }]} />
              ) : (
                <p className="p-4 text-sm text-muted-foreground">{t('empty')}</p>
              )}
            </div>
          </Pane>
        }
      />
    </ToolCard>
  );
}
