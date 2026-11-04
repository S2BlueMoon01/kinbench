import { createHash, createHmac } from 'node:crypto';
import { crc32, deflateSync } from 'node:zlib';
import { expect, type Page, type TestInfo } from '@playwright/test';
import { messages } from './helpers';

type Locale = keyof typeof messages;
type Tools = (typeof messages)['en']['tools'];
type Ctx = { page: Page; locale: Locale; info: TestInfo; secret: string };

const ui = <S extends keyof Tools>(locale: Locale, slug: S) => messages[locale].tools[slug].ui as Tools[S]['ui'];
const actions = (locale: Locale) => messages[locale].ui.actions;
const isPhone = (info: TestInfo) => info.project.name === 'mobile-375';
const b64url = (s: string) => Buffer.from(s).toString('base64url');

/** A w×h RGBA gradient PNG, built by hand so the test needs no fixture file. */
function png(w: number, h: number) {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), body.length + 4);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(w, 0);
  header.writeUInt32BE(h, 4);
  header.set([8, 6], 8); // 8-bit RGBA
  const rows = Buffer.alloc((w * 4 + 1) * h); // each row starts with filter byte 0
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) rows.set([x % 256, y % 256, 200, 255], y * (w * 4 + 1) + 1 + x * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}

/**
 * A real JPEG (drawn by the browser) with an EXIF block added: camera make "Kinbench" and GPS 21°1'40.5"N 105°50'3"E.
 * Little-endian TIFF: IFD0 at 8 (Make, GPS pointer), Make text at 38, GPS IFD at 48, latitude at 102, longitude at 126.
 */
async function jpegWithGps(page: Page) {
  const base = Buffer.from(await page.evaluate(async () => {
    const c = new OffscreenCanvas(64, 48);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#7cc8f8';
    ctx.fillRect(0, 0, 64, 48);
    const bytes = new Uint8Array(await (await c.convertToBlob({ type: 'image/jpeg' })).arrayBuffer());
    return btoa(String.fromCharCode(...bytes));
  }), 'base64');
  const t = Buffer.alloc(150);
  t.write('II', 0);
  t.writeUInt16LE(42, 2);
  t.writeUInt32LE(8, 4);
  const entry = (at: number, tag: number, type: number, count: number, value: number | string) => {
    t.writeUInt16LE(tag, at);
    t.writeUInt16LE(type, at + 2);
    t.writeUInt32LE(count, at + 4);
    if (typeof value === 'string') t.write(value, at + 8, 'latin1');
    else t.writeUInt32LE(value, at + 8);
  };
  t.writeUInt16LE(2, 8);
  entry(10, 0x010f, 2, 9, 38); // Make
  entry(22, 0x8825, 4, 1, 48); // GPS IFD pointer
  t.write('Kinbench\0', 38, 'latin1');
  t.writeUInt16LE(4, 48);
  entry(50, 0x0001, 2, 2, 'N\0');
  entry(62, 0x0002, 5, 3, 102);
  entry(74, 0x0003, 2, 2, 'E\0');
  entry(86, 0x0004, 5, 3, 126);
  [[21, 1], [1, 1], [405, 10], [105, 1], [50, 1], [3, 1]].forEach(([n, d], i) => { t.writeUInt32LE(n, 102 + i * 8); t.writeUInt32LE(d, 106 + i * 8); });
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), t]);
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, (payload.length + 2) >> 8, (payload.length + 2) & 255]), payload]);
  return Buffer.concat([base.subarray(0, 2), app1, base.subarray(2)]);
}

/** On phones the options panel is collapsed behind a button. */
export async function openOptions({ page, locale, info }: Ctx) {
  if (isPhone(info)) await page.getByRole('button', { name: actions(locale).options }).click();
}

async function copyAndDownload({ page, locale }: Ctx) {
  await page.getByRole('button', { name: actions(locale).copy, exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: actions(locale).download }).click();
  await download;
}

/** Uses each tool's main features with `secret` as the user's data, asserting the visible result. */
export const toolActions: Record<keyof Tools, (ctx: Ctx) => Promise<void>> = {
  'json-formatter': async (ctx) => {
    const m = ui(ctx.locale, 'json-formatter');
    await ctx.page.getByLabel(m.input, { exact: true }).fill(`{"token":"${ctx.secret}","n":12345678901234567890}`);
    await expect(ctx.page.getByLabel(m.output, { exact: true })).toHaveValue(new RegExp(`${ctx.secret}[\\s\\S]*12345678901234567890`));
    await ctx.page.getByText(m.minify, { exact: true }).click();
    await copyAndDownload(ctx);
  },

  'text-counter': async ({ page, locale, secret }) => {
    const m = ui(locale, 'text-counter');
    await page.getByLabel(m.input, { exact: true }).fill(`${secret}\nXin chào ệ`);
    const stat = (label: string) => page.locator('dl > div').filter({ has: page.getByText(label, { exact: true }) }).locator('dd');
    await expect(stat(m.labels.lines)).toHaveText('2');
    await expect(stat(m.labels.words)).toHaveText(/^\d+$/);
    await expect(stat(m.labels.characters)).toHaveText(String(secret.length + 11));
  },

  base64: async (ctx) => {
    const { page, locale, secret } = ctx;
    const m = ui(locale, 'base64');
    const input = page.getByLabel(m.input, { exact: true });
    const output = page.getByLabel(m.output, { exact: true });
    await input.fill(`${secret} ệ`);
    await expect(output).toHaveValue(Buffer.from(`${secret} ệ`).toString('base64'));
    await copyAndDownload(ctx);
    await page.getByText(m.decode, { exact: true }).click();
    await input.fill(b64url(secret));
    await expect(output).toHaveValue(secret);
    await page.getByText(m.encode, { exact: true }).click();
    await page.locator('input[type=file]').setInputFiles({ name: 'secret.bin', mimeType: 'application/octet-stream', buffer: Buffer.from([0, 255, ...Buffer.from(secret)]) });
    await expect(page.getByText('secret.bin')).toBeVisible();
    await expect(output).toHaveValue(Buffer.from([0, 255, ...Buffer.from(secret)]).toString('base64'));
  },

  'jwt-decoder': async ({ page, locale, secret }) => {
    const m = ui(locale, 'jwt-decoder');
    const body = `${b64url('{"alg":"HS256","typ":"JWT"}')}.${b64url(JSON.stringify({ sub: secret, exp: 4102444800 }))}`;
    const token = `${body}.${createHmac('sha256', 'key-1').update(body).digest('base64url')}`;
    await page.getByLabel(m.token, { exact: true }).fill(token);
    await expect(page.getByText(`"sub": "${secret}"`)).toBeVisible();
    await expect(page.getByText(m.notExpired, { exact: true })).toBeVisible();
    await expect(page.getByText(m.notVerified)).toBeVisible();
    const key = page.getByLabel(m.secretLabel.replace('{alg}', 'HS256'));
    await key.fill('wrong');
    await expect(page.getByText(m.invalidSignature)).toBeVisible();
    await key.fill('key-1');
    await expect(page.getByText(m.verified)).toBeVisible();
  },

  'hash-generator': async ({ page, locale, secret }) => {
    const m = ui(locale, 'hash-generator');
    await page.getByLabel(m.input, { exact: true }).fill('abc');
    await expect(page.getByText('900150983cd24fb0d6963f7d28e17f72')).toBeVisible();
    await page.locator('input[type=file]').setInputFiles({ name: 'secret.txt', mimeType: 'text/plain', buffer: Buffer.from(secret) });
    await expect(page.getByText(createHash('sha256').update(secret).digest('hex'))).toBeVisible();
    await expect(page.getByText(createHash('sha512').update(secret).digest('hex'))).toBeVisible();
  },

  'uuid-generator': async (ctx) => {
    const { page, locale } = ctx;
    const m = ui(locale, 'uuid-generator');
    const output = page.getByLabel(m.output, { exact: true });
    await expect(output).toHaveValue(/^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\n){4}[0-9a-f-]{36}$/);
    await openOptions(ctx);
    await page.getByText('ULID', { exact: true }).click();
    await page.getByLabel(m.count).fill('3');
    await expect(output).toHaveValue(/^([0-9A-HJKMNP-TV-Z]{26}\n){2}[0-9A-HJKMNP-TV-Z]{26}$/);
    const before = await output.inputValue();
    await page.getByRole('button', { name: m.generate }).click();
    await expect(output).not.toHaveValue(before);
    await copyAndDownload(ctx);
  },

  'css-formatter': async (ctx) => {
    const { page, locale, secret } = ctx;
    const m = ui(locale, 'css-formatter');
    const input = page.getByLabel(m.input, { exact: true });
    const output = page.getByLabel(m.output, { exact: true });
    await input.fill(`.${secret}{color:red;margin:0}`);
    await expect(output).toHaveValue(`.${secret} {\n  color: red;\n  margin: 0;\n}\n`, { timeout: 20_000 }); // Prettier loads on first use
    await copyAndDownload(ctx);
    await page.getByRole('button', { name: actions(locale).clear }).click();
    await page.getByRole('button', { name: m.sample }).click();
    await page.getByText(m.compile, { exact: true }).click();
    await expect(output).toHaveValue(/\.card \.title \{\n {2}font-weight: 600;/, { timeout: 20_000 }); // Sass loads on first use
    await page.getByText(m.minify, { exact: true }).click();
    await expect(output).toHaveValue(/^\.card\{border-radius:12px;/);
    await page.getByText(m.compile, { exact: true }).click();
    await input.fill('.a {\n  color: $missing;\n}');
    await expect(page.locator('#css-error')).toContainText('Undefined variable.');
    await expect(page.locator('#css-error')).toContainText(m.errorAt.replace('{line}', '2').replace('{column}', '10'));
  },

  'image-converter': async (ctx) => {
    const { page, locale, secret } = ctx;
    const m = ui(locale, 'image-converter');
    const file = page.locator('input[type=file]');
    const result = (format: string) => page.getByText(`${format} · ${m.dimensions.replace('{width}', '400').replace('{height}', '300')}`);
    await file.setInputFiles({ name: `${secret}.png`, mimeType: 'image/png', buffer: png(400, 300) });
    await expect(result('WEBP')).toBeVisible({ timeout: 15_000 }); // first use starts the encoder worker
    await expect(page.getByRole('img', { name: m.after })).toBeVisible();
    await page.getByLabel(m.compare).fill('20');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: actions(locale).download }).click();
    expect((await download).suggestedFilename()).toBe(`${secret}.webp`);
    await openOptions(ctx);
    await page.getByText('JPEG', { exact: true }).click();
    await expect(result('JPEG')).toBeVisible();
    await page.getByText('AVIF', { exact: true }).click();
    await expect(result('AVIF')).toBeVisible({ timeout: 30_000 }); // loads the wasm encoder once
    await page.getByRole('button', { name: actions(locale).clear }).click();
    await file.setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
    await expect(page.getByText(m.decodeError)).toBeVisible();
  },

  'function-runner': async (ctx) => {
    const { page, locale, secret } = ctx;
    const m = ui(locale, 'function-runner');
    const code = page.getByLabel(m.code, { exact: true });
    const run = page.getByRole('button', { name: m.run });
    const summary = (passed: number) => page.getByText(m.summary.replace('{passed}', String(passed)).replace('{total}', '3'));
    await page.getByRole('button', { name: m.sample }).click();
    await run.click();
    await expect(summary(2)).toBeVisible(); // 0.1 + 0.2 !== 0.3
    await expect(page.getByText('0.30000000000000004')).toBeVisible();
    await expect(page.getByText(m.logs.replace('{count}', '1')).first()).toBeVisible();

    // The worker's own CSP must block the network, even through the prototype (the globals are also deleted).
    await code.fill('async (url) => { try { await WorkerGlobalScope.prototype.fetch.call(self, url); return "sent"; } catch { return "blocked"; } }');
    const targets = [`https://example.com/?d=${secret}`, `/en?d=${secret}`, `data:text/plain,${secret}`];
    for (const [i, url] of targets.entries()) {
      await page.getByLabel(m.params).nth(i).fill(JSON.stringify([url]));
      await page.getByLabel(m.expected).nth(i).fill('"blocked"');
    }
    await run.click();
    await expect(summary(3)).toBeVisible();

    await code.fill('() => { while (true) {} }');
    await openOptions(ctx);
    await page.getByLabel(m.timeout).fill('400');
    await run.click();
    await expect(page.getByText(m.status.timeout, { exact: true })).toHaveCount(3);
  },

  'case-converter': async ({ page, locale, secret }) => {
    const m = ui(locale, 'case-converter');
    await page.getByLabel(m.input, { exact: true }).fill(`${secret} Việt Nam`);
    await expect(page.getByText(`${secret}-viet-nam`, { exact: true })).toBeVisible();
    await expect(page.getByText(`${secret.replaceAll('-', '_').toUpperCase()}_VIET_NAM`, { exact: true })).toBeVisible();
  },

  'url-encoder': async ({ page, locale, secret }) => {
    const m = ui(locale, 'url-encoder');
    const input = page.getByLabel(m.input, { exact: true });
    const output = page.getByLabel(m.output, { exact: true });
    await input.fill(`https://kinbench.dev/search?q=${secret}&tag=vi%E1%BB%87t`);
    await expect(output).toHaveValue(/^https%3A%2F%2Fkinbench\.dev%2Fsearch%3Fq%3D/);
    await expect(page.getByRole('cell', { name: 'việt' })).toBeVisible();
    await page.getByText(m.decode, { exact: true }).click();
    await input.fill('caf%C3%A9%20au%20lait');
    await expect(output).toHaveValue('café au lait');
    await input.fill('%E0%A4%A');
    await expect(page.getByText(m.decodeError)).toBeVisible();
  },

  'html-entities': async (ctx) => {
    const { page, locale, secret } = ctx;
    const m = ui(locale, 'html-entities');
    const input = page.getByLabel(m.input, { exact: true });
    const output = page.getByLabel(m.output, { exact: true });
    await input.fill(`<b>${secret} & ệ</b>`);
    await expect(output).toHaveValue(`&lt;b&gt;${secret} &amp; ệ&lt;/b&gt;`);
    await copyAndDownload(ctx);
    await page.getByText(m.decode, { exact: true }).click();
    await input.fill('&lt;p&gt; &copy; &#7879;');
    await expect(output).toHaveValue('<p> © ệ');
  },

  'number-base': async ({ page, locale }) => {
    const m = ui(locale, 'number-base');
    await page.getByText(m.bases['16'], { exact: true }).click();
    await page.getByLabel(m.number).fill('0xFF');
    await expect(page.getByText('11111111', { exact: true })).toBeVisible();
    await expect(page.getByText('255', { exact: true })).toBeVisible();
    await page.getByLabel(m.number).fill('xyz');
    await expect(page.getByText(m.invalid.replace('{base}', '16'))).toBeVisible();
  },

  'px-rem': async ({ page, locale }) => {
    const m = ui(locale, 'px-rem');
    const px = page.getByLabel(m.px);
    const rem = page.getByLabel(m.rem, { exact: true });
    await px.fill('24');
    await expect(rem).toHaveValue('1.5');
    await page.getByLabel(m.base).fill('10');
    await expect(rem).toHaveValue('2.4');
    await rem.fill('2');
    await expect(px).toHaveValue('20');
  },

  'chmod-calculator': async ({ page, locale }) => {
    const m = ui(locale, 'chmod-calculator');
    const octal = page.getByLabel(m.octal);
    await expect(octal).toHaveValue('755');
    await page.getByLabel(`${m.who.group} — ${m.perm.write}`).check();
    await expect(octal).toHaveValue('775');
    await page.getByLabel(m.symbolic).fill('rw-r--r--');
    await expect(page.getByText('chmod 644 file')).toBeVisible();
    await page.getByLabel(m.specialBits.sticky).check();
    await expect(page.getByText('-rw-r--r-T')).toBeVisible();
  },

  'cidr-calculator': async ({ page, locale }) => {
    const m = ui(locale, 'cidr-calculator');
    const input = page.getByLabel(m.input);
    await input.fill('192.168.1.10/24');
    await expect(page.getByText('192.168.1.0/24', { exact: true })).toBeVisible();
    await expect(page.getByText('254', { exact: true })).toBeVisible();
    await input.fill('2001:db8::/48');
    await expect(page.getByText(m.result.replace('{version}', '6'))).toBeVisible();
    await expect(page.getByText('2001:db8:0:ffff:ffff:ffff:ffff:ffff', { exact: true }).first()).toBeVisible(); // last address = last host in IPv6
    await input.fill('300.1.1.1/8');
    await expect(page.getByText(m.invalid)).toBeVisible();
  },

  'password-generator': async (ctx) => {
    const { page, locale } = ctx;
    const m = ui(locale, 'password-generator');
    const output = page.getByLabel(m.output, { exact: true });
    await expect(output).toHaveValue(/^(.{20}\n){4}.{20}$/);
    for (const s of ['lower', 'upper', 'symbols'] as const) await page.getByLabel(m.sets[s]).uncheck();
    await expect(output).toHaveValue(/^(\d{20}\n){4}\d{20}$/);
    await openOptions(ctx);
    await page.getByRole('spinbutton', { name: m.length }).fill('32');
    await expect(output).toHaveValue(/^(\d{32}\n){4}\d{32}$/);
    const before = await output.inputValue();
    await page.getByRole('button', { name: m.generate }).click();
    await expect(output).not.toHaveValue(before);
    await page.getByLabel(m.sets.digits).uncheck();
    await expect(page.getByText(m.noSets)).toBeVisible();
  },

  'color-converter': async ({ page, locale }) => {
    const m = ui(locale, 'color-converter');
    const color = page.getByRole('textbox', { name: m.color, exact: true });
    await color.fill('rgb(255 0 0)');
    await expect(page.getByText('#ff0000', { exact: true })).toBeVisible();
    await expect(page.getByText('oklch(62.8% 0.2577 29.23)', { exact: true })).toBeVisible();
    await color.fill('rebeccapurple'); // read through the browser's own color parser
    await expect(page.getByText('#663399', { exact: true })).toBeVisible();
    await page.getByRole('textbox', { name: m.foreground, exact: true }).fill('#777');
    await page.getByRole('textbox', { name: m.background, exact: true }).fill('#fff');
    await expect(page.getByText(/^4[.,]48:1$/)).toBeVisible();
    await expect(page.getByText(`${m.levels.aa} · ${m.fail}`, { exact: true })).toBeVisible();
    await expect(page.getByText(`${m.levels.aaLarge} · ${m.pass}`, { exact: true })).toBeVisible();
  },

  'hmac-generator': async ({ page, locale, secret }) => {
    const m = ui(locale, 'hmac-generator');
    await page.getByLabel(m.message, { exact: true }).fill(secret);
    await page.getByLabel(m.key, { exact: true }).fill('Jefe');
    await expect(page.getByText(createHmac('sha256', 'Jefe').update(secret).digest('hex'))).toBeVisible();
    await page.getByText('SHA-512', { exact: true }).click();
    await expect(page.getByText(createHmac('sha512', 'Jefe').update(secret).digest('hex'))).toBeVisible();
    await page.getByText(m.formats.hex, { exact: true }).click();
    await expect(page.getByText(m.invalidKey.hex)).toBeVisible();
  },

  'aes-encryption': async ({ page, locale, secret }) => {
    const m = ui(locale, 'aes-encryption');
    await page.getByLabel(m.plaintext, { exact: true }).fill(`${secret} bí mật`);
    await page.getByLabel(m.password, { exact: true }).fill('correct horse');
    await page.getByRole('button', { name: m.encrypt, exact: true }).click();
    const output = page.getByLabel(m.ciphertext, { exact: true });
    await expect(output).toHaveValue(/^[A-Za-z0-9+/]{40,}={0,2}$/, { timeout: 15_000 });
    const encrypted = await output.inputValue();
    expect(encrypted).not.toContain(secret);
    await page.getByText(m.decrypt, { exact: true }).click();
    await page.getByLabel(m.ciphertext, { exact: true }).fill(encrypted);
    await page.getByLabel(m.password, { exact: true }).fill('correct horse');
    await page.getByRole('button', { name: m.decrypt, exact: true }).click();
    await expect(page.getByLabel(m.plaintext, { exact: true })).toHaveValue(`${secret} bí mật`, { timeout: 15_000 });
    await page.getByLabel(m.password, { exact: true }).fill('wrong');
    await page.getByRole('button', { name: m.decrypt, exact: true }).click();
    await expect(page.getByText(m.decryptFailed)).toBeVisible({ timeout: 15_000 });
  },

  'text-diff': async ({ page, locale, secret }) => {
    const m = ui(locale, 'text-diff');
    await page.getByLabel(m.original, { exact: true }).fill(`same line\n${secret}\nend\n`);
    await page.getByLabel(m.changed, { exact: true }).fill('same line\nchanged\nend\n');
    await expect(page.getByText('+1', { exact: true })).toBeVisible();
    await expect(page.getByText('−1', { exact: true })).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: actions(locale).download }).click();
    expect((await download).suggestedFilename()).toBe('changes.patch');
    await page.getByText(m.words, { exact: true }).click();
    await expect(page.locator('ins', { hasText: 'changed' })).toBeVisible();
    await expect(page.locator('del', { hasText: secret })).toBeVisible();
  },

  'regex-tester': async ({ page, locale, secret }) => {
    const m = ui(locale, 'regex-tester');
    const pattern = page.getByLabel(m.pattern, { exact: true });
    await pattern.fill('(\\w+)@(\\w+)\\.dev');
    await page.getByLabel(m.text, { exact: true }).fill(`mail ${secret}@kinbench.dev and a@b.dev`);
    await expect(page.locator('mark')).toHaveCount(2);
    await page.getByLabel(m.replacement).fill('$2:$1');
    await expect(page.getByText(/kinbench:\d+ and b:a/)).toBeVisible();
    await pattern.fill('(');
    await expect(page.locator('#regex-status')).toContainText(m.invalid.split('{')[0].trim());
    // A catastrophic pattern is stopped in its worker instead of freezing the page.
    await pattern.fill('(a+)+$');
    await page.getByLabel(m.text, { exact: true }).fill(`${'a'.repeat(32)}b`);
    await expect(page.getByText(m.timeout)).toBeVisible({ timeout: 5000 });
  },

  'cron-parser': async ({ page, locale }) => {
    const m = ui(locale, 'cron-parser');
    const input = page.getByLabel(m.expression);
    await expect(page.locator('#cron-description')).not.toBeEmpty();
    await input.fill('@hourly');
    await expect(page.getByRole('listitem').filter({ hasText: /:00/ })).toHaveCount(10);
    await page.getByText('UTC', { exact: true }).click();
    await input.fill('0 0 31 2 *');
    await expect(page.getByText(m.never)).toBeVisible();
    await input.fill('60 * * * *');
    await expect(page.getByText(m.errors.minute)).toBeVisible();
  },

  'curl-converter': async ({ page, locale, secret }) => {
    const m = ui(locale, 'curl-converter');
    await page.getByLabel(m.input, { exact: true }).fill(`curl 'https://api.kinbench.dev/items' -H 'Authorization: Bearer ${secret}' --json '{"a":1}' -s`);
    const output = page.locator('#curl-output');
    await expect(output).toHaveValue(/fetch\("https:\/\/api\.kinbench\.dev\/items", \{\n {2}method: "POST"/);
    await expect(output).toHaveValue(new RegExp(`"Authorization": "Bearer ${secret}"`));
    await page.getByText('axios', { exact: true }).click();
    await expect(output).toHaveValue(/await axios\(\{/);
    await page.getByLabel(m.input, { exact: true }).fill('wget https://x.dev');
    await expect(page.getByText(m.errors.notCurl)).toBeVisible();
  },

  'box-shadow-generator': async ({ page, locale }) => {
    const m = ui(locale, 'box-shadow-generator');
    await expect(page.getByText('box-shadow: 0 8px 24px -4px rgb(11 26 42 / 0.25);')).toBeVisible();
    await page.getByRole('spinbutton', { name: m.blur }).fill('40');
    await expect(page.getByText('box-shadow: 0 8px 40px -4px rgb(11 26 42 / 0.25);')).toBeVisible();
    await page.getByRole('button', { name: m.addLayer }).click();
    await expect(page.getByText(/^box-shadow: 0 8px 40px -4px rgb\(11 26 42 \/ 0\.25\), 0 2px 4px 0 /)).toBeVisible();
    const shadow = await page.locator('div.size-40').evaluate((el) => getComputedStyle(el).boxShadow); // applied through CSSOM
    expect(shadow).toContain('40px');
  },

  'gradient-generator': async ({ page, locale }) => {
    const m = ui(locale, 'gradient-generator');
    await expect(page.getByText('background-image: linear-gradient(135deg, #7cc8f8 0%, #c4b5fd 100%);')).toBeVisible();
    await page.getByText(m.types.radial, { exact: true }).click();
    await expect(page.getByText('background-image: radial-gradient(circle, #7cc8f8 0%, #c4b5fd 100%);')).toBeVisible();
    await page.getByRole('button', { name: m.addStop }).click();
    await expect(page.getByText('background-image: radial-gradient(circle, #7cc8f8 0%, #ffffff 50%, #c4b5fd 100%);')).toBeVisible();
    const bg = await page.getByRole('img', { name: m.preview }).evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(bg).toContain('radial-gradient');
  },

  'cubic-bezier': async ({ page, locale }) => {
    const m = ui(locale, 'cubic-bezier');
    await expect(page.getByText('cubic-bezier(0.25, 0.1, 0.25, 1)', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'easeOutBack' }).click();
    await expect(page.getByText('cubic-bezier(0.34, 1.56, 0.64, 1)', { exact: true })).toBeVisible();
    await page.getByRole('spinbutton', { name: 'x1' }).fill('0.5');
    await expect(page.getByText('cubic-bezier(0.5, 1.56, 0.64, 1)', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: m.play }).click();
  },

  'json-converter': async (ctx) => {
    const { page, locale, secret } = ctx;
    const m = ui(locale, 'json-converter');
    const output = page.locator('#conv-output');
    const to = page.getByRole('radiogroup', { name: m.to });
    await page.locator('#conv-input').fill(`{"name":"${secret}","n":1}`);
    await expect(output).toHaveValue(`name: ${secret}\nn: 1\n`);
    await to.getByText('XML', { exact: true }).click();
    await expect(output).toHaveValue(`<root>\n  <name>${secret}</name>\n  <n>1</n>\n</root>`);
    await to.getByText('CSV', { exact: true }).click();
    await expect(output).toHaveValue(`name,n\n${secret},1`); // a textarea's value normalizes CRLF to LF
    await copyAndDownload(ctx);
    await page.locator('#conv-input').fill('{bad');
    await expect(page.getByText(m.errors.parse.replace('{format}', 'JSON'))).toBeVisible();
  },

  'json-to-types': async ({ page, locale, secret }) => {
    const m = ui(locale, 'json-to-types');
    const output = page.locator('#types-output');
    await page.locator('#types-input').fill(`{"id":1,"items":[{"a":"${secret}"},{"b":2}]}`);
    await expect(output).toHaveValue(/export interface Root \{\n {2}id: number;\n {2}items: Item\[\];\n\}/);
    await expect(output).toHaveValue(/a\?: string;\n {2}b\?: number;/);
    await page.getByText('Zod', { exact: true }).click();
    await expect(output).toHaveValue(/export const RootSchema = z\.object\(\{/);
    await page.locator('#types-input').fill('{"a":');
    await expect(page.getByText(m.invalid)).toBeVisible();
  },

  'sql-formatter': async (ctx) => {
    const { page, locale, secret } = ctx;
    const m = ui(locale, 'sql-formatter');
    const output = page.locator('#sql-output');
    await page.locator('#sql-input').fill(`select id from t where s = '${secret}'`);
    await expect(output).toHaveValue(`SELECT\n  id\nFROM\n  t\nWHERE\n  s = '${secret}'`, { timeout: 10_000 });
    await openOptions(ctx);
    await page.getByText(m.case.lower, { exact: true }).click();
    await expect(output).toHaveValue(/^select\n {2}id\nfrom/);
    await copyAndDownload(ctx);
  },

  'code-formatter': async ({ page, locale, secret }) => {
    const m = ui(locale, 'code-formatter');
    const output = page.locator('#code-output');
    await page.getByText('JavaScript', { exact: true }).click();
    await page.locator('#code-input').fill(`const a={b:"${secret}",c:[1,2]}`);
    await expect(output).toHaveValue(`const a = { b: "${secret}", c: [1, 2] };\n`, { timeout: 20_000 }); // Prettier loads on first use
    await page.getByText('HTML', { exact: true }).click();
    await page.locator('#code-input').fill('<ul><li>a</li><li>b</li></ul>');
    await expect(output).toHaveValue('<ul>\n  <li>a</li>\n  <li>b</li>\n</ul>\n', { timeout: 20_000 });
    await page.getByText('TypeScript', { exact: true }).click();
    await page.locator('#code-input').fill('const = 1');
    await expect(page.getByText(m.syntaxError)).toBeVisible();
  },

  'markdown-preview': async ({ page, locale, secret }) => {
    const m = ui(locale, 'markdown-preview');
    await page.locator('#md-input').fill(`# Notes ${secret}\n\n**bold** <img src="https://example.com/x.png" alt="remote"> <script>window.__pwned = 1</script> [link](https://x.dev)`);
    const preview = page.locator('.markdown');
    await expect(preview.getByRole('heading', { level: 1 })).toHaveText(`Notes ${secret}`);
    await expect(preview.locator('strong')).toHaveText('bold');
    await expect(preview.locator('img')).not.toHaveAttribute('src');
    await expect(preview.locator('img')).toHaveAttribute('alt', new RegExp(m.remoteImage));
    await expect(preview.locator('script')).toHaveCount(0);
    await expect(preview.locator('a')).toHaveAttribute('rel', 'noopener noreferrer');
    expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: actions(locale).download }).click();
    expect((await download).suggestedFilename()).toBe('document.html');
  },

  'svg-optimizer': async (ctx) => {
    const { page, locale } = ctx;
    const m = ui(locale, 'svg-optimizer');
    await page.locator('#svg-input').fill('<?xml version="1.0"?>\n<!-- editor -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><metadata>x</metadata><g><rect width="10" height="10" fill="#FF0000"/></g></svg>');
    await expect(page.locator('#svg-output')).toHaveValue('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path fill="red" d="M0 0h10v10H0z"/></svg>', { timeout: 15_000 });
    await expect(page.getByRole('img', { name: m.after })).toBeVisible();
    await page.locator('input[type=file]').setInputFiles({ name: 'icon.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circle r="5" cx="5" cy="5"/></svg>') });
    await expect(page.locator('#svg-output')).toHaveValue(/<circle/);
    await copyAndDownload(ctx);
  },

  'exif-viewer': async ({ page, locale, secret }) => {
    const m = ui(locale, 'exif-viewer');
    await page.locator('input[type=file]').setInputFiles({ name: `${secret}.jpg`, mimeType: 'image/jpeg', buffer: await jpegWithGps(page) });
    await expect(page.getByText(m.gpsWarning)).toBeVisible();
    await expect(page.getByText('21.02792, 105.83417')).toBeVisible();
    await expect(page.getByRole('definition').filter({ hasText: /^Kinbench$/ })).toBeVisible(); // the Make field
    await page.getByRole('button', { name: m.remove }).click();
    await expect(page.getByText(m.cleaned)).toBeVisible(); // the tool re-reads its output and finds nothing left
    await expect(page.getByText(m.lossless, { exact: false })).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: actions(locale).download }).click();
    expect((await download).suggestedFilename()).toBe(`${secret}-clean.jpg`);
  },

  'image-resize': async ({ page, locale, secret }) => {
    const m = ui(locale, 'image-resize');
    await page.locator('input[type=file]').setInputFiles({ name: `${secret}.png`, mimeType: 'image/png', buffer: png(400, 300) });
    await expect(page.getByText('400×300 → 400×300')).toBeVisible();
    await page.getByText('1:1', { exact: true }).click();
    await expect(page.getByText('400×300 → 300×300')).toBeVisible();
    await page.getByLabel(m.width).fill('150');
    await expect(page.getByText(/400×300 → 150×150 · /)).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: actions(locale).download }).click();
    expect((await download).suggestedFilename()).toBe(`${secret}-150x150.jpg`);
  },

  'favicon-generator': async ({ page, locale }) => {
    const m = ui(locale, 'favicon-generator');
    await page.locator('input[type=file]').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png(256, 256) });
    await expect(page.getByRole('img', { name: 'apple-touch-icon.png' })).toBeVisible();
    await expect(page.getByText('<link rel="manifest" href="/site.webmanifest">')).toBeVisible();
    await page.getByRole('spinbutton', { name: m.padding }).fill('10');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: actions(locale).download }).click();
    const zip = await download;
    expect(zip.suggestedFilename()).toBe('favicons.zip');
    const { readFileSync } = await import('node:fs');
    const bytes = readFileSync((await zip.path())!);
    expect(bytes.subarray(0, 2).toString()).toBe('PK');
    for (const name of ['favicon.ico', 'apple-touch-icon.png', 'site.webmanifest']) expect(bytes.includes(Buffer.from(name))).toBe(true);
  },

  'qr-code': async ({ page, locale, secret }) => {
    const m = ui(locale, 'qr-code');
    const text = `https://kinbench.dev/${secret}?q=việt`;
    await page.locator('#qr-text').fill(text);
    await expect(page.getByRole('img', { name: m.qrAlt.replace('{text}', text.slice(0, 60)) })).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: actions(locale).download }).first().click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('qr-code.png');
    const { readFileSync } = await import('node:fs');
    const qrPng = readFileSync((await file.path())!);
    // Read back the PNG we just made.
    await page.getByText(m.read, { exact: true }).click();
    await page.locator('input[type=file]').setInputFiles({ name: 'qr.png', mimeType: 'image/png', buffer: qrPng });
    await expect(page.locator('#qr-result')).toHaveText(text);
    await page.locator('input[type=file]').setInputFiles({ name: 'blank.png', mimeType: 'image/png', buffer: png(64, 64) });
    await expect(page.getByText(m.notFound)).toBeVisible();
  },

  'pdf-tools': async ({ page, locale, secret }) => {
    const m = ui(locale, 'pdf-tools');
    const { PDFDocument } = await import('pdf-lib');
    const pdf = async (pages: number) => {
      const doc = await PDFDocument.create();
      for (let i = 0; i < pages; i++) doc.addPage([200, 200]);
      return Buffer.from(await doc.save());
    };
    const file = page.locator('input[type=file]');
    await file.setInputFiles([{ name: `${secret}-a.pdf`, mimeType: 'application/pdf', buffer: await pdf(2) }, { name: 'b.pdf', mimeType: 'application/pdf', buffer: await pdf(3) }]);
    await expect(page.getByText(m.pages.replace('{count, plural, one {# page} other {# pages}}', '3 pages').replace('{count}', '3'))).toBeVisible();
    await page.getByRole('button', { name: m.mergeAction }).click();
    const merged = page.waitForEvent('download');
    await page.getByRole('button', { name: actions(locale).download }).click();
    const { readFileSync } = await import('node:fs');
    expect((await PDFDocument.load(readFileSync((await (await merged).path())!))).getPageCount()).toBe(5);

    await page.getByText(m.split, { exact: true }).click();
    await page.locator('input[type=file]').setInputFiles({ name: 'big.pdf', mimeType: 'application/pdf', buffer: await pdf(5) });
    await page.getByLabel(m.ranges.replace('{count}', '5')).fill('1-2, 4');
    await page.getByRole('button', { name: m.splitAction }).click();
    const parts = page.waitForEvent('download');
    await page.getByRole('button', { name: actions(locale).download }).click();
    expect((await parts).suggestedFilename()).toBe('big-split.zip');
    await page.getByLabel(m.ranges.replace('{count}', '5')).fill('7');
    await expect(page.getByText(m.invalidRanges.replace('{count}', '5'))).toBeVisible();
  },

  'video-to-gif': async ({ page, locale, info, secret }) => {
    info.setTimeout(120_000); // compiles the 31 MB ffmpeg core, slow when other tests share the CPU
    const m = ui(locale, 'video-to-gif');
    // A 1-second WebM recorded from a canvas by the browser itself.
    const webm = Buffer.from(await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      [canvas.width, canvas.height] = [64, 48];
      const ctx = canvas.getContext('2d')!;
      const rec = new MediaRecorder(canvas.captureStream(15), { mimeType: 'video/webm' });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      const stopped = new Promise((r) => (rec.onstop = r));
      rec.start();
      for (let i = 0; i < 15; i++) {
        ctx.fillStyle = `hsl(${i * 24} 80% 60%)`;
        ctx.fillRect(0, 0, 64, 48);
        await new Promise((r) => setTimeout(r, 66));
      }
      rec.stop();
      await stopped;
      const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
      let s = '';
      for (const b of bytes) s += String.fromCharCode(b);
      return btoa(s);
    }), 'base64');
    await page.locator('input[type=file]').setInputFiles({ name: `${secret}.webm`, mimeType: 'video/webm', buffer: webm });
    await page.getByRole('button', { name: m.convert }).click();
    await expect(page.getByRole('img', { name: m.result })).toBeVisible({ timeout: 90_000 }); // includes the one-time 31 MB engine download
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: actions(locale).download }).click();
    const gif = await download;
    expect(gif.suggestedFilename()).toBe(`${secret}.gif`);
    const { readFileSync } = await import('node:fs');
    expect(readFileSync((await gif.path())!).subarray(0, 6).toString()).toBe('GIF89a');
  },

  'function-benchmark': async (ctx) => {
    const { page, locale } = ctx;
    const m = ui(locale, 'function-benchmark');
    await page.getByRole('button', { name: m.sample }).click();
    await openOptions(ctx);
    await page.getByLabel(m.budget).fill('200');
    await page.getByRole('button', { name: m.run }).click();
    await expect(page.getByText(/ ops\/s$/)).toHaveCount(3, { timeout: 30_000 });
    await expect(page.getByText(m.fastest, { exact: true })).toHaveCount(1);
    // A function that never returns is stopped, like in the Function Runner.
    await page.getByLabel(m.code.replace('{name}', 'toSorted')).fill('() => { while (true) {} }');
    await page.getByRole('button', { name: m.run }).click();
    await expect(page.getByText(m.timedOut)).toBeVisible({ timeout: 30_000 });
  },

  'unix-timestamp': async ({ page, locale }) => {
    const m = ui(locale, 'unix-timestamp');
    await expect(page.getByText(m.now, { exact: true })).toBeVisible();
    await page.getByLabel(m.timestamp, { exact: true }).fill('1700000000123');
    await expect(page.getByText(m.readAsMilliseconds, { exact: true })).toBeVisible();
    await expect(page.getByText('2023-11-14T22:13:20.123Z')).toBeVisible();
    await page.getByLabel(m.timestamp, { exact: true }).fill('nope');
    await expect(page.getByText(m.invalid, { exact: true })).toBeVisible();
    await page.locator('#ts-local').fill('2024-01-02T03:04:05');
    const expected = await page.evaluate(() => String(new Date('2024-01-02T03:04:05').getTime()));
    await expect(page.getByText(expected, { exact: true })).toBeVisible();
  },
};
