import { MBTI_TYPES } from '../constants';

// A counselor's colour comes from its MBTI temperament, read from the theme tokens.
export function groupColor(mbtiCode: string): string {
  const group = MBTI_TYPES.find(t => t.code === mbtiCode)?.group;
  return group ? `var(--group-${group})` : 'var(--ink2)';
}
