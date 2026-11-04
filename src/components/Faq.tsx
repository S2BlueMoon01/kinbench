import { Plus } from 'lucide-react';

export type FaqItem = { q: string; a: string };

/** Server-rendered questions; pair with faqJsonLd(items) from lib/seo for the FAQPage node. */
export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="mt-3">
      {items.map(({ q, a }) => (
        <details key={q} className="group border-b">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden">
            {q}
            <Plus aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-45 motion-reduce:transition-none" />
          </summary>
          <p className="pb-4 leading-relaxed text-muted-foreground">{a}</p>
        </details>
      ))}
    </div>
  );
}
