// Which counselor's score is marked in a row of the points of contention. A tie marks neither.
export function higherScore(c1Score: number, c2Score: number): 'c1' | 'c2' | null {
  if (c1Score === c2Score) return null;
  return c1Score > c2Score ? 'c1' : 'c2';
}

// The transcript's heading: "The Commander v. the Advocate", or "&" for a pair that synthesises, as in the chamber's list.
export function debateTitle(name1: string, name2: string, type: 'conflict' | 'challenge' | 'synthesis') {
  return {
    first: name1,
    joiner: type === 'synthesis' ? '&' : 'v.',
    second: name2.replace(/^The /, 'the '),
  };
}
