'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { CircleAlert, ShieldAlert, ShieldCheck, ShieldX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/CopyButton';
import { RememberToggle } from '@/components/RememberToggle';
import { SplitPanes } from '@/components/SplitPanes';
import { editorClass, fieldClass, Pane, ToolCard } from '@/components/ToolCard';
import { useRememberedInput } from '@/lib/useRememberedInput';
import { cn } from '@/lib/utils';
import { canVerify, decodeJwt, timeClaims, verifyHmac } from './logic';

const SAMPLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  const tActions = useTranslations('ui.actions');
  const text = JSON.stringify(value, null, 2);
  return (
    <section className="border-b border-dashed">
      <div className="flex items-center justify-between gap-3 pt-1.5 pr-2 pl-4">
        <h3 className="font-mono text-xs text-muted-foreground">{label}</h3>
        <CopyButton iconOnly text={text} label={tActions('copyNamed', { name: label })} />
      </div>
      <pre className="overflow-x-auto px-4 pb-3 font-mono text-[13px] leading-relaxed">{text}</pre>
    </section>
  );
}

export default function JwtDecoder() {
  const t = useTranslations('tools.jwt-decoder.ui');
  const tActions = useTranslations('ui.actions');
  const format = useFormatter();
  const [token, setToken, remember, setRemember] = useRememberedInput('jwt-decoder', '');
  const [secret, setSecret] = useState(''); // never persisted
  const [verified, setVerified] = useState<boolean | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const deferred = useDeferredValue(token);
  const result = useMemo(() => (deferred.trim() ? decodeJwt(deferred) : null), [deferred]);
  const jwt = result?.ok ? result.jwt : null;
  const alg = jwt?.header.alg;

  useEffect(() => setNow(Date.now()), [jwt]);

  useEffect(() => {
    setVerified(null);
    if (!jwt || !secret || !canVerify(jwt.header.alg)) return;
    let stale = false;
    verifyHmac(jwt, secret).then((ok) => !stale && setVerified(ok), () => !stale && setVerified(false));
    return () => { stale = true; };
  }, [jwt, secret]);

  const timeZone = now === null ? undefined : Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <ToolCard options={<RememberToggle checked={remember} onChange={setRemember} />}>
      <SplitPanes
        label={tActions('resize')}
        left={
          <Pane
            label={t('token')}
            htmlFor="jwt-input"
            aside={token && (
              <Button variant="ghost" size="xs" onClick={() => setToken('')}>
                <X />
                {tActions('clear')}
              </Button>
            )}
          >
            <div className="relative">
              <textarea
                id="jwt-input"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={t('placeholder')}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                aria-invalid={result?.ok === false}
                aria-describedby={result?.ok === false ? 'jwt-error' : undefined}
                className={cn(editorClass, 'break-all')}
              />
              {!token && (
                <Button variant="secondary" size="sm" className="absolute bottom-4 left-4" onClick={() => setToken(SAMPLE)}>
                  {t('sample')}
                </Button>
              )}
            </div>
            {result?.ok === false && (
              <p id="jwt-error" aria-live="polite" className="flex items-center gap-2 border-t border-destructive/30 bg-destructive/8 px-4 py-2.5 text-sm font-medium text-destructive">
                <CircleAlert aria-hidden className="size-4 shrink-0" />
                {t(`errors.${result.error}`)}
              </p>
            )}
          </Pane>
        }
        right={
          <Pane label={t('decoded')} className="max-lg:border-t">
            {!jwt ? (
              <p className="p-4 text-sm text-muted-foreground">{t('empty')}</p>
            ) : (
              <>
                <JsonBlock label={t('header')} value={jwt.header} />
                <JsonBlock label={t('payload')} value={jwt.payload} />
                {now !== null && timeClaims(jwt.payload).length > 0 && (
                  <dl className="divide-y divide-dashed border-b border-dashed">
                    {timeClaims(jwt.payload).map(({ name, date }) => {
                      const valid = !Number.isNaN(date.getTime());
                      const expired = name === 'exp' && valid && date.getTime() < now;
                      return (
                        <div key={name} className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 py-2.5 text-sm">
                          <dt className="text-muted-foreground">{t(`claims.${name}`)}</dt>
                          <dd className="font-mono">
                            {valid ? `${format.dateTime(date, { dateStyle: 'medium', timeStyle: 'medium', timeZone })} · ${format.relativeTime(date, now)}` : '—'}
                            {name === 'exp' && valid && (
                              <span className={cn('ml-2 rounded px-1.5 py-0.5 font-sans text-xs font-medium', expired ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success')}>
                                {t(expired ? 'expired' : 'notExpired')}
                              </span>
                            )}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                )}
                <section className="space-y-3 p-4" aria-live="polite">
                  <h3 className="font-mono text-xs text-muted-foreground">{t('signature')}</h3>
                  {canVerify(alg) ? (
                    <>
                      <label htmlFor="jwt-secret" className="block text-sm">{t('secretLabel', { alg })}</label>
                      <input id="jwt-secret" type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} className={cn(fieldClass, 'w-full')} />
                      <p className="text-xs text-muted-foreground">{t('secretNote')}</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('cannotVerify', { alg: String(alg ?? 'none') })}</p>
                  )}
                  {verified === null ? (
                    <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm"><ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0" />{t('notVerified')}</p>
                  ) : verified ? (
                    <p className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2.5 text-sm font-medium text-success"><ShieldCheck aria-hidden className="size-4 shrink-0" />{t('verified')}</p>
                  ) : (
                    <p className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm font-medium text-destructive"><ShieldX aria-hidden className="size-4 shrink-0" />{t('invalidSignature')}</p>
                  )}
                </section>
              </>
            )}
          </Pane>
        }
      />
    </ToolCard>
  );
}
