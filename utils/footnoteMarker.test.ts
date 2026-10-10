import { describe, expect, test } from 'vitest';
import type { Root } from 'mdast';
import { appendFootnoteMarker } from './footnoteMarker';

const text = (value: string) => ({ type: 'text' as const, value });
const paragraph = (value: string) => ({ type: 'paragraph' as const, children: [text(value)] });
const item = (...children: any[]) => ({ type: 'listItem' as const, spread: false, children });
const list = (...children: any[]) => ({ type: 'list' as const, ordered: false, spread: false, children });
const root = (...children: any[]): Root => ({ type: 'root', children });
const marker = (label: string) => ({ type: 'emphasis', data: { hName: 'sup' }, children: [text(label)] });

describe('appendFootnoteMarker', () => {
  test('a reply ending in a paragraph gets the marker at the end of it', () => {
    const tree = root(paragraph('first'), paragraph('last'));
    appendFootnoteMarker(tree, '1');
    expect(tree).toEqual(root(paragraph('first'), { type: 'paragraph', children: [text('last'), marker('1')] }));
  });

  test('a reply ending in a list gets the marker at the end of its last item', () => {
    const tree = root(paragraph('intro'), list(item(paragraph('one')), item(paragraph('two'))));
    appendFootnoteMarker(tree, '1,2');
    expect(tree).toEqual(
      root(paragraph('intro'), list(item(paragraph('one')), item({ type: 'paragraph', children: [text('two'), marker('1,2')] }))),
    );
  });

  test('the marker follows the deepest last item of a nested list', () => {
    const tree = root(list(item(paragraph('outer'), list(item(paragraph('inner'))))));
    appendFootnoteMarker(tree, '1');
    expect(tree).toEqual(
      root(list(item(paragraph('outer'), list(item({ type: 'paragraph', children: [text('inner'), marker('1')] }))))),
    );
  });

  test('a reply ending in a code block gets the marker in a paragraph after it', () => {
    const code = { type: 'code' as const, value: 'x = 1' };
    const tree = root(paragraph('see'), code);
    appendFootnoteMarker(tree, '1');
    expect(tree).toEqual(root(paragraph('see'), code, { type: 'paragraph', children: [marker('1')] }));
  });

  test('an empty reply still carries the marker', () => {
    const tree = root();
    appendFootnoteMarker(tree, '1');
    expect(tree).toEqual(root({ type: 'paragraph', children: [marker('1')] }));
  });
});
