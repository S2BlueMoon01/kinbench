'use client';

import { useDeferredValue } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RememberToggle } from '@/components/RememberToggle';
import { SplitPanes } from '@/components/SplitPanes';
import { editorClass, Pane, ToolCard } from '@/components/ToolCard';
import { ValueRows } from '@/components/ValueRows';
import { useRememberedInput } from '@/lib/useRememberedInput';
import { cn } from '@/lib/utils';
import { cases, convertCase } from './logic';

export default function CaseConverter() {
  const t = useTranslations('tools.case-converter.ui');
  const tActions = useTranslations('ui.actions');
  const locale = useLocale();
  const [text, setText, remember, setRemember] = useRememberedInput('case-converter', '');
  const input = useDeferredValue(text);

  return (
    <ToolCard options={<RememberToggle checked={remember} onChange={setRemember} />}>
      <SplitPanes
        label={tActions('resize')}
        left={
          <Pane
            label={t('input')}
            htmlFor="case-input"
            aside={text && (
              <Button variant="ghost" size="xs" onClick={() => setText('')}>
                <X />
                {tActions('clear')}
              </Button>
            )}
          >
            <textarea id="case-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('placeholder')} spellCheck={false} className={cn(editorClass, 'font-sans text-[15px]')} />
          </Pane>
        }
        right={
          <Pane label={t('output')} className="max-lg:border-t">
            {input ? (
              <ValueRows rows={cases.map((c) => ({ label: t(`cases.${c}`), value: convertCase(input, c, locale) }))} />
            ) : (
              <p className="p-4 text-sm text-muted-foreground">{t('empty')}</p>
            )}
          </Pane>
        }
      />
    </ToolCard>
  );
}
