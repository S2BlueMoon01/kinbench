# Add a tool

Use an existing tool as the template: `base64` (simple), `hash-generator` (Web Worker), `css-formatter` (lazy library).

**1. Registry entry** — `src/tools/registry.ts`

```ts
{ slug: 'url-encoder', category: 'encode', icon: Link, relatedTools: ['base64'], heavyDeps: [] },
```

The slug is the URL (`/vi/tools/url-encoder`) and the message namespace. The category must be one of `categories`;
list libraries over ~50 KB in `heavyDeps`.

**2. Logic and tests** — `src/tools/<slug>/logic.ts` and `logic.test.ts`

Pure functions, no React or DOM, so they run in Vitest. Test normal input, empty input and invalid input.
Load heavy libraries with `await import()` inside the function, and run CPU-heavy work in a worker
(`<name>.worker.ts` + `useWorker`, as in `hash-generator`).

**3. UI** — `src/tools/<slug>/<Name>.tsx` (default export, `'use client'`)

Build it from `ToolCard` (actions, collapsible options), `Pane`, `SplitPanes`, `CopyButton`, `DownloadButton`,
`FileDrop`, `Segmented`, `RememberToggle`, `useRememberedInput`. Read text with `useTranslations('tools.<slug>.ui')`;
no hard-coded strings. Then add the lazy import to `src/tools/components.tsx`:

```ts
'url-encoder': dynamic(() => import('./url-encoder/UrlEncoder')),
```

**4. Messages** — the same keys in `messages/en.json` and `messages/vi.json`, under `tools.<slug>`:

| Key | Notes |
|---|---|
| `title` | H1, breadcrumb, search, cards |
| `metaTitle` | `<Name> — runs in your browser, no upload \| Kinbench` / `<Tên> online — xử lý ngay trên trình duyệt, không tải lên server \| Kinbench` |
| `metaDescription` | ≤ 155 characters; must say it runs locally and nothing is sent to a server |
| `intro` | the paragraph under the H1; say that it runs locally |
| `howTo.*` | 3–4 steps, as an object with named keys |
| `faq.*.q` / `faq.*.a` | 2–4 questions; "Is my data sent to a server?" is added automatically |
| `ui.*` | every string the component shows |

**5. E2E** — add an entry to `toolActions` in `e2e/tool-actions.ts` that uses the tool's main features with
`secret` as the data and asserts the visible result. That one function gives the tool its page test (3 viewports ×
2 themes × 2 languages), its no-network privacy test and its SEO test.

**6. Check** — `pnpm test`, `pnpm build`, `pnpm e2e`. The sitemap, category page, search, OG image and related-tools
links pick the tool up from the registry.
