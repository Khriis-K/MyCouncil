import { describe, expect, test } from 'vitest';
import { councilSeats } from './councilSeats';
import { CouncilResponse } from '../types';

const counselor = (id: string, impression: string): CouncilResponse['counselors'][number] => ({
  id,
  impression,
  assessment: 'An assessment.',
  action_plan: [],
  reflection_q: 'A question?',
});

const response = (...counselors: CouncilResponse['counselors']): CouncilResponse => ({
  summary: 'A summary.',
  counselors,
  tensions: [],
});

describe('councilSeats', () => {
  test('seats counselors in priority order for the type, whatever order the response lists them', () => {
    const seats = councilSeats(
      'INTJ',
      3,
      response(counselor('playmate', 'Play with it.'), counselor('mirror', 'Look closer.'), counselor('twinflame', 'Decide now.'))
    );
    expect(seats.map(s => ({ numeral: s.numeral, name: s.name, type: s.type, role: s.role, impression: s.impression }))).toEqual([
      { numeral: 'I', name: 'The Architect', type: 'INTJ', role: 'Mirror', impression: 'Look closer.' },
      { numeral: 'II', name: 'The Commander', type: 'ENTJ', role: 'Twin flame', impression: 'Decide now.' },
      { numeral: 'III', name: 'The Logician', type: 'INTP', role: 'Playmate', impression: 'Play with it.' },
    ]);
    expect(seats[1].counselor.id).toBe('Commander');
  });

  test('a counselor the matrix did not pick still takes a seat, after the others', () => {
    const seats = councilSeats('INTJ', 3, response(counselor('stranger', 'Who, me?'), counselor('mirror', 'Look closer.')));
    expect(seats.map(s => [s.numeral, s.name])).toEqual([
      ['I', 'The Architect'],
      ['II', 'stranger'],
    ]);
  });

  test('no council yet means no seats', () => {
    expect(councilSeats('INTJ', 3, null)).toEqual([]);
  });
});
