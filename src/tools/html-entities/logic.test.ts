import { describe, expect, it } from 'vitest';
import { decodeEntities, encodeEntities } from './logic';

describe('html entities', () => {
  it('escapes special characters only, or everything non-ASCII', async () => {
    expect(await encodeEntities(`<a href="x">Tom & Jerry's ệ</a>`, 'special')).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&apos;s ệ&lt;/a&gt;');
    expect(await encodeEntities('© ệ 😀', 'all')).toBe('&copy; &#7879; &#128512;');
  });

  it('decodes named, decimal and hex entities', async () => {
    expect(await decodeEntities('&lt;b&gt; &copy; &#7879; &#x1F600; &nbsp;&hellip;')).toBe('<b> © ệ 😀  …');
  });

  it('handles empty input', async () => {
    expect(await encodeEntities('', 'all')).toBe('');
    expect(await decodeEntities('')).toBe('');
  });

  it('leaves unknown or broken entities alone, like a browser does', async () => {
    expect(await decodeEntities('&unknown; & &#xZZ;')).toBe('&unknown; & &#xZZ;');
    // HTML5 legacy rule: "&not" decodes even without a semicolon, so browsers show "¬anentity;".
    expect(await decodeEntities('&notanentity;')).toBe('¬anentity;');
  });
});
