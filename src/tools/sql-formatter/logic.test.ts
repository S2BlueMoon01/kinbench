import { describe, expect, it } from 'vitest';
import { formatSql } from './logic';

describe('sql formatter', () => {
  it('formats a query with upper-case keywords', async () => {
    expect(await formatSql('select id, name from users u join teams t on t.id = u.team_id where u.active = true order by name', 'postgresql', 'upper', 2)).toEqual({
      ok: true,
      output: 'SELECT\n  id,\n  name\nFROM\n  users u\n  JOIN teams t ON t.id = u.team_id\nWHERE\n  u.active = TRUE\nORDER BY\n  name',
    });
  });

  it('keeps several statements apart and supports lower case', async () => {
    const r = await formatSql('SELECT 1; SELECT 2;', 'sql', 'lower', 4);
    expect(r).toEqual({ ok: true, output: 'select\n    1;\n\nselect\n    2;' });
  });

  it('returns empty output for empty input', async () => {
    expect(await formatSql('  ', 'mysql', 'upper', 2)).toEqual({ ok: true, output: '' });
  });

  it('reports what it cannot parse', async () => {
    expect(await formatSql("SELECT 'unterminated", 'sql', 'upper', 2)).toMatchObject({ ok: false });
  });
});
