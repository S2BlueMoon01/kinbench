'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CircleAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/CopyButton';
import { RememberToggle } from '@/components/RememberToggle';
import { Segmented } from '@/components/Segmented';
import { SplitPanes } from '@/components/SplitPanes';
import { editorClass, Pane, ToolCard } from '@/components/ToolCard';
import { ValueRows } from '@/components/ValueRows';
import { useRememberedInput } from '@/lib/useRememberedInput';
import { cn } from '@/lib/utils';
import { decodeUrl, encodeUrl, parseUrl, type Scope } from './logic';

type Mode = 'encode' | 'decode';
const half = 'h-[24vh] min-h-36 sm:h-[30vh] lg:h-[min(30vh,320px)]';

export default function UrlEncoder() {
  const t = useTranslations('tools.url-encoder.ui');
  const tActions = useTranslations('ui.actions');
  const [text, setText, remember, setRemember] = useRememberedInput('url-encoder', '');
  const [mode, setMode] = useState<Mode>('encode');
  const [scope, setScope] = useState<Scope>('component');
  const input = useDeferredValue(text);
  const output = useMemo(() => (mode === 'encode' ? encodeUrl(input, scope) : decodeUrl(input, scope)), [input, mode, scope]);
  // Parse whichever side is a readable URL: the decoded output, or the input itself.
  const parts = useMemo(() => (mode === 'decode' && output ? parseUrl(output) : null) ?? parseUrl(input), [input, output, mode]);

  return (
    <ToolCard
      actions={
        <>
          <Segmented label={t('mode')} value={mode} onChange={setMode} options={[{ value: 'encode', label: t('encode') }, { value: 'decode', label: t('decode') }]} />
          <CopyButton text={output ?? ''} className="max-sm:ml-auto" />
        </>
      }
      options={
        <>
          <Segmented label={t('scope')} showLabel value={scope} onChange={setScope} options={[{ value: 'component', label: t('component') }, { value: 'full', label: t('fullUrl') }]} />
          <RememberToggle checked={remember} onChange={setRemember} />
        </>
      }
    >
      <SplitPanes
        label={tActions('resize')}
        left={
          <Pane
            label={t('input')}
            htmlFor="url-input"
            aside={text && (
              <Button variant="ghost" size="xs" onClick={() => setText('')}>
                <X />
                {tActions('clear')}
              </Button>
            )}
          >
            <textarea
              id="url-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t(mode === 'encode' ? 'encodePlaceholder' : 'decodePlaceholder')}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              aria-invalid={output === null}
              aria-describedby={output === null ? 'url-error' : undefined}
              className={cn(editorClass, half)}
            />
            {output === null && (
              <p id="url-error" aria-live="polite" className="flex items-center gap-2 border-t border-destructive/30 bg-destructive/8 px-4 py-2.5 text-sm font-medium text-destructive">
                <CircleAlert aria-hidden className="size-4 shrink-0" />
                {t(mode === 'encode' ? 'encodeError' : 'decodeError')}
              </p>
            )}
            <div className="border-t">
              <Pane label={t('output')} htmlFor="url-output">
                <textarea id="url-output" readOnly value={output ?? ''} placeholder={t('outputPlaceholder')} spellCheck={false} className={cn(editorClass, half, 'break-all text-foreground/90')} />
              </Pane>
            </div>
          </Pane>
        }
        right={
          <Pane label={t('parts')} className="max-lg:border-t">
            {parts ? (
              <>
                <ValueRows
                  rows={(['protocol', 'username', 'password', 'hostname', 'port', 'pathname', 'hash'] as const)
                    .filter((k) => parts[k])
                    .map((k) => ({ label: t(`part.${k}`), value: parts[k] }))}
                />
                {parts.params.length > 0 && (
                  <div className="overflow-x-auto border-t border-dashed">
                    <table className="w-full text-left text-sm">
                      <caption className="px-4 pt-3 text-left text-xs text-muted-foreground">{t('params', { count: parts.params.length })}</caption>
                      <thead>
                        <tr className="text-xs text-muted-foreground">
                          <th scope="col" className="px-4 py-2 font-normal">{t('key')}</th>
                          <th scope="col" className="px-4 py-2 font-normal">{t('value')}</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono">
                        {parts.params.map(([k, v], i) => (
                          <tr key={i} className="border-t border-dashed align-top">
                            <td className="px-4 py-2 break-all">{k}</td>
                            <td className="px-4 py-2 break-all">{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">{t('noUrl')}</p>
            )}
          </Pane>
        }
      />
    </ToolCard>
  );
}
