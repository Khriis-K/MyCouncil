import { MBTIType, ReflectionFocusOption } from './types';

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

export const REFLECTION_FOCUS_OPTIONS: ReflectionFocusOption[] = [
  {
    value: 'Decision-Making',
    label: 'Decision-Making',
    description: 'Emphasizes practical choices, tradeoffs, and actionable outcomes',
  },
  {
    value: 'Emotional Processing',
    label: 'Emotional Processing',
    description: 'Focuses on feelings, values, and internal emotional conflicts',
  },
  {
    value: 'Creative Problem Solving',
    label: 'Creative Problem Solving',
    description: 'Prioritizes novel perspectives, alternatives, and unconventional approaches',
  }
];