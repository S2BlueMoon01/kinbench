'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/CopyButton';
import { DownloadButton } from '@/components/DownloadButton';
import { editorClass, fieldClass, Pane, ToolCard } from '@/components/ToolCard';
import { cn } from '@/lib/utils';
import { entropyBits, generatePassword, LENGTH, strength, type Options, type SetName } from './logic';

const SET_NAMES: SetName[] = ['lower', 'upper', 'digits', 'symbols'];
const meter = { weak: 'bg-destructive', fair: 'bg-[oklch(0.75_0.15_75)]', strong: 'bg-success', veryStrong: 'bg-success' };
const optionLabel = 'inline-flex min-h-9 items-center gap-2 text-sm pointer-coarse:min-h-11';

export default function PasswordGenerator() {
  const t = useTranslations('tools.password-generator.ui');
  const [opts, setOpts] = useState<Options>({ length: 20, sets: SET_NAMES, excludeSimilar: false });
  const [count, setCount] = useState(5);
  const [passwords, setPasswords] = useState<string[]>([]);
  const n = Number.isInteger(count) ? Math.min(50, Math.max(1, count)) : 1;
  const regenerate = () => setPasswords(Array.from({ length: n }, () => generatePassword(opts)).filter((p): p is string => p !== null));

  // Generated after mount, never at build time, so the static HTML holds no password.
  useEffect(regenerate, [opts, n]); // regenerate reads only opts and n

  const bits = entropyBits(opts);
  const level = strength(bits);
  const output = passwords.join('\n');
  const toggleSet = (s: SetName) => setOpts((o) => ({ ...o, sets: o.sets.includes(s) ? o.sets.filter((x) => x !== s) : SET_NAMES.filter((x) => x === s || o.sets.includes(x)) }));

  return (
    <ToolCard
      actions={
        <>
          <Button onClick={regenerate} disabled={passwords.length === 0}>
            <RefreshCw />
            {t('generate')}
          </Button>
          <CopyButton text={output} className="max-sm:ml-auto" />
          <DownloadButton data={output} filename="passwords.txt" type="text/plain" />
        </>
      }
      options={
        <>
          <label className="flex items-center gap-3 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
            {t('length')}
            <input type="range" min={LENGTH.min} max={64} value={Math.min(opts.length, 64)} onChange={(e) => setOpts({ ...opts, length: e.target.valueAsNumber })} className="h-11 w-32 accent-primary sm:h-8" aria-label={t('length')} />
            <input type="number" min={LENGTH.min} max={LENGTH.max} value={Number.isNaN(opts.length) ? '' : opts.length} onChange={(e) => setOpts({ ...opts, length: e.target.valueAsNumber })} className={cn(fieldClass, 'w-20')} aria-label={t('length')} />
          </label>
          <label className="flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
            {t('count')}
            <input type="number" min={1} max={50} value={Number.isNaN(count) ? '' : count} onChange={(e) => setCount(e.target.valueAsNumber)} className={cn(fieldClass, 'w-16')} />
          </label>
        </>
      }
    >
      <div className="grid lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Pane label={t('characters')}>
          <fieldset className="flex flex-col gap-1 p-4">
            <legend className="sr-only">{t('characters')}</legend>
            {SET_NAMES.map((s) => (
              <label key={s} className={optionLabel}>
                <input type="checkbox" checked={opts.sets.includes(s)} onChange={() => toggleSet(s)} className="size-4 accent-primary" />
                {t(`sets.${s}`)}
              </label>
            ))}
            <label className={cn(optionLabel, 'mt-2 border-t border-dashed pt-3')}>
              <input type="checkbox" checked={opts.excludeSimilar} onChange={(e) => setOpts({ ...opts, excludeSimilar: e.target.checked })} className="size-4 accent-primary" />
              {t('excludeSimilar')}
            </label>
          </fieldset>
        </Pane>
        <Pane
          label={t('output')}
          htmlFor="pw-output"
          className="max-lg:border-t lg:border-l"
          aside={bits > 0 && (
            <span className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <span aria-hidden className="flex gap-0.5">
                {(['weak', 'fair', 'strong', 'veryStrong'] as const).map((l, i) => (
                  <span key={l} className={cn('h-1.5 w-5 rounded-full', i <= ['weak', 'fair', 'strong', 'veryStrong'].indexOf(level) ? meter[level] : 'bg-muted')} />
                ))}
              </span>
              {t(`strength.${level}`)} · {t('bits', { bits })}
            </span>
          )}
        >
          {passwords.length === 0 && opts.sets.length === 0 ? (
            <p className="p-4 text-sm text-destructive">{t('noSets')}</p>
          ) : (
            <textarea id="pw-output" readOnly value={output} spellCheck={false} className={cn(editorClass, 'lg:h-[min(50vh,520px)]')} />
          )}
        </Pane>
      </div>
    </ToolCard>
  );
}
