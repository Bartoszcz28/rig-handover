import { readdirSync } from 'node:fs';
import type { RigConfig } from './config.js';
import { lastBeat, type Beat } from './heartbeat.js';
import { readNight } from './digest/read.js';

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: NightEntry[];
};

export type NightCounts = { ok: number; retry: number; fail: number };
export type NightEntry = { night: string; counts: NightCounts | null };

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

// Per-job lastStatus counts; null (link without counts) when the night can't be read.
export function nightCounts(runsDir: string, night: string): NightCounts | null {
  try {
    const n = readNight(runsDir, night);
    if (!n) return null;
    const counts: NightCounts = { ok: 0, retry: 0, fail: 0 };
    for (const row of n.rows) counts[row.lastStatus]++;
    return counts;
  } catch {
    return null;
  }
}

export function readStatus(config: RigConfig): Status {
  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    nights: nightsOnDisk(config.runsDir).map((night) => ({ night, counts: nightCounts(config.runsDir, night) })),
  };
}
