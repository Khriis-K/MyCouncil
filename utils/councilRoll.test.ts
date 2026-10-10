import { describe, expect, test } from 'vitest';
import { councilRoll } from './councilRoll';

describe('councilRoll', () => {
  test('an INTJ council of three seats its top three counselors in priority order', () => {
    expect(councilRoll('INTJ', 3)).toEqual([
      { numeral: 'I', name: 'The Architect', type: 'INTJ', role: 'Mirror' },
      { numeral: 'II', name: 'The Commander', type: 'ENTJ', role: 'Twin flame' },
      { numeral: 'III', name: 'The Logician', type: 'INTP', role: 'Playmate' },
    ]);
  });

  test('a council of seven seats every role, numbered I to VII', () => {
    expect(councilRoll('INTJ', 7)).toEqual([
      { numeral: 'I', name: 'The Architect', type: 'INTJ', role: 'Mirror' },
      { numeral: 'II', name: 'The Commander', type: 'ENTJ', role: 'Twin flame' },
      { numeral: 'III', name: 'The Logician', type: 'INTP', role: 'Playmate' },
      { numeral: 'IV', name: 'The Advocate', type: 'INFJ', role: 'Advisor' },
      { numeral: 'V', name: 'The Logistician', type: 'ISTJ', role: 'Teammate' },
      { numeral: 'VI', name: 'The Campaigner', type: 'ENFP', role: 'Consigliere' },
      { numeral: 'VII', name: 'The Entertainer', type: 'ESFP', role: 'Alter ego' },
    ]);
  });

  test('a balanced council opens with the Seeker, who speaks for all four temperaments', () => {
    expect(councilRoll('BALANCED', 3)).toEqual([
      { numeral: 'I', name: 'The Seeker', type: 'All four temperaments', role: 'Mirror' },
      { numeral: 'II', name: 'The Analyst', type: 'INTJ', role: 'Advisor' },
      { numeral: 'III', name: 'The Diplomat', type: 'ENFJ', role: 'Teammate' },
    ]);
  });

  test('no type chosen reads the same as balanced', () => {
    expect(councilRoll(null, 3)[0].name).toBe('The Seeker');
  });
});
