'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CircleAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/CopyButton';
import { DownloadButton } from '@/components/DownloadButton';
import { RememberToggle } from '@/components/RememberToggle';
import { Segmented } from '@/components/Segmented';
import { SplitPanes } from '@/components/SplitPanes';
import { editorClass, fieldClass, Pane, ToolCard } from '@/components/ToolCard';
import { useRememberedInput } from '@/lib/useRememberedInput';
import { cn } from '@/lib/utils';
import { toTypeScript, toZod } from './logic';

type Target = 'typescript' | 'zod';

export default function JsonToTypes() {
  const t = useTranslations('tools.json-to-types.ui');
  const tActions = useTranslations('ui.actions');
  const [input, setInput, remember, setRemember] = useRememberedInput('json-to-types', '');
  const [target, setTarget] = useState<Target>('typescript');
  const [root, setRoot] = useState('Root');
  const json = useDeferredValue(input);
  const name = /^[A-Za-z_$][\w$]*$/.test(root) ? root : 'Root';

  const result = useMemo(() => {
    if (!json.trim()) return { ok: true as const, output: '' };
    try {
      const value: unknown = JSON.parse(json);
      return { ok: true as const, output: target === 'zod' ? toZod(value, name) : toTypeScript(value, name) };
    } catch (e) {
      return { ok: false as const, message: (e as Error).message };
    }
  }, [json, target, name]);
  const output = result.ok ? result.output : '';

  return (
    <ToolCard
      actions={
        <>
          <Segmented label={t('target')} value={target} onChange={setTarget} options={[{ value: 'typescript', label: 'TypeScript' }, { value: 'zod', label: 'Zod' }]} />
          <CopyButton text={output} className="max-sm:ml-auto" />
          <DownloadButton data={output} filename={target === 'zod' ? 'schema.ts' : 'types.ts'} type="text/plain" />
        </>
      }
      options={
        <>
          <label className="flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
            {t('rootName')}
            <input value={root} onChange={(e) => setRoot(e.target.value)} spellCheck={false} aria-invalid={name !== root} className={cn(fieldClass, 'w-32')} />
          </label>
          <RememberToggle checked={remember} onChange={setRemember} />
        </>
      }
    >
      <SplitPanes
        label={tActions('resize')}
        left={
          <Pane
            label="JSON"
            htmlFor="types-input"
            aside={input && (
              <Button variant="ghost" size="xs" onClick={() => setInput('')}>
                <X />
                {tActions('clear')}
              </Button>
            )}
          >
            <textarea id="types-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('placeholder')} spellCheck={false} aria-invalid={!result.ok} className={editorClass} />
            {!result.ok && (
              <p aria-live="polite" className="flex items-center gap-2 border-t border-destructive/30 bg-destructive/8 px-4 py-2.5 text-sm text-destructive">
                <CircleAlert aria-hidden className="size-4 shrink-0" />
                <span className="font-medium">{t('invalid')}</span>
                <span className="font-mono text-xs break-all">{result.message}</span>
              </p>
            )}
          </Pane>
        }
        right={
          <Pane label={target === 'zod' ? 'Zod' : 'TypeScript'} htmlFor="types-output" className="max-lg:border-t">
            <textarea id="types-output" readOnly value={output} placeholder={t('outputPlaceholder')} spellCheck={false} className={cn(editorClass, 'text-foreground/90')} />
          </Pane>
        }
      />
    </ToolCard>
  );
}
