import { Box, ChamberLayout, Point, boxDistance, seatLabels } from './chamberLayout';

export interface TensionArc {
  d: string; // SVG path: a quadratic curve between the two seats
  label: Point; // The middle of the curve, where its short label hangs
  labelBox: Box | null; // Room the label takes, beside the middle of the curve; null when there's no label
}

const LABEL_HEIGHT = 20;
const LABEL_GAP = 3;

const CLEARANCE = 6;
const SAMPLES = 100;
// How far the curve's control point is pulled from the chord toward the floor's centre, tried in turn.
const BENDS = Array.from({ length: 27 }, (_, i) => 0.2 + i * 0.05);

// The arc drawn between seats `from` and `to` when they're in tension. It bows inward, toward the
// space above the dilemma panel, by the least amount that keeps it, and its label if it has one,
// clear of every other seat, name and the panel.
export function tensionArc(layout: ChamberLayout, from: number, to: number, labelWidth = 0): TensionArc {
  const a = layout.seats[from];
  const b = layout.seats[to];
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const anchor = { x: layout.center.x, y: layout.well.y - CLEARANCE };

  let best: { clearance: number; curve: Quad; labelBox: Box | null } | null = null;
  search: for (const bend of BENDS) {
    const curve = curveFor(layout, a, b, mid, anchor, bend);
    const label = pointAt(curve, 0.5);
    // A steep curve runs through a label above or below its middle, so other placements are tried too.
    const boxes = labelWidth > 0 ? PLACEMENTS.map(at => placeLabel(label, labelWidth, at)) : [null];
    for (const labelBox of boxes) {
      const clearance = Math.min(
        clearanceOf(layout, curve, from, to),
        labelBox ? Math.min(boxClearance(layout, labelBox), crossesCurve(curve, labelBox)) : Infinity
      );
      if (!best || clearance > best.clearance) best = { clearance, curve, labelBox };
      if (clearance >= CLEARANCE) break search;
    }
  }

  const { curve, labelBox } = best!;
  const { start, control, end } = curve;
  return {
    d: `M ${round(start.x)} ${round(start.y)} Q ${round(control.x)} ${round(control.y)} ${round(end.x)} ${round(end.y)}`,
    label: pointAt(curve, 0.5),
    labelBox,
  };
}

// Where a label may sit around the middle of its curve: above, below, to either side, or tucked into a corner.
// A sloping curve leaves two opposite corners free, which is where its label usually ends up.
const PLACEMENTS: [number, number][] = [
  [-0.5, -1], [-0.5, 0], [-1, -0.5], [0, -0.5], // above, below, left, right
  [-1, -1], [0, -1], [-1, 0], [0, 0], // above-left, above-right, below-left, below-right
];

// A label box placed at `[dx, dy]` (in label widths and heights from the point), with a small gap from the curve.
function placeLabel(p: Point, width: number, [dx, dy]: [number, number]): Box {
  const nudge = (d: number) => (d === 0 ? LABEL_GAP : d === -1 ? -LABEL_GAP : 0);
  return { x: p.x + dx * width + nudge(dx), y: p.y + dy * LABEL_HEIGHT + nudge(dy), width, height: LABEL_HEIGHT };
}

// Fine (Infinity) when the label stays off its own curve; negative when the curve runs through it.
function crossesCurve(curve: Quad, box: Box): number {
  for (let i = 0; i <= SAMPLES; i++) {
    if (boxDistance(box, pointAt(curve, i / SAMPLES)) === 0) return -1;
  }
  return Infinity;
}

// How far a label stays from every seat, name and the panel (negative when it overlaps one).
function boxClearance(layout: ChamberLayout, box: Box): number {
  const others = [...seatLabels(layout), layout.well];
  const fromSeats = layout.seats.map(s => boxDistance(box, s) - layout.seatRadius);
  const fromBoxes = others.map(o => gapBetween(box, o));
  return Math.min(...fromSeats, ...fromBoxes);
}

// The gap between two boxes, or how deep they overlap as a negative number.
function gapBetween(a: Box, b: Box): number {
  const dx = Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width));
  const dy = Math.max(b.y - (a.y + a.height), a.y - (b.y + b.height));
  return dx > 0 && dy > 0 ? Math.hypot(dx, dy) : Math.max(dx, dy);
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
  const boxes: Box[] = [...seatLabels(layout), layout.well];
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
