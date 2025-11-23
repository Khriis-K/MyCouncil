import { Counselor, MBTIType, TensionPair } from './types';

export const COUNSELORS: Counselor[] = [
  {
    id: 'strategist',
    name: 'The Strategist',
    role: 'Analytical & Logical',
    icon: 'psychology',
    color: 'blue',
    description: 'Focuses on logic, data, and long-term consequences. Removes emotion to find the optimal path.',
    highlight: 'Questioning long-term career benefits vs risks.'
  },
  {
    id: 'nurturer',
    name: 'The Nurturer',
    role: 'Empathetic & Caring',
    icon: 'volunteer_activism',
    color: 'green',
    description: 'Prioritizes emotional well-being, relationships, and harmony. Ensures decisions align with personal values.',
    highlight: 'Exploring emotional needs and support systems.'
  },
  {
    id: 'skeptic',
    name: 'The Skeptic',
    role: 'Critical & Risk-Averse',
    icon: 'search',
    color: 'yellow',
    description: 'Identifies flaws, risks, and worst-case scenarios. Challenges assumptions to prevent costly mistakes.',
    highlight: 'Highlighting potential loss of support network.'
  },
  {
    id: 'visionary',
    name: 'The Visionary',
    role: 'Future-Oriented',
    icon: 'rocket_launch',
    color: 'purple',
    description: 'Sees possibilities, innovation, and "big picture" potential. Encourages taking leaps of faith for growth.',
    highlight: 'Pushing for growth despite uncertainty.'
  }
];

export const MBTI_TYPES: MBTIType[] = [
  { code: 'INTJ', name: 'Architect', group: 'analyst', color: 'analyst' },
  { code: 'INTP', name: 'Logician', group: 'analyst', color: 'analyst' },
  { code: 'ENTJ', name: 'Commander', group: 'analyst', color: 'analyst' },
  { code: 'ENTP', name: 'Debater', group: 'analyst', color: 'analyst' },
  { code: 'INFJ', name: 'Advocate', group: 'diplomat', color: 'diplomat' },
  { code: 'INFP', name: 'Mediator', group: 'diplomat', color: 'diplomat' },
  { code: 'ENFJ', name: 'Protagonist', group: 'diplomat', color: 'diplomat' },
  { code: 'ENFP', name: 'Campaigner', group: 'diplomat', color: 'diplomat' },
  { code: 'ISTJ', name: 'Logistician', group: 'sentinel', color: 'sentinel' },
  { code: 'ISFJ', name: 'Defender', group: 'sentinel', color: 'sentinel' },
  { code: 'ESTJ', name: 'Executive', group: 'sentinel', color: 'sentinel' },
  { code: 'ESFJ', name: 'Consul', group: 'sentinel', color: 'sentinel' },
  { code: 'ISTP', name: 'Virtuoso', group: 'explorer', color: 'explorer' },
  { code: 'ISFP', name: 'Adventurer', group: 'explorer', color: 'explorer' },
  { code: 'ESTP', name: 'Entrepreneur', group: 'explorer', color: 'explorer' },
  { code: 'ESFP', name: 'Entertainer', group: 'explorer', color: 'explorer' },
];

export const TENSION_PAIRS: TensionPair[] = [
  { counselor1: 'strategist', counselor2: 'skeptic', type: 'conflict' },
  { counselor1: 'visionary', counselor2: 'nurturer', type: 'synthesis' }
];