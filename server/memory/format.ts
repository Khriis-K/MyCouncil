import type { MemoryUnit } from './types';

const HEADER =
  "THINGS THE USER SHARED EARLIER IN THIS SESSION (may or may not be relevant; use one only if it genuinely helps, and don't list them back):";

function label(unit: MemoryUnit, counselorNameById: Record<string, string>): string {
  if (unit.channel === 'chat') {
    const name = (unit.counselorId && counselorNameById[unit.counselorId]) || unit.counselorId;
    return `told the ${name} in a 1-on-1 chat`;
  }
  if (unit.channel === 'debate') return 'said during a counselor debate';
  return 'added as context to their dilemma';
}

export function formatMemoriesForPrompt(units: MemoryUnit[], counselorNameById: Record<string, string>): string {
  if (units.length === 0) return '';
  const lines = units.map(u => `- [${label(u, counselorNameById)}] "${u.text}"`);
  return [HEADER, ...lines].join('\n');
}
