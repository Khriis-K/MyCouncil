import { describe, expect, test } from 'vitest';
import { chamberLayout } from './chamberLayout';

const SIZES = [3, 4, 5, 6, 7];
const WIDTHS = [320, 360, 430, 600, 768, 820, 1000, 1400];

type Box = { x: number; y: number; width: number; height: number };

const circleBox = (c: { x: number; y: number }, r: number): Box => ({ x: c.x - r, y: c.y - r, width: 2 * r, height: 2 * r });

const boxesTouch = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const boxTouchesCircle = (box: Box, c: { x: number; y: number }, r: number) => {
  const nearestX = Math.max(box.x, Math.min(c.x, box.x + box.width));
  const nearestY = Math.max(box.y, Math.min(c.y, box.y + box.height));
  return Math.hypot(c.x - nearestX, c.y - nearestY) < r;
};

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe('chamberLayout', () => {
  test.each(SIZES)('%i seats sit on one arc, evenly spaced, seat I on the left', count => {
    const layout = chamberLayout(count, 900);
    expect(layout.seats).toHaveLength(count);

    for (const seat of layout.seats) {
      expect(distance(seat, layout.center)).toBeCloseTo(layout.radius, 6);
      expect(seat.y).toBeLessThan(layout.center.y); // on the upper half: a hemicycle, not a ring
    }

    const gaps = layout.seats.slice(1).map((seat, i) => distance(seat, layout.seats[i]));
    for (const gap of gaps) expect(gap).toBeCloseTo(gaps[0], 6);

    expect(layout.seats[0].x).toBeLessThan(layout.seats[count - 1].x);
  });

  // A layout that drops every label would pass the overlap checks trivially, so pin down when labels must show.
  test.each(SIZES)('a desktop floor gives all %i seats a name label', count => {
    const layout = chamberLayout(count, 820);
    expect(layout.labelled).toBe(true);
    for (const seat of layout.seats) expect(seat.label).not.toBeNull();
  });

  test.each(SIZES)('a phone floor of %i seats drops the name labels and keeps seats apart', count => {
    const layout = chamberLayout(count, 360);
    expect(layout.labelled).toBe(false);
    for (const seat of layout.seats) expect(seat.label).toBeNull();
    const gaps = layout.seats.slice(1).map((seat, i) => distance(seat, layout.seats[i]));
    for (const gap of gaps) expect(gap).toBeGreaterThan(2 * layout.seatRadius + 4);
  });

  describe.each(WIDTHS)('at %ipx wide', width => {
    test.each(SIZES)('nothing on a %i-seat floor collides or leaves the floor', count => {
      const layout = chamberLayout(count, width);
      const labels = layout.seats.flatMap(s => (s.label ? [s.label] : []));
      const seatBoxes = layout.seats.map(s => circleBox(s, layout.seatRadius));

      for (const box of [...labels, ...seatBoxes, layout.well]) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        expect(box.y + box.height).toBeLessThanOrEqual(layout.height);
      }

      const pieces = [...labels, layout.well];
      pieces.forEach((a, i) => pieces.slice(i + 1).forEach(b => expect(boxesTouch(a, b)).toBe(false)));
      for (const piece of pieces) {
        for (const seat of layout.seats) expect(boxTouchesCircle(piece, seat, layout.seatRadius)).toBe(false);
      }
    });
  });
});
