const MAX_LENGTH = 26;
const CHAR_WIDTH = 6.4; // Widest average glyph of the 16px italic display face, measured in the browser

// Room a label takes on the floor, so its arc can be bent to keep it clear of the seats.
export const arcLabelWidth = (label: string) => Math.ceil(label.length * CHAR_WIDTH) + 4;

// The short italic label hung on a tension arc. The full core issue is shown in the disagreements list.
export function arcLabel(issue: string): string {
  if (issue.length <= MAX_LENGTH) return issue;
  const cut = issue.slice(0, MAX_LENGTH);
  const lastSpace = issue[MAX_LENGTH] === ' ' ? MAX_LENGTH : cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.!?—–-]+$/, '') + '…';
}
