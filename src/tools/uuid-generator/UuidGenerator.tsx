'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/CopyButton';
import { DownloadButton } from '@/components/DownloadButton';
import { Segmented } from '@/components/Segmented';
import { editorClass, fieldClass, Pane, ToolCard } from '@/components/ToolCard';
import { cn } from '@/lib/utils';
import { generate, LIMITS, type Kind } from './logic';

const optionLabel = 'flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase';

export default function UuidGenerator() {
  const t = useTranslations('tools.uuid-generator.ui');
  const [kind, setKind] = useState<Kind>('uuid');
  const [count, setCount] = useState(5);
  const [size, setSize] = useState(21);
  const [ids, setIds] = useState<string[]>([]);

  // Generated in the browser after mount, so the static HTML never ships a pre-made ID.
  useEffect(() => setIds(generate(kind, count, size)), [kind, count, size]);
  const output = ids.join('\n');

  return (
    <ToolCard
      actions={
        <>
          <Button onClick={() => setIds(generate(kind, count, size))}>
            <RefreshCw />
            {t('generate')}
          </Button>
          <CopyButton text={output} className="max-sm:ml-auto" />
          <DownloadButton data={output} filename={`${kind}s.txt`} type="text/plain" />
        </>
      }
      options={
        <>
          <Segmented label={t('kind')} value={kind} onChange={setKind} options={[{ value: 'uuid', label: 'UUID v4' }, { value: 'ulid', label: 'ULID' }, { value: 'nanoid', label: 'nanoid' }]} />
          <label className={optionLabel}>
            {t('count')}
            <input type="number" min={LIMITS.count[0]} max={LIMITS.count[1]} value={Number.isNaN(count) ? "" : count} onChange={(e) => setCount(e.target.valueAsNumber)} className={cn(fieldClass, 'w-20')} />
          </label>
          {kind === 'nanoid' && (
            <label className={optionLabel}>
              {t('size')}
              <input type="number" min={LIMITS.size[0]} max={LIMITS.size[1]} value={Number.isNaN(size) ? "" : size} onChange={(e) => setSize(e.target.valueAsNumber)} className={cn(fieldClass, 'w-20')} />
            </label>
          )}
        </>
      }
    >
      <Pane label={t('output')} htmlFor="uuid-output" aside={<span className="font-mono text-xs text-muted-foreground">{t('generated', { count: ids.length })}</span>}>
        <textarea id="uuid-output" readOnly value={output} spellCheck={false} className={cn(editorClass, 'lg:h-[min(50vh,520px)]')} />
      </Pane>
    </ToolCard>
  );
}
