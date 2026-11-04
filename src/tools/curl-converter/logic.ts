import { bytesToBase64 } from '../base64/logic';

/** Splits a shell command like bash does for quotes: '…', "…" (with \ escapes), $'…' (C escapes) and \ line continuations. */
export function tokenize(cmd: string): string[] | null {
  const tokens: string[] = [];
  let cur = '';
  let started = false;
  const C_ESCAPES: Record<string, string> = { n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"', '0': '\0' };
  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i];
    if (ch === '\\' && cmd[i + 1] === '\n') { i++; continue; }
    if (ch === '\\' && cmd[i + 1] === '\r' && cmd[i + 2] === '\n') { i += 2; continue; }
    if (/\s/.test(ch)) {
      if (started) tokens.push(cur);
      cur = '';
      started = false;
    } else if (ch === "'") {
      const end = cmd.indexOf("'", i + 1);
      if (end < 0) return null;
      cur += cmd.slice(i + 1, end);
      started = true;
      i = end;
    } else if (ch === '$' && cmd[i + 1] === "'") {
      let j = i + 2;
      for (; j < cmd.length && cmd[j] !== "'"; j++) cur += cmd[j] === '\\' ? (C_ESCAPES[cmd[++j]] ?? cmd[j]) : cmd[j];
      if (j >= cmd.length) return null;
      started = true;
      i = j;
    } else if (ch === '"') {
      let j = i + 1;
      for (; j < cmd.length && cmd[j] !== '"'; j++) cur += cmd[j] === '\\' && '"\\$`\n'.includes(cmd[j + 1]) ? cmd[++j] : cmd[j];
      if (j >= cmd.length) return null;
      started = true;
      i = j;
    } else if (ch === '\\') {
      cur += cmd[++i] ?? '';
      started = true;
    } else {
      cur += ch;
      started = true;
    }
  }
  if (started) tokens.push(cur);
  return tokens;
}

export type CurlRequest = {
  url: string;
  method: string;
  headers: [string, string][];
  body: string | null;
  form: [string, string][] | null;
  ignored: string[];
};

const VALUE_FLAGS: Record<string, string> = {
  '-X': 'request', '--request': 'request', '-H': 'header', '--header': 'header',
  '-d': 'data', '--data': 'data', '--data-raw': 'data', '--data-binary': 'data', '--data-ascii': 'data',
  '--data-urlencode': 'urlencode', '--json': 'json', '-F': 'form', '--form': 'form', '-u': 'user', '--user': 'user',
  '-A': 'agent', '--user-agent': 'agent', '-e': 'referer', '--referer': 'referer', '-b': 'cookie', '--cookie': 'cookie',
  '--url': 'url', '-o': 'skip', '--output': 'skip', '-m': 'skip', '--max-time': 'skip', '--connect-timeout': 'skip',
};
const BOOL_FLAGS: Record<string, string> = { '-G': 'get', '--get': 'get', '-I': 'head', '--head': 'head' };
/** Flags with no effect on the request itself (output, TLS, redirects: fetch follows redirects by default). */
const NO_OP = new Set(['-s', '--silent', '-S', '--show-error', '-L', '--location', '-k', '--insecure', '--compressed', '-v', '--verbose', '-i', '--include', '-f', '--fail', '--http1.1', '--http2']);

export type ParseResult = { ok: true; request: CurlRequest } | { ok: false; error: 'quote' | 'notCurl' | 'noUrl' };

export function parseCurl(command: string): ParseResult {
  const tokens = tokenize(command.trim());
  if (!tokens) return { ok: false, error: 'quote' };
  if (tokens[0] !== 'curl') return { ok: false, error: 'notCurl' };
  const req: CurlRequest = { url: '', method: '', headers: [], body: null, form: null, ignored: [] };
  const data: string[] = [];
  let get = false;
  const header = (name: string, value: string) => req.headers.push([name, value]);

  for (let i = 1; i < tokens.length; i++) {
    let flag = tokens[i];
    let value: string | undefined;
    // Short flags: "-XPOST" carries its value, "-sSL" bundles several.
    if (/^-[A-Za-z]/.test(flag) && flag.length > 2) {
      if (VALUE_FLAGS[flag.slice(0, 2)]) [flag, value] = [flag.slice(0, 2), flag.slice(2)];
      else {
        tokens.splice(i + 1, 0, ...[...flag.slice(2)].map((c) => `-${c}`));
        flag = flag.slice(0, 2);
      }
    }
    const kind = VALUE_FLAGS[flag];
    if (kind) {
      value ??= tokens[++i] ?? '';
      if (kind === 'request') req.method = value.toUpperCase();
      else if (kind === 'header') {
        const at = value.indexOf(':');
        if (at > 0) header(value.slice(0, at).trim(), value.slice(at + 1).trim());
      } else if (kind === 'data') data.push(value);
      else if (kind === 'urlencode') {
        const at = value.indexOf('=');
        data.push(at < 0 ? encodeURIComponent(value) : `${value.slice(0, at)}=${encodeURIComponent(value.slice(at + 1))}`);
      } else if (kind === 'json') {
        data.push(value);
        header('Content-Type', 'application/json');
        header('Accept', 'application/json');
      } else if (kind === 'form') {
        const at = value.indexOf('=');
        (req.form ??= []).push(at < 0 ? [value, ''] : [value.slice(0, at), value.slice(at + 1)]);
      } else if (kind === 'user') header('Authorization', `Basic ${bytesToBase64(new TextEncoder().encode(value))}`);
      else if (kind === 'agent') header('User-Agent', value);
      else if (kind === 'referer') header('Referer', value);
      else if (kind === 'cookie') (value.includes('=') ? header('Cookie', value) : req.ignored.push(`${flag} ${value}`));
      else if (kind === 'url') req.url = value;
    } else if (BOOL_FLAGS[flag] === 'get') get = true;
    else if (BOOL_FLAGS[flag] === 'head') req.method = 'HEAD';
    else if (flag.startsWith('-')) {
      if (!NO_OP.has(flag)) req.ignored.push(flag);
    } else if (!req.url) req.url = flag;
  }

  if (!req.url) return { ok: false, error: 'noUrl' };
  if (!/^[a-z][\w+.-]*:\/\//i.test(req.url)) req.url = `http://${req.url}`; // curl's default scheme
  if (data.length) {
    const joined = data.join('&');
    if (get) req.url += (req.url.includes('?') ? '&' : '?') + joined;
    else {
      req.body = joined;
      if (!req.headers.some(([k]) => k.toLowerCase() === 'content-type')) header('Content-Type', 'application/x-www-form-urlencoded');
    }
  }
  req.method ||= req.body !== null || req.form ? 'POST' : 'GET';
  return { ok: true, request: req };
}

const str = (s: string) => JSON.stringify(s);
const indent = (s: string, n: number) => s.replaceAll('\n', `\n${' '.repeat(n)}`);

/** A JSON body is shown as an object literal passed to JSON.stringify, which reads better than an escaped string. */
function bodyExpr(body: string, wrap: boolean) {
  try {
    const pretty = JSON.stringify(JSON.parse(body), null, 2);
    if (pretty.startsWith('{') || pretty.startsWith('[')) return wrap ? `JSON.stringify(${pretty})` : pretty;
  } catch {}
  return str(body);
}

const headerLines = (req: CurlRequest, skipContentType: boolean) =>
  req.headers.filter(([k]) => !(skipContentType && k.toLowerCase() === 'content-type')).map(([k, v]) => `${str(k)}: ${str(v)}`);

function formLines(req: CurlRequest) {
  return req.form!.map(([k, v]) => (v.startsWith('@') ? `form.append(${str(k)}, fileInput.files[0]); // ${v.slice(1)}` : `form.append(${str(k)}, ${str(v)});`));
}

export function toFetch(req: CurlRequest): string {
  const opts: string[] = [];
  if (req.method !== 'GET') opts.push(`method: ${str(req.method)}`);
  // With FormData the browser must set Content-Type itself, including the multipart boundary.
  const headers = headerLines(req, !!req.form);
  if (headers.length) opts.push(`headers: {\n  ${headers.join(',\n  ')}\n}`);
  if (req.form) opts.push('body: form');
  else if (req.body !== null) opts.push(`body: ${bodyExpr(req.body, true)}`);
  const pre = req.form ? `const form = new FormData();\n${formLines(req).join('\n')}\n\n` : '';
  const call = opts.length ? `fetch(${str(req.url)}, {\n  ${indent(opts.join(',\n'), 2)}\n})` : `fetch(${str(req.url)})`;
  return `${pre}const response = await ${call};\nconst data = await response.text();`;
}

export function toAxios(req: CurlRequest): string {
  const opts = [`method: ${str(req.method.toLowerCase())}`, `url: ${str(req.url)}`];
  const headers = headerLines(req, !!req.form);
  if (headers.length) opts.push(`headers: {\n  ${headers.join(',\n  ')}\n}`);
  if (req.form) opts.push('data: form');
  else if (req.body !== null) opts.push(`data: ${bodyExpr(req.body, false)}`);
  const pre = req.form ? `const form = new FormData();\n${formLines(req).join('\n')}\n\n` : '';
  return `${pre}const response = await axios({\n  ${indent(opts.join(',\n'), 2)}\n});\nconst data = response.data;`;
}
