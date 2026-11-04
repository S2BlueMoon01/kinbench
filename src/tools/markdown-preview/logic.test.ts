import { describe, expect, it } from 'vitest';
import { htmlDocument, markdownToHtml } from './logic';

describe('markdown', () => {
  it('renders GitHub-flavored Markdown', async () => {
    expect(await markdownToHtml('# Xin chào\n\n- [x] done\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n~~old~~ `code`')).toBe(
      '<h1>Xin chào</h1>\n<ul>\n<li><input checked="" disabled="" type="checkbox"> done</li>\n</ul>\n<table>\n<thead>\n<tr>\n<th>a</th>\n<th>b</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>1</td>\n<td>2</td>\n</tr>\n</tbody></table>\n<p><del>old</del> <code>code</code></p>\n',
    );
  });

  it('renders empty input as nothing', async () => {
    expect(await markdownToHtml('')).toBe('');
  });

  it('passes raw HTML through for the sanitizer to handle', async () => {
    expect(await markdownToHtml('<script>alert(1)</script>')).toContain('<script>');
  });

  it('builds an export document with an escaped title', async () => {
    const doc = htmlDocument('<p>x</p>', 'A <b> & "c"', 'vi');
    expect(doc).toContain('<html lang="vi">');
    expect(doc).toContain('<title>A &lt;b> &amp; &quot;c&quot;</title>');
  });
});
