/**
 * GitHub-flavored Markdown to HTML. The result is NOT safe to insert as is: the page sanitizes it with DOMPurify,
 * which needs a DOM, before showing or exporting it. marked loads on first use.
 */
export const markdownToHtml = async (md: string) => (await import('marked')).marked.parse(md, { gfm: true, async: false });

/** A standalone HTML file for the export, with minimal readable styles. */
export const htmlDocument = (body: string, title: string, lang: string) =>
  `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title.replace(/[<&"]/g, (c) => ({ '<': '&lt;', '&': '&amp;', '"': '&quot;' })[c]!)}</title>
<style>body{max-width:46rem;margin:2rem auto;padding:0 1rem;font:16px/1.6 system-ui,sans-serif}pre{overflow:auto;padding:1rem;background:#f4f6f8}code{font-family:ui-monospace,monospace}table{border-collapse:collapse}td,th{border:1px solid #ccd;padding:.3rem .6rem}img{max-width:100%}</style>
</head>
<body>
${body}
</body>
</html>
`;
