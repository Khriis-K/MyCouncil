import { describe, expect, test } from 'vitest';
import { chamberLayout } from './chamberLayout';
import { tensionArc } from './tensionArc';

type Point = { x: number; y: number };
type Box = { x: number; y: number; width: number; height: number };

// Read the curve back out of the SVG path, so the tests check what actually gets drawn.
const parseQuad = (d: string) => {
  const n = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
  expect(d.trim().startsWith('M')).toBe(true);
  expect(d).toContain('Q');
  expect(n).toHaveLength(6);
  return { start: { x: n[0], y: n[1] }, control: { x: n[2], y: n[3] }, end: { x: n[4], y: n[5] } };
};

const at = (q: ReturnType<typeof parseQuad>, t: number): Point => ({
  x: (1 - t) ** 2 * q.start.x + 2 * (1 - t) * t * q.control.x + t ** 2 * q.end.x,
  y: (1 - t) ** 2 * q.start.y + 2 * (1 - t) * t * q.control.y + t ** 2 * q.end.y,
});

const samples = (q: ReturnType<typeof parseQuad>) => Array.from({ length: 101 }, (_, i) => at(q, i / 100));

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

const boxDistance = (box: Box, p: Point) =>
  Math.hypot(
    p.x - Math.max(box.x, Math.min(p.x, box.x + box.width)),
    p.y - Math.max(box.y, Math.min(p.y, box.y + box.height))
  );

const boxesTouch = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const pairs = (count: number) =>
  Array.from({ length: count }, (_, i) => Array.from({ length: count - i - 1 }, (_, k) => [i, i + k + 1])).flat();

describe('tensionArc', () => {
  test('runs from the edge of the first seat to the edge of the second', () => {
    const layout = chamberLayout(5, 820);
    const q = parseQuad(tensionArc(layout, 1, 3).d);
    expect(distance(q.start, layout.seats[1])).toBeCloseTo(layout.seatRadius, 1);
    expect(distance(q.end, layout.seats[3])).toBeCloseTo(layout.seatRadius, 1);
  });

  test('the label anchor sits on the curve', () => {
    const layout = chamberLayout(7, 820);
    const arc = tensionArc(layout, 0, 6);
    const nearest = Math.min(...samples(parseQuad(arc.d)).map(p => distance(p, arc.label)));
    expect(nearest).toBeLessThan(1);
  });

  describe.each([740, 820, 1000])('with a label on a %ipx floor', width => {
    test.each([3, 4, 5, 6, 7])('every label in a council of %i sits beside its curve, clear of it, the seats, names and the panel', count => {
      const layout = chamberLayout(count, width);
      expect(layout.labelled).toBe(true);
      for (const [from, to] of pairs(count)) {
        const arc = tensionArc(layout, from, to, 170);
        const box = arc.labelBox!;
        expect(box.width).toBe(170);
        // Set beside the middle of its curve, never adrift from it, and never across it
        expect(boxDistance(box, arc.label)).toBeGreaterThan(0);
        expect(boxDistance(box, arc.label)).toBeLessThan(12);
        for (const p of samples(parseQuad(arc.d))) expect(boxDistance(box, p)).toBeGreaterThan(0);
        for (const seat of layout.seats) {
          expect(boxDistance(box, seat)).toBeGreaterThan(layout.seatRadius);
          expect(boxesTouch(box, seat.label!)).toBe(false);
        }
        expect(boxesTouch(box, layout.well)).toBe(false);
      }
    });
  });

  test('an arc with no label has no label box', () => {
    expect(tensionArc(chamberLayout(5, 820), 0, 4).labelBox).toBeNull();
  });

  describe.each([820, 1000, 600, 360])('on a %ipx floor', width => {
    test.each([3, 4, 5, 6, 7])('every pair in a council of %i keeps clear of other seats, every label and the panel', count => {
      const layout = chamberLayout(count, width);
      for (const [from, to] of pairs(count)) {
        const curve = samples(parseQuad(tensionArc(layout, from, to).d));
        layout.seats.forEach((seat, i) => {
          if (i === from || i === to) return;
          for (const p of curve) expect(distance(p, seat)).toBeGreaterThan(layout.seatRadius);
        });
        for (const label of layout.seats.flatMap(s => (s.label ? [s.label] : []))) {
          for (const p of curve) expect(boxDistance(label, p)).toBeGreaterThan(0);
        }
        for (const p of curve) expect(boxDistance(layout.well, p)).toBeGreaterThan(0);
      }
    });
  });
});
