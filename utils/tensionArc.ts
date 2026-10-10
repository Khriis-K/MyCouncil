import { Box, ChamberLayout, Point, boxDistance } from './chamberLayout';

export interface TensionArc {
  d: string; // SVG path: a quadratic curve between the two seats
  label: Point; // The middle of the curve, where its short label hangs
}

const CLEARANCE = 6;
const SAMPLES = 48;
// How far the curve's control point is pulled from the chord toward the floor's centre, tried in turn.
const BENDS = Array.from({ length: 27 }, (_, i) => 0.2 + i * 0.05);

// The arc drawn between seats `from` and `to` when they're in tension. It bows inward, toward the
// space above the dilemma panel, by the least amount that keeps it clear of every other seat, label and the panel.
export function tensionArc(layout: ChamberLayout, from: number, to: number): TensionArc {
  const a = layout.seats[from];
  const b = layout.seats[to];
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const anchor = { x: layout.center.x, y: layout.well.y - CLEARANCE };

  let best = { clearance: -Infinity, curve: curveFor(layout, a, b, mid, anchor, BENDS[0]) };
  for (const bend of BENDS) {
    const curve = curveFor(layout, a, b, mid, anchor, bend);
    const clearance = clearanceOf(layout, curve, from, to);
    if (clearance >= CLEARANCE) {
      best = { clearance, curve };
      break;
    }
    if (clearance > best.clearance) best = { clearance, curve };
  }

  const { start, control, end } = best.curve;
  return {
    d: `M ${round(start.x)} ${round(start.y)} Q ${round(control.x)} ${round(control.y)} ${round(end.x)} ${round(end.y)}`,
    label: pointAt(best.curve, 0.5),
  };
}

interface Quad {
  start: Point;
  control: Point;
  end: Point;
}

function curveFor(layout: ChamberLayout, a: Point, b: Point, mid: Point, anchor: Point, bend: number): Quad {
  const control = { x: mid.x + (anchor.x - mid.x) * bend, y: mid.y + (anchor.y - mid.y) * bend };
  // Start and end on the seat's rim, leaving toward the control point.
  const rim = (seat: Point) => {
    const dx = control.x - seat.x;
    const dy = control.y - seat.y;
    const length = Math.hypot(dx, dy);
    return { x: seat.x + (dx / length) * layout.seatRadius, y: seat.y + (dy / length) * layout.seatRadius };
  };
  return { start: rim(a), control, end: rim(b) };
}

// The closest the curve comes to anything it must avoid (negative when it runs through something).
function clearanceOf(layout: ChamberLayout, curve: Quad, from: number, to: number): number {
  const others = layout.seats.filter((_, i) => i !== from && i !== to);
  const boxes: Box[] = [...layout.seats.flatMap(s => (s.label ? [s.label] : [])), layout.well];
  let closest = Infinity;
  for (let i = 0; i <= SAMPLES; i++) {
    const p = pointAt(curve, i / SAMPLES);
    for (const seat of others) closest = Math.min(closest, Math.hypot(p.x - seat.x, p.y - seat.y) - layout.seatRadius);
    for (const box of boxes) closest = Math.min(closest, boxDistance(box, p));
  }
  return closest;
}

function pointAt({ start, control, end }: Quad, t: number): Point {
  return {
    x: (1 - t) ** 2 * start.x + 2 * (1 - t) * t * control.x + t ** 2 * end.x,
    y: (1 - t) ** 2 * start.y + 2 * (1 - t) * t * control.y + t ** 2 * end.y,
  };
}

const round = (n: number) => Math.round(n * 10) / 10;
