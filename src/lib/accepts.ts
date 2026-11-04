/** Whether a file matches an <input accept> list such as "image/*", ".svg,image/svg+xml" or "application/pdf,.pdf". */
export function accepts(file: { name: string; type: string }, accept?: string): boolean {
  if (!accept) return true;
  return accept.split(',').map((a) => a.trim().toLowerCase()).some((a) =>
    a.startsWith('.') ? file.name.toLowerCase().endsWith(a) : a.endsWith('/*') ? file.type.startsWith(a.slice(0, -1)) : file.type === a,
  );
}
