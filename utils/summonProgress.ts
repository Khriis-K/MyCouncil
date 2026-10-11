// How many seats to show filled while the council is being summoned. The summon is one request with no
// progress of its own, so seats fill against the time estimate, and the last waits for the real answer.
export function seatsFilled(elapsedMs: number, estimateMs: number, count: number): number {
  if (estimateMs <= 0) return 0;
  return Math.min(count - 1, Math.floor((count * elapsedMs) / estimateMs));
}
