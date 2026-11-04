'use client';

import { useEffect, useState } from 'react';
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
import { DIALECTS, formatSql, type Dialect, type KeywordCase, type SqlResult } from './logic';

const DIALECT_LABEL: Record<Exclude<Dialect, 'sql'>, string> = { postgresql: 'PostgreSQL', mysql: 'MySQL', sqlite: 'SQLite', tsql: 'SQL Server (T-SQL)', bigquery: 'BigQuery' };

export default function SqlFormatter() {
  const t = useTranslations('tools.sql-formatter.ui');
  const tActions = useTranslations('ui.actions');
  const [input, setInput, remember, setRemember] = useRememberedInput('sql-formatter', '');
  const [dialect, setDialect] = useState<Dialect>('sql');
  const [keywordCase, setKeywordCase] = useState<KeywordCase>('upper');
  const [indent, setIndent] = useState<'2' | '4'>('2');
  const [result, setResult] = useState<SqlResult>({ ok: true, output: '' });

  useEffect(() => {
    let stale = false;
    const id = setTimeout(() => formatSql(input, dialect, keywordCase, Number(indent)).then((r) => !stale && setResult(r)), 200);
    return () => { stale = true; clearTimeout(id); };
  }, [input, dialect, keywordCase, indent]);
  const output = result.ok ? result.output : '';

  return (
    <ToolCard
      actions={
        <>
          <CopyButton text={output} />
          <DownloadButton data={output} filename="query.sql" type="application/sql" />
        </>
      }
      options={
        <>
          <label className="flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
            {t('dialect')}
            <select value={dialect} onChange={(e) => setDialect(e.target.value as Dialect)} className={cn(fieldClass, 'font-sans normal-case tracking-normal')}>
              {DIALECTS.map((d) => <option key={d} value={d}>{d === 'sql' ? t('standardSql') : DIALECT_LABEL[d]}</option>)}
            </select>
          </label>
          <Segmented label={t('keywords')} showLabel value={keywordCase} onChange={setKeywordCase} options={(['upper', 'lower', 'preserve'] as const).map((k) => ({ value: k, label: t(`case.${k}`) }))} />
          <Segmented label={t('indent')} showLabel value={indent} onChange={setIndent} options={[{ value: '2', label: '2' }, { value: '4', label: '4' }]} />
          <RememberToggle checked={remember} onChange={setRemember} />
        </>
      }
    >
      <SplitPanes
        label={tActions('resize')}
        left={
          <Pane
            label="SQL"
            htmlFor="sql-input"
            aside={input && (
              <Button variant="ghost" size="xs" onClick={() => setInput('')}>
                <X />
                {tActions('clear')}
              </Button>
            )}
          >
            <textarea id="sql-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('placeholder')} spellCheck={false} aria-invalid={!result.ok} className={editorClass} />
            {!result.ok && (
              <p aria-live="polite" className="flex items-start gap-2 border-t border-destructive/30 bg-destructive/8 px-4 py-2.5 text-sm text-destructive">
                <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span><span className="font-medium">{t('invalid')}</span> <span className="font-mono text-xs break-all">{result.message}</span></span>
              </p>
            )}
          </Pane>
        }
        right={
          <Pane label={t('output')} htmlFor="sql-output" className="max-lg:border-t">
            <textarea id="sql-output" readOnly value={output} placeholder={t('outputPlaceholder')} spellCheck={false} className={cn(editorClass, 'text-foreground/90')} />
          </Pane>
        }
      />
    </ToolCard>
  );
}
