import { CounselorRole, selectCouncilors } from '../data/counselorMatrix';

export interface RollSeat {
  numeral: string;
  name: string;
  type: string;
  role: string;
}

export const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

const ROLE_LABELS: Record<CounselorRole['role'], string> = {
  mirror: 'Mirror',
  twinflame: 'Twin flame',
  playmate: 'Playmate',
  advisor: 'Advisor',
  teammate: 'Teammate',
  consigliere: 'Consigliere',
  alterego: 'Alter ego',
};

// Who will sit: the counselors the matrix picks for this type and size, in seat order.
export function councilRoll(mbti: string | null, size: number): RollSeat[] {
  return selectCouncilors(mbti, size).map((c, i) => ({
    numeral: NUMERALS[i],
    name: c.title,
    type: c.mbtiCode === 'BALANCED' ? 'All four temperaments' : c.mbtiCode,
    role: ROLE_LABELS[c.role],
  }));
}
