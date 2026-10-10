export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SeatSpot extends Point {
  label: Box | null; // Name and role, set above the seat; null when the floor is too tight for names
}

export interface ChamberLayout {
  width: number;
  height: number;
  center: Point;
  radius: number;
  seatRadius: number;
  labelled: boolean;
  seats: SeatSpot[];
  well: Box; // The dilemma panel at the foot of the hemicycle
}

const PAD = 16;
const MAX_RADIUS = 320;
// The hemicycle runs from seat I at 165° round to the last seat at 15°.
const FIRST_ANGLE = 165;
const LAST_ANGLE = 15;
const EDGE = Math.cos(((180 - FIRST_ANGLE) * Math.PI) / 180); // How far out the end seats reach, as a share of the radius
const CLEARANCE = 4;

// Labels are sized for the longest name ("Entrepreneur", in 19px display type) over the longest role line
// ("VII · CONSIGLIERE"). Text can't be measured in a pure function, so this is an estimate: check it in the preview.
const LABEL = { width: 124, height: 38, gap: 8 };

const FULL = { seatRadius: 33, wellRise: 40, wellWidth: 360, minWellWidth: 260, wellHeight: 110 };
const COMPACT = { seatRadius: 22, wellWidth: 420, wellHeight: 100 };

// Where each seat, its label and the dilemma panel sit, for a council of `count` on a floor `width` pixels wide.
// Names are shown when they fit without colliding; otherwise the floor turns compact (seats only).
export function chamberLayout(count: number, width: number): ChamberLayout {
  const full = labelledLayout(count, width);
  return fits(full) ? full : compactLayout(count, width);
}

function labelledLayout(count: number, width: number): ChamberLayout {
  const { seatRadius } = FULL;
  const radius = Math.min(MAX_RADIUS, (width / 2 - PAD - LABEL.width / 2) / EDGE);
  const center = { x: width / 2, y: PAD + LABEL.height + LABEL.gap + seatRadius + radius };
  const seats = seatPoints(count, center, radius).map(p => ({
    ...p,
    label: {
      x: p.x - LABEL.width / 2,
      y: p.y - seatRadius - LABEL.gap - LABEL.height,
      width: LABEL.width,
      height: LABEL.height,
    },
  }));
  // The panel sits between the two end seats, so it can be no wider than the gap between them.
  const wellWidth = Math.min(FULL.wellWidth, 2 * (radius * EDGE - seatRadius - 2 * CLEARANCE));
  const well = { x: center.x - wellWidth / 2, y: center.y - FULL.wellRise, width: wellWidth, height: FULL.wellHeight };
  return { width, height: well.y + well.height + PAD, center, radius, seatRadius, labelled: true, seats, well };
}

function compactLayout(count: number, width: number): ChamberLayout {
  const { seatRadius } = COMPACT;
  const radius = Math.min(MAX_RADIUS, (width / 2 - PAD - seatRadius) / EDGE);
  const center = { x: width / 2, y: PAD + seatRadius + radius };
  const seats = seatPoints(count, center, radius).map(p => ({ ...p, label: null }));
  // The panel sits below the end seats, across the whole floor.
  const wellWidth = Math.min(COMPACT.wellWidth, width - 2 * PAD);
  const well = { x: center.x - wellWidth / 2, y: center.y + CLEARANCE, width: wellWidth, height: COMPACT.wellHeight };
  return { width, height: well.y + well.height + PAD, center, radius, seatRadius, labelled: false, seats, well };
}

function seatPoints(count: number, center: Point, radius: number): Point[] {
  return Array.from({ length: count }, (_, i) => {
    const degrees = FIRST_ANGLE - ((FIRST_ANGLE - LAST_ANGLE) * i) / (count - 1);
    const angle = (degrees * Math.PI) / 180;
    return { x: center.x + radius * Math.cos(angle), y: center.y - radius * Math.sin(angle) };
  });
}

// True when no label or panel runs off the floor, into another, or into a seat.
function fits(layout: ChamberLayout): boolean {
  const pieces = [...layout.seats.flatMap(s => (s.label ? [s.label] : [])), layout.well];
  if (layout.labelled && layout.well.width < FULL.minWellWidth) return false; // Too narrow to read the dilemma
  if (pieces.some(b => b.x < 0 || b.x + b.width > layout.width)) return false;
  const clash = pieces.some((a, i) =>
    pieces.slice(i + 1).some(b => boxesTouch(grow(a, CLEARANCE), b)) ||
    layout.seats.some(s => boxDistance(a, s) < layout.seatRadius + CLEARANCE)
  );
  return !clash;
}

const grow = (b: Box, by: number): Box => ({ x: b.x - by, y: b.y - by, width: b.width + 2 * by, height: b.height + 2 * by });

const boxesTouch = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

export function boxDistance(box: Box, p: Point): number {
  const nearestX = Math.max(box.x, Math.min(p.x, box.x + box.width));
  const nearestY = Math.max(box.y, Math.min(p.y, box.y + box.height));
  return Math.hypot(p.x - nearestX, p.y - nearestY);
}
