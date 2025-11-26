import { Counselor, CouncilResponse } from '../types';
import { selectCouncilors } from '../data/counselorMatrix';

// Icon mapping for counselor roles
const ROLE_ICONS: Record<string, string> = {
  mirror: 'self_improvement',
  twinflame: 'local_fire_department',
  playmate: 'sports_esports',
  advisor: 'psychology_alt',
  teammate: 'groups',
  consigliere: 'gavel',
  alterego: 'contrast',
};

/**
 * Converts dynamic counselor data from backend into UI-ready Counselor objects
 */
export function buildCounselorsFromResponse(
  mbti: string | null,
  councilSize: number,
  councilData: CouncilResponse | null
): Counselor[] {
  if (!councilData) return [];

  // Get the counselor roles that should be present
  const selectedRoles = selectCouncilors(mbti, councilSize);

  // Build UI counselor objects from the response
  return councilData.counselors.map((dynamicCounselor, index) => {
    const roleData = selectedRoles.find(r => r.role === dynamicCounselor.id);
    
    return {
      id: dynamicCounselor.id,
      name: roleData?.title || dynamicCounselor.id,
      role: roleData?.mbtiCode || 'Unknown',
      icon: ROLE_ICONS[dynamicCounselor.id] || 'psychology',
      color: roleData?.color || 'blue',
      description: roleData?.description || '',
      highlight: dynamicCounselor.assessment.substring(0, 100) + '...',
    };
  });
}

/**
 * Builds tension pairs from the council response
 */
export function buildTensionPairs(councilData: CouncilResponse | null) {
  if (!councilData) return [];

  return councilData.tensions.map(t => ({
    counselor1: t.counselor_ids[0],
    counselor2: t.counselor_ids[1],
    type: t.type as 'conflict' | 'challenge' | 'synthesis',
  }));
}
