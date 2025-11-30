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
    // improved lookup: match by role ID OR by stripped title
    const roleData = selectedRoles.find(r => 
      r.role === dynamicCounselor.id || 
      r.title.replace(/^The /, '') === dynamicCounselor.id
    );
    
    const title = roleData?.title || dynamicCounselor.id;
    // Use the role from roleData to look up the icon, falling back to the dynamic ID
    const roleKey = roleData?.role || dynamicCounselor.id;
    
    return {
      id: title.replace(/^The /, ''), // Use stripped title as the primary ID
      name: title, // Keep full name for other potential uses
      role: roleData?.mbtiCode || 'Unknown',
      icon: ROLE_ICONS[roleKey] || 'psychology',
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
