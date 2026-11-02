import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import type { DigestRow } from '../src/digest/types.js';

type DigestJson = { night: string; badLines: number; rows: DigestRow[] };

const repoRunsFile = fileURLToPath(new URL('../runs/2026-10-28.jsonl', import.meta.url));

let runsDir = '';

const config = () => ({
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
  runsDir,
});

beforeAll(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  writeFileSync(join(runsDir, '2026-10-28.jsonl'), readFileSync(repoRunsFile, 'utf8'));
  writeFileSync(join(runsDir, '2026-10-30.jsonl'), '');
  writeFileSync(
    join(runsDir, '2026-10-31.jsonl'),
    [
      '{"at":"2026-10-31T01:00:00+01:00","job":"a/x","status":"ok","owner":null}',
      '{"at":"2026-10-31T02:00:00+01:00","job":"a/x","status":"ok","owner":null}',
      'not json',
    ].join('\n') + '\n',
  );
});

afterAll(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

describe('digest page: GET /digest/:night', () => {
  it('renders 200 for a night with a file and lists each job', async () => {
    const res = await createApp(config()).request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    for (const job of ['rig/rotate-logs', 'lane/sync', 'fixtures/refresh', 'notes/backup', 'digest/render']) {
      expect(html).toContain(job);
    }
  });

  it('lists jobs in the same order as the JSON rows', async () => {
    const app = createApp(config());
    const html = await (await app.request('/digest/2026-10-28')).text();
    const body = (await (await app.request('/api/digest/2026-10-28')).json()) as DigestJson;
    const jobs = body.rows.map((row) => row.job);
    const positions = jobs.map((job) => html.indexOf(job));
    expect(positions.every((pos) => pos >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('answers 404 for a night with no file', async () => {
    const res = await createApp(config()).request('/digest/2026-01-01');
    expect(res.status).toBe(404);
  });

  it('renders "nothing ran" for an empty night file', async () => {
    const res = await createApp(config()).request('/digest/2026-10-30');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('nothing ran');
  });

  it('renders a night with a bad line and shows missing owner as —', async () => {
    const res = await createApp(config()).request('/digest/2026-10-31');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('a/x');
    expect(html).toContain('—');
  });
});

describe('digest JSON: GET /api/digest/:night', () => {
  it('answers 200 with the five jobs, sorted by job', async () => {
    const res = await createApp(config()).request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    const body = (await res.json()) as DigestJson;
    expect(body.night).toBe('2026-10-28');
    expect(body.rows).toHaveLength(5);
    const jobs = body.rows.map((row) => row.job);
    expect(jobs).toEqual([...jobs].sort());
  });

  it('answers 404 for a night with no file', async () => {
    const res = await createApp(config()).request('/api/digest/2026-01-01');
    expect(res.status).toBe(404);
  });

  it('answers 200 with no rows for an empty night', async () => {
    const res = await createApp(config()).request('/api/digest/2026-10-30');
    expect(res.status).toBe(200);
    const body = (await res.json()) as DigestJson;
    expect(body.rows).toEqual([]);
  });

  it('counts the bad line, keeps the valid row, and gives owner null', async () => {
    const res = await createApp(config()).request('/api/digest/2026-10-31');
    expect(res.status).toBe(200);
    const body = (await res.json()) as DigestJson;
    expect(body.badLines).toBe(1);
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0]?.job).toBe('a/x');
    expect(body.rows[0]?.owner).toBeNull();
  });
});
