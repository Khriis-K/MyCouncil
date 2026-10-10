import { RollSeat } from './councilRoll';

// How a counselor is introduced on the slip and in the dossier byline, e.g. "Seat II · ENTJ · Twin flame".
export function seatHeading(seat: Pick<RollSeat, 'numeral' | 'type' | 'role'>): string {
  return [`Seat ${seat.numeral}`, seat.type, seat.role].filter(Boolean).join(' · ');
}
