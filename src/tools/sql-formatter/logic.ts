export const DIALECTS = ['sql', 'postgresql', 'mysql', 'sqlite', 'tsql', 'bigquery'] as const;
export type Dialect = (typeof DIALECTS)[number];
export type KeywordCase = 'upper' | 'lower' | 'preserve';
export type SqlResult = { ok: true; output: string } | { ok: false; message: string };

/** Formats with the sql-formatter library, loaded on first use. */
export async function formatSql(sql: string, dialect: Dialect, keywordCase: KeywordCase, tabWidth: number): Promise<SqlResult> {
  if (!sql.trim()) return { ok: true, output: '' };
  const { format } = await import('sql-formatter');
  try {
    return { ok: true, output: format(sql, { language: dialect, keywordCase, tabWidth, linesBetweenQueries: 1 }) };
  } catch (e) {
    return { ok: false, message: (e as Error).message.split('\n')[0] };
  }
}
