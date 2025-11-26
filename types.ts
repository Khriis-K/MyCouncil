export interface Counselor {
  id: string;
  name: string;
  role: string;
  icon: string;
  color: string; // Tailwind color class prefix (e.g., 'blue', 'green')
  description: string;
  highlight: string; // Short summary for debate mode
}

export interface CounselorRole {
  role: 'mirror' | 'twinflame' | 'playmate' | 'advisor' | 'teammate' | 'consigliere' | 'alterego';
  mbtiCode: string;
  title: string; // e.g., "The Advocate"
  description: string; // Role-specific guidance for AI prompt
  priority: number; // 1-7 for selection order
  color: string; // For UI consistency
}

export interface MBTIType {
  code: string;
  name: string;
  group: 'analyst' | 'diplomat' | 'sentinel' | 'explorer';
  color: string;
}

export type OverlayType = 'NONE' | 'MBTI_SELECTION' | 'MBTI_VALIDATION' | 'COUNSELOR_INSIGHT_BAR' | 'COUNSELOR_PANEL' | 'DEBATE_DIALOGUE' | 'ARGUMENT_MAP' | 'DILEMMA_HISTORY';

export interface TensionPair {
  counselor1: string; // ID
  counselor2: string; // ID
  type: 'conflict' | 'challenge' | 'synthesis';
}

export interface CouncilResponse {
  summary: string;
  context_summary?: string; // AI-generated display label for latest refinement (max 50 chars)
  counselors: {
    id: string; // Dynamic counselor role (mirror, twinflame, playmate, advisor, teammate, consigliere, alterego)
    impression: string; // Brief 1-sentence first impression for the insight bar
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