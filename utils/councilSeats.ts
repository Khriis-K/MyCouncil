import { Counselor, CouncilResponse } from '../types';
import { NUMERALS, RollSeat, councilRoll } from './councilRoll';
import { buildCounselorsFromResponse } from './counselorMapper';

export interface CouncilSeat extends RollSeat {
  counselor: Counselor;
  impression: string;
}

// The counselors who answered, seated in the matrix's priority order for this type (seat I first).
// The response can list them in any order, so seats are matched to the roll by name.
export function councilSeats(mbti: string | null, size: number, councilData: CouncilResponse | null): CouncilSeat[] {
  const roll = councilRoll(mbti, size);
  const rank = (name: string) => {
    const i = roll.findIndex(r => r.name === name);
    return i === -1 ? roll.length : i;
  };
  return buildCounselorsFromResponse(mbti, size, councilData)
    .map((counselor, i) => ({ counselor, impression: councilData!.counselors[i].impression }))
    .sort((a, b) => rank(a.counselor.name) - rank(b.counselor.name))
    .map(({ counselor, impression }, i) => {
      const listed = roll.find(r => r.name === counselor.name);
      return {
        numeral: NUMERALS[i],
        name: counselor.name,
        type: listed?.type ?? counselor.role,
        role: listed?.role ?? '',
        counselor,
        impression,
      };
    });
}
