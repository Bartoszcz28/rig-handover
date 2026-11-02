// The morning digest: one row per job for one night of runs/<night>.jsonl (plan.md § 1).

export type RunStatus = 'ok' | 'retry' | 'fail';

/** One line of runs/<night>.jsonl, after parsing at the edge. */
export type RunLine = {
  at: string; // ISO 8601 with the log's own offset; never converted to UTC
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

/** One job's night, folded from all its lines. */
export type DigestRow = {
  job: string;
  owner: string | null; // null renders as '—'
  runs: number; // lines for this job
  retries: number; // lines with status 'retry'
  fails: number; // lines with status 'fail'
  lastStatus: RunStatus;
  lastError: string | null; // the most recent `error` seen for this job, null if none
  firstAt: string;
  lastAt: string;
};

/** A parsed night. `rows` sorted by job. */
export type Night = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[];
  badLines: number; // lines that did not parse; counted, never thrown
};

/**
 * Reads runs/<night>.jsonl from `runsDir`.
 * Returns null when the night has no file (routes answer 404).
 * An empty file gives `rows: []` ("nothing ran").
 */
export type ReadNight = (runsDir: string, night: string) => Night | null;
