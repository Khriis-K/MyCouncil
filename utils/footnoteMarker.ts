import type { Paragraph, Parent, PhrasingContent, Root } from 'mdast';

// Puts a reply's footnote number at the end of its last line of text, as a <sup>. A reply ending in a
// list gets it on the last item rather than on a line of its own below.
export function appendFootnoteMarker(tree: Root, label: string): void {
  const marker = { type: 'emphasis', data: { hName: 'sup' }, children: [{ type: 'text', value: label }] } as PhrasingContent;

  let node: Parent = tree;
  for (;;) {
    const last = node.children.at(-1);
    if (last?.type === 'paragraph' || last?.type === 'heading') {
      last.children.push(marker);
      return;
    }
    if (last?.type === 'list' || last?.type === 'listItem' || last?.type === 'blockquote') {
      node = last;
      continue;
    }
    // Ends in something with no line of text (a code block, a rule) or in nothing at all
    node.children.push({ type: 'paragraph', children: [marker] } as Paragraph);
    return;
  }
}

// The remark plugin form, for react-markdown's remarkPlugins
export const remarkFootnoteMarker = (label: string) => (tree: Root) => appendFootnoteMarker(tree, label);
