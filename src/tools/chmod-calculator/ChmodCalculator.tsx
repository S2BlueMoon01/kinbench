'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { fieldClass, Pane, ToolCard } from '@/components/ToolCard';
import { ValueRows } from '@/components/ValueRows';
import { cn } from '@/lib/utils';
import { bit, parseOctal, parseSymbolic, PERMS, SPECIAL, specialBit, toOctal, toSymbolic, WHO } from './logic';

const box = 'size-5 accent-primary pointer-coarse:size-6';

export default function ChmodCalculator() {
  const t = useTranslations('tools.chmod-calculator.ui');
  const [mode, setMode] = useState(0o755);
  // While a field is being edited it may be invalid; it shows the typed text until it parses.
  const [draft, setDraft] = useState<{ field: 'octal' | 'symbolic'; text: string } | null>(null);
  const toggle = (b: number) => { setMode((m) => m ^ b); setDraft(null); };

  const text = (field: 'octal' | 'symbolic') => (draft?.field === field ? draft.text : field === 'octal' ? toOctal(mode) : toSymbolic(mode));
  function edit(field: 'octal' | 'symbolic', value: string) {
    setDraft({ field, text: value });
    const parsed = field === 'octal' ? parseOctal(value) : parseSymbolic(value);
    if (parsed !== null) setMode(parsed);
  }
  const invalid = (field: 'octal' | 'symbolic') => draft?.field === field && (field === 'octal' ? parseOctal(draft.text) : parseSymbolic(draft.text)) === null;

  return (
    <ToolCard>
      <div className="grid lg:grid-cols-2">
        <Pane label={t('permissions')}>
          <div className="overflow-x-auto p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <td />
                  {PERMS.map((p) => <th key={p} scope="col" className="px-2 py-2 font-normal">{t(`perm.${p}`)}</th>)}
                </tr>
              </thead>
              <tbody>
                {WHO.map((who) => (
                  <tr key={who} className="border-t border-dashed">
                    <th scope="row" className="py-2 pr-3 text-left font-medium">{t(`who.${who}`)}</th>
                    {PERMS.map((p) => (
                      <td key={p} className="px-2 py-2 text-center">
                        <input type="checkbox" aria-label={`${t(`who.${who}`)} — ${t(`perm.${p}`)}`} checked={!!(mode & bit(who, p))} onChange={() => toggle(bit(who, p))} className={box} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <fieldset className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-dashed pt-4">
              <legend className="sr-only">{t('special')}</legend>
              {SPECIAL.map((s) => (
                <label key={s} className="inline-flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!(mode & specialBit(s))} onChange={() => toggle(specialBit(s))} className={box} />
                  {t(`specialBits.${s}`)}
                </label>
              ))}
            </fieldset>
          </div>
        </Pane>
        <Pane label={t('result')} className="max-lg:border-t lg:border-l">
          <div className="grid grid-cols-2 gap-3 p-4">
            {(['octal', 'symbolic'] as const).map((f) => (
              <label key={f} className="block">
                <span className="text-sm text-muted-foreground">{t(f)}</span>
                <input value={text(f)} onChange={(e) => edit(f, e.target.value)} onBlur={() => setDraft(null)} spellCheck={false} autoComplete="off" aria-invalid={invalid(f)} className={cn(fieldClass, 'mt-2 w-full text-lg')} />
              </label>
            ))}
          </div>
          <div className="border-t border-dashed">
            <ValueRows rows={[{ label: t('command'), value: `chmod ${toOctal(mode)} ${t('file')}` }, { label: t('lsOutput'), value: `-${toSymbolic(mode)}` }]} />
          </div>
        </Pane>
      </div>
    </ToolCard>
  );
}
