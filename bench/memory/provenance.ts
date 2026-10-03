import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

export function sha256File(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

/** Hash of a config object; build it with a fixed key order so equal configs hash equally. */
export function configHash(config: unknown): string {
  return createHash('sha256').update(JSON.stringify(config)).digest('hex').slice(0, 16);
}

export function gitInfo(): { sha: string; dirty: boolean } {
  const git = (command: string) => execSync(`git ${command}`, { encoding: 'utf8' }).trim();
  return { sha: git('rev-parse HEAD'), dirty: git('status --porcelain') !== '' };
}

export interface TestRun {
  timestamp: string;
  gitSha: string;
  dirty: boolean;
  configHash: string;
}

/**
 * The held-out test-split log: one line per run. It is an honesty mechanism, not security:
 * anyone can delete a line, but the log is committed, so deleting one shows up in the history.
 */
export function readTestRuns(file: string): string[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').split(/\r?\n/).filter(line => line.trim() !== '' && !line.startsWith('#'));
}

export function appendTestRun(file: string, run: TestRun): void {
  appendFileSync(file, `${run.timestamp} ${run.gitSha}${run.dirty ? '+dirty' : ''} ${run.configHash}\n`);
}
