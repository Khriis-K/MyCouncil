import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { appendTestRun, configHash, gitInfo, readTestRuns, sha256File } from './provenance';

const tempFile = (name: string) => path.join(mkdtempSync(path.join(tmpdir(), 'prov-')), name);

describe('configHash', () => {
  test('is stable for the same config and changes when it changes', () => {
    expect(configHash({ k: 5, stage1: 'dense' })).toBe(configHash({ k: 5, stage1: 'dense' }));
    expect(configHash({ k: 5, stage1: 'dense' })).not.toBe(configHash({ k: 3, stage1: 'dense' }));
  });
});

describe('sha256File', () => {
  test('hashes the file bytes', () => {
    const file = tempFile('a.txt');
    writeFileSync(file, 'abc');
    expect(sha256File(file)).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('gitInfo', () => {
  test('returns the HEAD SHA and a dirty flag', () => {
    const info = gitInfo();
    expect(info.sha).toMatch(/^[0-9a-f]{40}$/);
    expect(typeof info.dirty).toBe('boolean');
  });
});

describe('test-run log', () => {
  test('a missing log has no runs', () => {
    expect(readTestRuns(tempFile('none.log'))).toEqual([]);
  });

  test('appends one line per run and reads them back, skipping # notes and blank lines', () => {
    const file = tempFile('test-runs.log');
    writeFileSync(file, '# notes about the log\n\n');
    appendTestRun(file, { timestamp: '2026-01-01T00:00:00.000Z', gitSha: 'abc', dirty: false, configHash: 'h1' });
    appendTestRun(file, { timestamp: '2026-01-02T00:00:00.000Z', gitSha: 'def', dirty: true, configHash: 'h2' });
    expect(readFileSync(file, 'utf8')).toBe(
      '# notes about the log\n\n2026-01-01T00:00:00.000Z abc h1\n2026-01-02T00:00:00.000Z def+dirty h2\n',
    );
    expect(readTestRuns(file)).toEqual(['2026-01-01T00:00:00.000Z abc h1', '2026-01-02T00:00:00.000Z def+dirty h2']);
  });
});
