import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const css = readFileSync(join(__dirname, 'index.css'), 'utf8');

// Custom properties declared directly inside the first `selector { ... }` block.
const tokensIn = (selector: string): string[] => {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return [];
  const body = css.slice(start, css.indexOf('}', start));
  return [...body.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]).sort();
};

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? sourceFiles(join(dir, entry.name))
    : entry.name.endsWith('.tsx') ? [join(dir, entry.name)]
    : []);

describe('Chamber theme tokens', () => {
  const light = tokensIn(':root');

  test('light defines the Chamber palette', () => {
    expect(light).toEqual(expect.arrayContaining(['--paper', '--paper2', '--ink', '--ink2', '--rule', '--seal', '--brass', '--veil']));
  });

  // A token missing from a dark theme silently shows its light value.
  test.each(['.dark', '.amoled'])('%s overrides every light colour token', selector => {
    const colours = light.filter(t => !t.startsWith('--font-'));
    expect(tokensIn(selector)).toEqual(colours);
  });

  // An undefined var() resolves to nothing, so a missed rename just loses its colour.
  test('every var() a component reads is defined in index.css', () => {
    const defined = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
    const files = [join(__dirname, 'App.tsx'), ...sourceFiles(join(__dirname, 'components'))];
    const undefinedVars = files.flatMap(file =>
      [...readFileSync(file, 'utf8').matchAll(/var\((--[\w-]+)/g)]
        .map(m => m[1])
        .filter(name => !defined.has(name))
        .map(name => `${name} in ${file.slice(__dirname.length + 1)}`));
    expect([...new Set(undefinedVars)]).toEqual([]);
  });
});
