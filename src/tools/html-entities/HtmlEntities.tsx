'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/CopyButton';
import { DownloadButton } from '@/components/DownloadButton';
import { RememberToggle } from '@/components/RememberToggle';
import { Segmented } from '@/components/Segmented';
import { SplitPanes } from '@/components/SplitPanes';
import { editorClass, Pane, ToolCard } from '@/components/ToolCard';
import { useRememberedInput } from '@/lib/useRememberedInput';
import { cn } from '@/lib/utils';
import { decodeEntities, encodeEntities } from './logic';

type Mode = 'encode' | 'decode';

export default function HtmlEntities() {
  const t = useTranslations('tools.html-entities.ui');
  const tActions = useTranslations('ui.actions');
  const [text, setText, remember, setRemember] = useRememberedInput('html-entities', '');
  const [mode, setMode] = useState<Mode>('encode');
  const [scope, setScope] = useState<'special' | 'all'>('special');
  const [output, setOutput] = useState('');

  useEffect(() => {
    let stale = false;
    const id = setTimeout(() => (mode === 'encode' ? encodeEntities(text, scope) : decodeEntities(text)).then((r) => !stale && setOutput(r)), 120);
    return () => { stale = true; clearTimeout(id); };
  }, [text, mode, scope]);

  return (
    <ToolCard
      actions={
        <>
          <Segmented label={t('mode')} value={mode} onChange={setMode} options={[{ value: 'encode', label: t('encode') }, { value: 'decode', label: t('decode') }]} />
          <CopyButton text={output} className="max-sm:ml-auto" />
          <DownloadButton data={output} filename={mode === 'encode' ? 'encoded.html' : 'decoded.txt'} type="text/plain" />
        </>
      }
      options={
        <>
          {mode === 'encode' && (
            <Segmented label={t('scope')} showLabel value={scope} onChange={setScope} options={[{ value: 'special', label: t('special') }, { value: 'all', label: t('all') }]} />
          )}
          <RememberToggle checked={remember} onChange={setRemember} />
        </>
      }
    >
      <SplitPanes
        label={tActions('resize')}
        left={
          <Pane
            label={t('input')}
            htmlFor="entities-input"
            aside={text && (
              <Button variant="ghost" size="xs" onClick={() => setText('')}>
                <X />
                {tActions('clear')}
              </Button>
            )}
          >
            <textarea id="entities-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={t(mode === 'encode' ? 'encodePlaceholder' : 'decodePlaceholder')} spellCheck={false} className={editorClass} />
          </Pane>
        }
        right={
          <Pane label={t('output')} htmlFor="entities-output" className="max-lg:border-t">
            <textarea id="entities-output" readOnly value={output} placeholder={t('outputPlaceholder')} spellCheck={false} className={cn(editorClass, 'text-foreground/90')} />
          </Pane>
        }
      />
    </ToolCard>
  );
}
