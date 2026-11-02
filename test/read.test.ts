import { describe, expect, it } from 'vitest';
import { foldNight, readNight } from '../src/digest/read.js';

describe('readNight', () => {
  it('reads 2026-10-28: 5 jobs, 1 bad line, sorted by job', () => {
    const n = readNight('runs', '2026-10-28');
    expect(n).not.toBeNull();
    expect(n!.badLines).toBe(1);
    expect(n!.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('folds runs, retries, last status, last error and times', () => {
    const rows = readNight('runs', '2026-10-28')!.rows;
    const by = (j: string) => rows.find((r) => r.job === j)!;
    expect(by('fixtures/refresh')).toMatchObject({
      runs: 4, retries: 3, lastStatus: 'ok', lastError: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00', lastAt: '2026-10-29T01:37:00+01:00',
    });
    expect(by('notes/backup')).toMatchObject({ runs: 1, lastStatus: 'fail', lastError: 'quota exceeded' });
    expect(by('lane/sync')).toMatchObject({ runs: 8, retries: 1, owner: 'rook' });
    expect(by('digest/render').owner).toBeNull();
  });

  it('returns null for a night with no file or a bad name', () => {
    expect(readNight('runs', '2026-01-01')).toBeNull();
    expect(readNight('runs', '../etc')).toBeNull();
  });

  it('an empty night has no rows', () => {
    expect(foldNight('2026-10-30', '')).toEqual({ night: '2026-10-30', rows: [], badLines: 0 });
  });

  it('counts unparseable and malformed lines, never throws', () => {
    const n = foldNight('x', '{"job":"a"}\nnot json\n[]\n{"at":"t","job":"a","status":"weird","owner":null}\n');
    expect(n.badLines).toBe(4);
    expect(n.rows).toEqual([]);
  });
});
