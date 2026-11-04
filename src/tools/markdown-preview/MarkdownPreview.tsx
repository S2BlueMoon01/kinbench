'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/CopyButton';
import { DownloadButton } from '@/components/DownloadButton';
import { RememberToggle } from '@/components/RememberToggle';
import { SplitPanes } from '@/components/SplitPanes';
import { editorClass, Pane, ToolCard } from '@/components/ToolCard';
import { useRememberedInput } from '@/lib/useRememberedInput';
import { cn } from '@/lib/utils';
import { htmlDocument, markdownToHtml } from './logic';

const SAMPLE = `# Kinbench

Markdown is rendered **in your browser**: nothing is uploaded.

- [x] GitHub-flavored lists and tables
- [ ] Remote images are not loaded

| Tool | Runs on |
|------|---------|
| Markdown preview | your device |

\`\`\`js
console.log('xin chào');
\`\`\`
`;

/**
 * Removes scripts, event handlers and inline styles (the CSP blocks them anyway), and drops images from other
 * servers: loading them would tell those servers your IP address, and the CSP blocks them too.
 */
async function sanitize(html: string, remoteImage: string) {
  const DOMPurify = (await import('dompurify')).default; // with marked, ~20 KB: loaded on first input
  DOMPurify.removeHook('afterSanitizeAttributes');
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'IMG' && !/^(data|blob):/i.test(node.getAttribute('src') ?? '')) {
      node.setAttribute('alt', `[${remoteImage}: ${node.getAttribute('alt') || node.getAttribute('src') || ''}]`);
      node.removeAttribute('src');
    }
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
  return DOMPurify.sanitize(html, { FORBID_ATTR: ['style'], FORBID_TAGS: ['style'] });
}

export default function MarkdownPreview() {
  const t = useTranslations('tools.markdown-preview.ui');
  const tActions = useTranslations('ui.actions');
  const locale = useLocale();
  const [input, setInput, remember, setRemember] = useRememberedInput('markdown-preview', '');
  const [html, setHtml] = useState('');

  useEffect(() => {
    if (!input) { setHtml(''); return; }
    let stale = false;
    const id = setTimeout(async () => {
      const clean = await sanitize(await markdownToHtml(input), t('remoteImage'));
      if (!stale) setHtml(clean);
    }, 120);
    return () => { stale = true; clearTimeout(id); };
  }, [input, t]);
  const title = input.match(/^#\s+(.+)$/m)?.[1] ?? 'Markdown';

  return (
    <ToolCard
      actions={
        <>
          <CopyButton text={html} />
          <DownloadButton data={html ? htmlDocument(html, title, locale) : ''} filename="document.html" type="text/html" />
        </>
      }
      options={<RememberToggle checked={remember} onChange={setRemember} />}
    >
      <SplitPanes
        label={tActions('resize')}
        left={
          <Pane
            label="Markdown"
            htmlFor="md-input"
            aside={input && (
              <Button variant="ghost" size="xs" onClick={() => setInput('')}>
                <X />
                {tActions('clear')}
              </Button>
            )}
          >
            <div className="relative">
              <textarea id="md-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('placeholder')} spellCheck={false} className={editorClass} />
              {!input && (
                <Button variant="secondary" size="sm" className="absolute bottom-4 left-4" onClick={() => setInput(SAMPLE)}>
                  {t('sample')}
                </Button>
              )}
            </div>
          </Pane>
        }
        right={
          <Pane label={t('preview')} className="max-lg:border-t">
            {html ? (
              // Sanitized above with DOMPurify.
              <div className={cn('markdown h-[36vh] min-h-52 overflow-auto p-4 sm:h-[44vh] lg:h-[min(60vh,640px)]')} dangerouslySetInnerHTML={{ __html: html }} />
            ) : (
              <p className="p-4 text-sm text-muted-foreground">{t('empty')}</p>
            )}
          </Pane>
        }
      />
    </ToolCard>
  );
}
