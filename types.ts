export interface Counselor {
  id: string;
  name: string;
  role: string;
  icon: string;
  color: string; // Tailwind color class prefix (e.g., 'blue', 'green')
  description: string;
  highlight: string; // Short summary for debate mode
}

export interface MBTIType {
  code: string;
  name: string;
  group: 'analyst' | 'diplomat' | 'sentinel' | 'explorer';
  color: string;
}

export type OverlayType = 'NONE' | 'MBTI_SELECTION' | 'MBTI_VALIDATION' | 'COUNSELOR_CARD' | 'DEBATE_DIALOGUE' | 'ARGUMENT_MAP';

export interface TensionPair {
  counselor1: string; // ID
  counselor2: string; // ID
  type: 'conflict' | 'challenge' | 'synthesis';
}

export interface CouncilResponse {
  summary: string;
  counselors: {
    id: "strategist" | "nurturer" | "skeptic" | "visionary";
    assessment: string;
    action_plan: string[];
    reflection_q: string;
  }[];
  tensions: {
    pair_id: string;
    counselor_ids: [string, string];
    type: "conflict" | "synthesis";
    core_issue: string;
    dialogue: {
      speaker: string;
      text: string;
    }[];
  }[];
}