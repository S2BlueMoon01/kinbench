import {
  Clapperboard, FileStack, Film, Gauge,
  Crop, Eraser, QrCode, Stamp,
  AppWindow, ArrowRightLeft, BookOpenText, CodeXml, Database, Shapes, SquareCode,
  Blend, CalendarClock, Diff, Regex, Spline, SquareDashed, SquareTerminal,
  Ampersand, Calculator, CaseSensitive, FileKey, Link, LockKeyhole, Network, Palette, RectangleEllipsis, Ruler, Signature,
  Binary, Braces, Clock, Code2, Dices, FileCode2, Fingerprint, Hash, Image as ImageIcon, ImageDown, KeyRound, LetterText, Paintbrush, Sparkles, SquareFunction, Type, type LucideIcon,
} from 'lucide-react';

// Server-only: imported by server components so icons render to static SVG and ship no client JS.
// Each tool's lazy UI component is in ./components.tsx: a dynamic import reachable from here would be
// bundled into every page, because the layout imports this file.
export const categories = {
  format: FileCode2,
  text: Type,
  image: ImageIcon,
  encode: Binary,
  crypto: Fingerprint,
  generate: Sparkles,
  convert: Clock,
  code: Code2,
  media: Film,
} satisfies Record<string, LucideIcon>;

export type Category = keyof typeof categories;

type ToolDef = {
  slug: string;
  category: Category;
  icon: LucideIcon;
  relatedTools: string[];
  heavyDeps: string[];
};

export const tools = [
  { slug: 'json-formatter', category: 'format', icon: Braces, relatedTools: ['css-formatter', 'jwt-decoder', 'base64'], heavyDeps: [] },
  { slug: 'css-formatter', category: 'format', icon: Paintbrush, relatedTools: ['json-formatter', 'image-converter'], heavyDeps: ['prettier', 'sass'] },
  { slug: 'text-counter', category: 'text', icon: LetterText, relatedTools: ['base64', 'hash-generator'], heavyDeps: [] },
  { slug: 'image-converter', category: 'image', icon: ImageDown, relatedTools: ['base64', 'hash-generator'], heavyDeps: ['@jsquash/avif', '@jsquash/webp'] },
  { slug: 'base64', category: 'encode', icon: Binary, relatedTools: ['jwt-decoder', 'hash-generator'], heavyDeps: [] },
  { slug: 'jwt-decoder', category: 'encode', icon: KeyRound, relatedTools: ['base64', 'unix-timestamp', 'json-formatter'], heavyDeps: [] },
  { slug: 'hash-generator', category: 'crypto', icon: Hash, relatedTools: ['base64', 'uuid-generator'], heavyDeps: [] },
  { slug: 'uuid-generator', category: 'generate', icon: Dices, relatedTools: ['hash-generator', 'unix-timestamp'], heavyDeps: [] },
  { slug: 'function-runner', category: 'code', icon: SquareFunction, relatedTools: ['json-formatter', 'unix-timestamp'], heavyDeps: [] },
  { slug: 'unix-timestamp', category: 'convert', icon: Clock, relatedTools: ['jwt-decoder', 'uuid-generator'], heavyDeps: [] },
  { slug: 'case-converter', category: 'text', icon: CaseSensitive, relatedTools: ['text-counter', 'html-entities'], heavyDeps: [] },
  { slug: 'url-encoder', category: 'encode', icon: Link, relatedTools: ['base64', 'html-entities', 'jwt-decoder'], heavyDeps: [] },
  { slug: 'html-entities', category: 'encode', icon: Ampersand, relatedTools: ['url-encoder', 'base64'], heavyDeps: [] },
  { slug: 'hmac-generator', category: 'crypto', icon: Signature, relatedTools: ['hash-generator', 'jwt-decoder', 'aes-encryption'], heavyDeps: [] },
  { slug: 'aes-encryption', category: 'crypto', icon: LockKeyhole, relatedTools: ['hmac-generator', 'password-generator'], heavyDeps: [] },
  { slug: 'password-generator', category: 'generate', icon: RectangleEllipsis, relatedTools: ['uuid-generator', 'hash-generator'], heavyDeps: [] },
  { slug: 'color-converter', category: 'convert', icon: Palette, relatedTools: ['px-rem', 'css-formatter'], heavyDeps: [] },
  { slug: 'number-base', category: 'convert', icon: Calculator, relatedTools: ['chmod-calculator', 'cidr-calculator'], heavyDeps: [] },
  { slug: 'px-rem', category: 'convert', icon: Ruler, relatedTools: ['color-converter', 'css-formatter'], heavyDeps: [] },
  { slug: 'chmod-calculator', category: 'convert', icon: FileKey, relatedTools: ['number-base', 'cidr-calculator'], heavyDeps: [] },
  { slug: 'cidr-calculator', category: 'convert', icon: Network, relatedTools: ['number-base', 'chmod-calculator'], heavyDeps: [] },
  { slug: 'text-diff', category: 'text', icon: Diff, relatedTools: ['case-converter', 'text-counter'], heavyDeps: [] },
  { slug: 'regex-tester', category: 'code', icon: Regex, relatedTools: ['text-diff', 'function-runner'], heavyDeps: [] },
  { slug: 'curl-converter', category: 'code', icon: SquareTerminal, relatedTools: ['json-formatter', 'url-encoder'], heavyDeps: [] },
  { slug: 'cron-parser', category: 'convert', icon: CalendarClock, relatedTools: ['unix-timestamp', 'regex-tester'], heavyDeps: [] },
  { slug: 'box-shadow-generator', category: 'generate', icon: SquareDashed, relatedTools: ['gradient-generator', 'cubic-bezier'], heavyDeps: [] },
  { slug: 'gradient-generator', category: 'generate', icon: Blend, relatedTools: ['box-shadow-generator', 'color-converter'], heavyDeps: [] },
  { slug: 'cubic-bezier', category: 'generate', icon: Spline, relatedTools: ['box-shadow-generator', 'gradient-generator'], heavyDeps: [] },
  { slug: 'json-converter', category: 'convert', icon: ArrowRightLeft, relatedTools: ['json-formatter', 'json-to-types'], heavyDeps: ['yaml', 'fast-xml-parser', 'papaparse', 'smol-toml'] },
  { slug: 'json-to-types', category: 'code', icon: SquareCode, relatedTools: ['json-formatter', 'json-converter'], heavyDeps: [] },
  { slug: 'sql-formatter', category: 'format', icon: Database, relatedTools: ['code-formatter', 'json-formatter'], heavyDeps: ['sql-formatter'] },
  { slug: 'code-formatter', category: 'format', icon: CodeXml, relatedTools: ['css-formatter', 'html-entities'], heavyDeps: ['prettier'] },
  { slug: 'markdown-preview', category: 'text', icon: BookOpenText, relatedTools: ['html-entities', 'text-diff'], heavyDeps: [] },
  { slug: 'svg-optimizer', category: 'image', icon: Shapes, relatedTools: ['image-converter', 'base64'], heavyDeps: ['svgo'] },
  { slug: 'exif-viewer', category: 'image', icon: Eraser, relatedTools: ['image-resize', 'image-converter'], heavyDeps: ['exifr'] },
  { slug: 'image-resize', category: 'image', icon: Crop, relatedTools: ['image-converter', 'favicon-generator'], heavyDeps: [] },
  { slug: 'favicon-generator', category: 'image', icon: Stamp, relatedTools: ['image-resize', 'svg-optimizer'], heavyDeps: ['fflate'] },
  { slug: 'qr-code', category: 'generate', icon: QrCode, relatedTools: ['url-encoder', 'password-generator'], heavyDeps: ['jsqr'] },
  { slug: 'pdf-tools', category: 'media', icon: FileStack, relatedTools: ['image-resize', 'video-to-gif'], heavyDeps: ['pdf-lib'] },
  { slug: 'video-to-gif', category: 'media', icon: Clapperboard, relatedTools: ['image-converter', 'image-resize'], heavyDeps: ['@ffmpeg/core'] },
  { slug: 'function-benchmark', category: 'code', icon: Gauge, relatedTools: ['function-runner', 'regex-tester'], heavyDeps: [] },
  { slug: 'html-preview', category: 'code', icon: AppWindow, relatedTools: ['markdown-preview', 'code-formatter', 'html-entities'], heavyDeps: [] },
] as const satisfies readonly ToolDef[];

export type Tool = (typeof tools)[number];
export type Slug = Tool['slug'];

export const getTool = (slug: string) => tools.find((t) => t.slug === slug);
export const toolsIn = (category: Category) => tools.filter((t) => t.category === category);
export const usedCategories = (Object.keys(categories) as Category[]).filter((c) => toolsIn(c).length > 0);
