export interface Counselor {
  id: string;
  name: string;
  role: string; // The counselor's MBTI code from the matrix (e.g. 'INTJ'), or 'BALANCED'
  icon: string;
  color: string; // The matrix's colour name; the UI colours counselors by MBTI group instead (utils/groupColor)
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

export type ReflectionFocus = 'Decision-Making' | 'Emotional Processing' | 'Creative Problem Solving';

export interface ReflectionFocusOption {
  value: ReflectionFocus;
  label: string;
  description: string;
}

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
    matrix: {
      criteria: {
        id: string;
        label: string;
        c1_score: number; // 1-10
        c2_score: number; // 1-10
        reasoning: string;
      }[];
    };
    dialogue: {
      speaker: string;
      text: string;
    }[];
  }[];
  memory?: { used: RecalledMemory[]; fallback?: string }; // Set on refinements only
}

export type MemoryChannel = 'refinement' | 'chat' | 'debate';

export interface MemorySource {
  id: string;
  channel: MemoryChannel;
  speaker: 'user' | 'counselor';
  counselorId?: string;
  debatePairId?: string;
  text: string;
  timestamp: number;
}

// A user utterance in a council debate, kept so later chats, refinements and debates can recall it.
export interface DebateInterjection {
  pairId: string; // "<counselor1>-<counselor2>" from the TensionPair
  userText: string;
  precedingCounselorText?: string;
  timestamp: number;
}

export interface RecalledMemory {
  text: string;
  channel: MemoryChannel;
  counselorId?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'counselor';
  text: string;
  timestamp: number;
  recalled?: RecalledMemory[];
}