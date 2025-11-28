export interface CounselorRole {
  role: 'mirror' | 'twinflame' | 'playmate' | 'advisor' | 'teammate' | 'consigliere' | 'alterego';
  mbtiCode: string;
  title: string; // e.g., "The Advocate"
  description: string; // Role-specific guidance for AI prompt
  priority: number; // 1-7 for selection order
  color: string; // For UI consistency
}

export const COUNSELOR_MATRIX: Record<string, CounselorRole[]> = {
  INTJ: [
    { role: 'mirror', mbtiCode: 'INTJ', title: 'The Architect', description: 'Mirrors your strategic, big-picture thinking and helps you factor emotional realities into your long-term plans', priority: 1, color: 'blue' },
    { role: 'twinflame', mbtiCode: 'ENTJ', title: 'The Commander', description: 'Shares your vision and logical approach, adding bold, outward-facing energy to help you execute', priority: 2, color: 'purple' },
    { role: 'playmate', mbtiCode: 'INTP', title: 'The Logician', description: 'Explores ideas with pure analytical curiosity, helping you question assumptions before locking in a plan', priority: 3, color: 'blue' },
    { role: 'advisor', mbtiCode: 'INFJ', title: 'The Advocate', description: 'Shares your ability to see patterns and future implications, using empathy to ensure your strategy connects with people', priority: 4, color: 'green' },
    { role: 'teammate', mbtiCode: 'ISTJ', title: 'The Logistician', description: 'Values efficiency like you do, providing the proven methods and practical steps needed to ground your vision', priority: 5, color: 'yellow' },
    { role: 'consigliere', mbtiCode: 'ENFP', title: 'The Campaigner', description: 'Expands your strategic view by exploring creative possibilities and asking what truly resonates with you personally', priority: 6, color: 'purple' },
    { role: 'alterego', mbtiCode: 'ESFP', title: 'The Entertainer', description: 'Your shadow: reminds you to value spontaneous, present-moment experiences as much as long-term strategy', priority: 7, color: 'yellow' }
  ],
  INTP: [
    { role: 'mirror', mbtiCode: 'INTP', title: 'The Logician', description: 'Mirrors your analytical mind and helps you turn endless analysis into actionable decisions', priority: 1, color: 'blue' },
    { role: 'twinflame', mbtiCode: 'ENTP', title: 'The Debater', description: 'Shares your love of ideas, adding bold energy to help you test your theories in the real world', priority: 2, color: 'purple' },
    { role: 'playmate', mbtiCode: 'INTJ', title: 'The Architect', description: 'Analyzes with you, offering a systems-building perspective to help structure your open-ended thoughts', priority: 3, color: 'blue' },
    { role: 'advisor', mbtiCode: 'ISTP', title: 'The Virtuoso', description: 'Shares your logical approach, grounding it in hands-on problem-solving and immediate application', priority: 4, color: 'yellow' },
    { role: 'teammate', mbtiCode: 'INFP', title: 'The Mediator', description: 'Explores possibilities like you do, using personal values to give your logic a human compass', priority: 5, color: 'green' },
    { role: 'consigliere', mbtiCode: 'ENFJ', title: 'The Protagonist', description: 'Challenges your detachment by highlighting how your decisions impact the people around you', priority: 6, color: 'green' },
    { role: 'alterego', mbtiCode: 'ESFJ', title: 'The Consul', description: 'Your shadow: reminds you of the value of social harmony and established norms in navigating the world', priority: 7, color: 'yellow' }
  ],
  ENTJ: [
    { role: 'mirror', mbtiCode: 'ENTJ', title: 'The Commander', description: 'Mirrors your decisive leadership and helps you see how emotional intelligence strengthens your strategy', priority: 1, color: 'purple' },
    { role: 'twinflame', mbtiCode: 'INTJ', title: 'The Architect', description: 'Shares your strategic thinking, offering quiet, internal depth to balance your bold action', priority: 2, color: 'blue' },
    { role: 'playmate', mbtiCode: 'ENTP', title: 'The Debater', description: 'Explores possibilities with you, encouraging intellectual flexibility to refine your decisive plans', priority: 3, color: 'purple' },
    { role: 'advisor', mbtiCode: 'ESTJ', title: 'The Executive', description: 'Shares your results-driven approach, grounding your vision in proven systems and reliability', priority: 4, color: 'yellow' },
    { role: 'teammate', mbtiCode: 'ENFJ', title: 'The Protagonist', description: 'Sees the big picture like you, leading through empathy and connection to build stronger teams', priority: 5, color: 'green' },
    { role: 'consigliere', mbtiCode: 'INFP', title: 'The Mediator', description: 'Challenges your control by asking if your efficiency aligns with what truly matters to the human spirit', priority: 6, color: 'green' },
    { role: 'alterego', mbtiCode: 'ISFP', title: 'The Adventurer', description: 'Your shadow: reminds you that authentic personal experience and harmony are as valuable as strategic control', priority: 7, color: 'yellow' }
  ],
  ENTP: [
    { role: 'mirror', mbtiCode: 'ENTP', title: 'The Debater', description: 'Mirrors your innovative thinking and helps you channel your many ideas into finished realities', priority: 1, color: 'purple' },
    { role: 'twinflame', mbtiCode: 'INTP', title: 'The Logician', description: 'Shares your love of concepts, bringing quiet analytical depth to ground your brainstorming', priority: 2, color: 'blue' },
    { role: 'playmate', mbtiCode: 'ENFP', title: 'The Campaigner', description: 'Explores possibilities like you do, using personal values to help you choose which ideas are worth pursuing', priority: 3, color: 'purple' },
    { role: 'advisor', mbtiCode: 'ESTP', title: 'The Entrepreneur', description: 'Values problem-solving like you, focusing on immediate, practical action to test your theories', priority: 4, color: 'yellow' },
    { role: 'teammate', mbtiCode: 'ENTJ', title: 'The Commander', description: 'Thinks strategically like you, channeling your creative energy into decisive execution', priority: 5, color: 'purple' },
    { role: 'consigliere', mbtiCode: 'INFJ', title: 'The Advocate', description: 'Challenges your scattered focus by asking which innovation serves a deeper, long-term purpose', priority: 6, color: 'green' },
    { role: 'alterego', mbtiCode: 'ISFJ', title: 'The Defender', description: 'Your shadow: reminds you of the comfort and stability found in tradition and routine', priority: 7, color: 'yellow' }
  ],
  INFJ: [
    { role: 'mirror', mbtiCode: 'INFJ', title: 'The Advocate', description: 'Mirrors your deep insight and care, helping you accept that "good enough" is often better than perfect', priority: 1, color: 'green' },
    { role: 'twinflame', mbtiCode: 'ENFJ', title: 'The Protagonist', description: 'Shares your vision for people, bringing energetic outward focus to help you manifest your ideals', priority: 2, color: 'green' },
    { role: 'playmate', mbtiCode: 'INFP', title: 'The Mediator', description: 'Values authenticity like you, encouraging you to honor your own feelings as much as you honor others\'', priority: 3, color: 'green' },
    { role: 'advisor', mbtiCode: 'INTJ', title: 'The Architect', description: 'Sees patterns like you do, using logical systems to build a structure for your compassionate vision', priority: 4, color: 'blue' },
    { role: 'teammate', mbtiCode: 'ISFJ', title: 'The Defender', description: 'Cares about supporting others like you, offering practical, proven ways to help in the here and now', priority: 5, color: 'yellow' },
    { role: 'consigliere', mbtiCode: 'ENTP', title: 'The Debater', description: 'Challenges your certainty by exploring alternative possibilities and questioning emotional assumptions', priority: 6, color: 'purple' },
    { role: 'alterego', mbtiCode: 'ESTP', title: 'The Entrepreneur', description: 'Your shadow: reminds you of the joy of spontaneous action and concrete results in the physical world', priority: 7, color: 'yellow' }
  ],
  INFP: [
    { role: 'mirror', mbtiCode: 'INFP', title: 'The Mediator', description: 'Mirrors your commitment to authenticity, helping you bridge the gap between your ideals and practical reality', priority: 1, color: 'green' },
    { role: 'twinflame', mbtiCode: 'ENFP', title: 'The Campaigner', description: 'Shares your creative spirit, bringing energetic external expression to help you share your inner world', priority: 2, color: 'purple' },
    { role: 'playmate', mbtiCode: 'INTP', title: 'The Logician', description: 'Explores possibilities like you do, using logic to clarify and structure your personal values', priority: 3, color: 'blue' },
    { role: 'advisor', mbtiCode: 'ISFP', title: 'The Adventurer', description: 'Lives by values like you, expressing them through immediate action and experience rather than theory', priority: 4, color: 'yellow' },
    { role: 'teammate', mbtiCode: 'INFJ', title: 'The Advocate', description: 'Shares your idealistic vision, focusing on understanding others\' needs to help you make a broader impact', priority: 5, color: 'green' },
    { role: 'consigliere', mbtiCode: 'ENTJ', title: 'The Commander', description: 'Challenges your open-endedness by asking for concrete results and pushing for decisive action', priority: 6, color: 'purple' },
    { role: 'alterego', mbtiCode: 'ESTJ', title: 'The Executive', description: 'Your shadow: reminds you of the security found in structure, efficiency, and established systems', priority: 7, color: 'yellow' }
  ],
  ENFJ: [
    { role: 'mirror', mbtiCode: 'ENFJ', title: 'The Protagonist', description: 'Mirrors your ability to inspire, helping you set boundaries so you can lead without burning out', priority: 1, color: 'green' },
    { role: 'twinflame', mbtiCode: 'INFJ', title: 'The Advocate', description: 'Shares your understanding of people, bringing quiet internal processing to deepen your outward connection', priority: 2, color: 'green' },
    { role: 'playmate', mbtiCode: 'ENFP', title: 'The Campaigner', description: 'Connects with people like you do, encouraging you to explore possibilities and your own values freely', priority: 3, color: 'purple' },
    { role: 'advisor', mbtiCode: 'ESFJ', title: 'The Consul', description: 'Cares about community like you, focusing on practical traditions and immediate needs to ground your vision', priority: 4, color: 'yellow' },
    { role: 'teammate', mbtiCode: 'ENTJ', title: 'The Commander', description: 'Leads decisively like you, using logical efficiency to help you achieve your group goals', priority: 5, color: 'purple' },
    { role: 'consigliere', mbtiCode: 'INTP', title: 'The Logician', description: 'Challenges your desire for harmony by asking if the group consensus is actually logically sound', priority: 6, color: 'blue' },
    { role: 'alterego', mbtiCode: 'ISTP', title: 'The Virtuoso', description: 'Your shadow: reminds you of the value of independent problem-solving and detached objectivity', priority: 7, color: 'yellow' }
  ],
  ENFP: [
    { role: 'mirror', mbtiCode: 'ENFP', title: 'The Campaigner', description: 'Mirrors your enthusiasm for possibilities, helping you focus your energy to finish what you start', priority: 1, color: 'purple' },
    { role: 'twinflame', mbtiCode: 'INFP', title: 'The Mediator', description: 'Shares your creative spirit, bringing reflective internal depth to ground your external enthusiasm', priority: 2, color: 'green' },
    { role: 'playmate', mbtiCode: 'ENTP', title: 'The Debater', description: 'Explores possibilities like you do, using logical debate to test and refine your value-driven ideas', priority: 3, color: 'purple' },
    { role: 'advisor', mbtiCode: 'ESFP', title: 'The Entertainer', description: 'Connects authentically like you, focusing on the richness of the present moment over future what-ifs', priority: 4, color: 'yellow' },
    { role: 'teammate', mbtiCode: 'ENFJ', title: 'The Protagonist', description: 'Inspires people like you do, channeling that energy into organized group harmony', priority: 5, color: 'green' },
    { role: 'consigliere', mbtiCode: 'INTJ', title: 'The Architect', description: 'Challenges your scattered focus by providing the strategic structure needed to realize your vision', priority: 6, color: 'blue' },
    { role: 'alterego', mbtiCode: 'ISTJ', title: 'The Logistician', description: 'Your shadow: reminds you of the stability found in routine, proven methods, and practical responsibility', priority: 7, color: 'yellow' }
  ],
  ISTJ: [
    { role: 'mirror', mbtiCode: 'ISTJ', title: 'The Logistician', description: 'Mirrors your reliability and duty, helping you see where flexibility can actually strengthen your systems', priority: 1, color: 'yellow' },
    { role: 'twinflame', mbtiCode: 'ESTJ', title: 'The Executive', description: 'Shares your respect for order, bringing bold leadership to help you implement your proven methods', priority: 2, color: 'yellow' },
    { role: 'playmate', mbtiCode: 'ISFJ', title: 'The Defender', description: 'Values responsibility like you, adding a layer of care for people to your logical efficiency', priority: 3, color: 'yellow' },
    { role: 'advisor', mbtiCode: 'INTJ', title: 'The Architect', description: 'Thinks efficiently like you, using future vision to innovate within your established structures', priority: 4, color: 'blue' },
    { role: 'teammate', mbtiCode: 'ISTP', title: 'The Virtuoso', description: 'Approaches problems practically like you, showing how to adapt in the moment when rules don\'t apply', priority: 5, color: 'yellow' },
    { role: 'consigliere', mbtiCode: 'ENFP', title: 'The Campaigner', description: 'Challenges your routine by exploring creative possibilities and asking what authentically matters to you', priority: 6, color: 'purple' },
    { role: 'alterego', mbtiCode: 'ENTP', title: 'The Debater', description: 'Your shadow: reminds you that questioning traditions and breaking rules can lead to necessary growth', priority: 7, color: 'purple' }
  ],
  ISFJ: [
    { role: 'mirror', mbtiCode: 'ISFJ', title: 'The Defender', description: 'Mirrors your loyalty and care, helping you prioritize your own needs so you can keep supporting others', priority: 1, color: 'yellow' },
    { role: 'twinflame', mbtiCode: 'ESFJ', title: 'The Consul', description: 'Shares your dedication to others, bringing energetic social organizing to your quiet support', priority: 2, color: 'yellow' },
    { role: 'playmate', mbtiCode: 'ISTJ', title: 'The Logistician', description: 'Values tradition like you, providing logical efficiency to support your caretaking efforts', priority: 3, color: 'yellow' },
    { role: 'advisor', mbtiCode: 'INFJ', title: 'The Advocate', description: 'Cares deeply like you do, using transformative vision to give your practical support a deeper purpose', priority: 4, color: 'green' },
    { role: 'teammate', mbtiCode: 'ISFP', title: 'The Adventurer', description: 'Values harmony like you, expressing it through creative, present-moment experiences', priority: 5, color: 'yellow' },
    { role: 'consigliere', mbtiCode: 'ENTP', title: 'The Debater', description: 'Challenges your adherence to tradition by asking if established ways truly serve everyone best', priority: 6, color: 'purple' },
    { role: 'alterego', mbtiCode: 'ENFP', title: 'The Campaigner', description: 'Your shadow: reminds you of the value of pursuing your own authentic vision and exploring new possibilities', priority: 7, color: 'purple' }
  ],
  ESTJ: [
    { role: 'mirror', mbtiCode: 'ESTJ', title: 'The Executive', description: 'Mirrors your efficiency and leadership, helping you see where flexibility can make your systems more resilient', priority: 1, color: 'yellow' },
    { role: 'twinflame', mbtiCode: 'ISTJ', title: 'The Logistician', description: 'Shares your dedication to efficiency, bringing quiet, thorough follow-through to your bold commands', priority: 2, color: 'yellow' },
    { role: 'playmate', mbtiCode: 'ESFJ', title: 'The Consul', description: 'Values organization like you, adding a focus on social harmony to your results-driven approach', priority: 3, color: 'yellow' },
    { role: 'advisor', mbtiCode: 'ENTJ', title: 'The Commander', description: 'Drives for results like you, using strategic vision to guide your efficient execution', priority: 4, color: 'purple' },
    { role: 'teammate', mbtiCode: 'ESTP', title: 'The Entrepreneur', description: 'Solves problems practically like you, showing how to adapt quickly when procedures fail', priority: 5, color: 'yellow' },
    { role: 'consigliere', mbtiCode: 'INFP', title: 'The Mediator', description: 'Challenges your focus on efficiency by asking if your structure honors the human spirit and personal values', priority: 6, color: 'green' },
    { role: 'alterego', mbtiCode: 'INTP', title: 'The Logician', description: 'Your shadow: reminds you to question established systems and value theoretical consistency over external control', priority: 7, color: 'blue' }
  ],
  ESFJ: [
    { role: 'mirror', mbtiCode: 'ESFJ', title: 'The Consul', description: 'Mirrors your warmth and organization, helping you find validation within yourself rather than just from others', priority: 1, color: 'yellow' },
    { role: 'twinflame', mbtiCode: 'ISFJ', title: 'The Defender', description: 'Shares your practical care for others, bringing steady loyalty to your energetic social organizing', priority: 2, color: 'yellow' },
    { role: 'playmate', mbtiCode: 'ESTJ', title: 'The Executive', description: 'Values organization like you, providing efficient systems to support your community building', priority: 3, color: 'yellow' },
    { role: 'advisor', mbtiCode: 'ENFJ', title: 'The Protagonist', description: 'Connects with people like you do, using transformative vision to guide your community efforts', priority: 4, color: 'green' },
    { role: 'teammate', mbtiCode: 'ESFP', title: 'The Entertainer', description: 'Energizes social situations like you, prioritizing spontaneous fun alongside your organized harmony', priority: 5, color: 'yellow' },
    { role: 'consigliere', mbtiCode: 'INTP', title: 'The Logician', description: 'Challenges your focus on harmony by asking if the group consensus is logically sound and true', priority: 6, color: 'blue' },
    { role: 'alterego', mbtiCode: 'INTJ', title: 'The Architect', description: 'Your shadow: reminds you of the value of independent strategy and long-term vision over immediate social needs', priority: 7, color: 'blue' }
  ],
  ISTP: [
    { role: 'mirror', mbtiCode: 'ISTP', title: 'The Virtuoso', description: 'Mirrors your practical independence, helping you see where connection can actually expand your freedom', priority: 1, color: 'yellow' },
    { role: 'twinflame', mbtiCode: 'ESTP', title: 'The Entrepreneur', description: 'Shares your pragmatic adaptability, bringing bold external energy to your quiet expertise', priority: 2, color: 'yellow' },
    { role: 'playmate', mbtiCode: 'INTP', title: 'The Logician', description: 'Analyzes logically like you, exploring the theories behind your hands-on solutions', priority: 3, color: 'blue' },
    { role: 'advisor', mbtiCode: 'ISTJ', title: 'The Logistician', description: 'Values efficiency like you, offering established procedures to streamline your problem-solving', priority: 4, color: 'yellow' },
    { role: 'teammate', mbtiCode: 'ISFP', title: 'The Adventurer', description: 'Lives in the present like you, adding personal values and harmony to your detached logic', priority: 5, color: 'yellow' },
    { role: 'consigliere', mbtiCode: 'ENFJ', title: 'The Protagonist', description: 'Challenges your independence by asking how your actions impact the people around you', priority: 6, color: 'green' },
    { role: 'alterego', mbtiCode: 'ENFP', title: 'The Campaigner', description: 'Your shadow: reminds you of the value of emotional expression and exploring future possibilities', priority: 7, color: 'purple' }
  ],
  ISFP: [
    { role: 'mirror', mbtiCode: 'ISFP', title: 'The Adventurer', description: 'Mirrors your authentic presence, helping you find the courage to face conflict when it protects what you value', priority: 1, color: 'yellow' },
    { role: 'twinflame', mbtiCode: 'ESFP', title: 'The Entertainer', description: 'Shares your experience-driven life, bringing energetic expression to your quiet creativity', priority: 2, color: 'yellow' },
    { role: 'playmate', mbtiCode: 'INFP', title: 'The Mediator', description: 'Lives by values like you, exploring the future possibilities inherent in your present experiences', priority: 3, color: 'green' },
    { role: 'advisor', mbtiCode: 'ISFJ', title: 'The Defender', description: 'Values harmony like you, offering practical support and tradition to ground your authenticity', priority: 4, color: 'yellow' },
    { role: 'teammate', mbtiCode: 'ISTP', title: 'The Virtuoso', description: 'Lives practically in the present like you, providing logical solutions to support your values', priority: 5, color: 'yellow' },
    { role: 'consigliere', mbtiCode: 'ENTJ', title: 'The Commander', description: 'Challenges your flow by asking for concrete goals and pushing for decisive, strategic action', priority: 6, color: 'purple' },
    { role: 'alterego', mbtiCode: 'ENTP', title: 'The Debater', description: 'Your shadow: reminds you of the value of intellectual debate and challenging conventions', priority: 7, color: 'purple' }
  ],
  ESTP: [
    { role: 'mirror', mbtiCode: 'ESTP', title: 'The Entrepreneur', description: 'Mirrors your bold adaptability, helping you pause to consider the long-term impact of your quick actions', priority: 1, color: 'yellow' },
    { role: 'twinflame', mbtiCode: 'ISTP', title: 'The Virtuoso', description: 'Shares your tactical thinking, bringing quiet expertise to ground your bold moves', priority: 2, color: 'yellow' },
    { role: 'playmate', mbtiCode: 'ESFP', title: 'The Entertainer', description: 'Lives boldly in the moment like you, adding authentic personal expression to your logical tactics', priority: 3, color: 'yellow' },
    { role: 'advisor', mbtiCode: 'ESTP', title: 'The Entrepreneur', description: 'Tackles challenges pragmatically like you, reinforcing your ability to adapt and overcome', priority: 4, color: 'yellow' },
    { role: 'teammate', mbtiCode: 'ESTJ', title: 'The Executive', description: 'Gets results like you, offering established procedures to scale your immediate successes', priority: 5, color: 'yellow' },
    { role: 'consigliere', mbtiCode: 'INFJ', title: 'The Advocate', description: 'Challenges your focus on the now by asking what deeper patterns and future implications you might be missing', priority: 6, color: 'green' },
    { role: 'alterego', mbtiCode: 'INTJ', title: 'The Architect', description: 'Your shadow: reminds you of the value of long-term strategic planning and internal vision', priority: 7, color: 'blue' }
  ],
  ESFP: [
    { role: 'mirror', mbtiCode: 'ESFP', title: 'The Entertainer', description: 'Mirrors your enthusiastic presence, helping you see that planning for the future doesn\'t have to kill the fun', priority: 1, color: 'yellow' },
    { role: 'twinflame', mbtiCode: 'ISFP', title: 'The Adventurer', description: 'Shares your experience-driven life, bringing quiet creative depth to your energetic expression', priority: 2, color: 'yellow' },
    { role: 'playmate', mbtiCode: 'ESTP', title: 'The Entrepreneur', description: 'Lives boldly in the moment like you, providing logical tactics to support your authentic expression', priority: 3, color: 'yellow' },
    { role: 'advisor', mbtiCode: 'ESFJ', title: 'The Consul', description: 'Energizes social situations like you, offering organized harmony to support your spontaneity', priority: 4, color: 'yellow' },
    { role: 'teammate', mbtiCode: 'ENFP', title: 'The Campaigner', description: 'Brings energy like you, exploring the future possibilities that your present experiences could lead to', priority: 5, color: 'purple' },
    { role: 'consigliere', mbtiCode: 'INTJ', title: 'The Architect', description: 'Challenges your spontaneity by asking what long-term strategy will sustain your lifestyle', priority: 6, color: 'blue' },
    { role: 'alterego', mbtiCode: 'INFJ', title: 'The Advocate', description: 'Your shadow: reminds you of the value of deep meaning, internal reflection, and future vision', priority: 7, color: 'green' }
  ],
  BALANCED: [
    { role: 'mirror', mbtiCode: 'BALANCED', title: 'The Seeker', description: 'Offers a balanced perspective, helping you integrate different viewpoints without bias', priority: 1, color: 'blue' },
    { role: 'advisor', mbtiCode: 'INTJ', title: 'The Analyst', description: 'Provides rational, strategic thinking to help you see the long-term picture', priority: 2, color: 'blue' },
    { role: 'teammate', mbtiCode: 'ENFJ', title: 'The Diplomat', description: 'Offers empathetic, people-focused insight to ensure your decisions build harmony', priority: 3, color: 'green' },
    { role: 'consigliere', mbtiCode: 'ISTJ', title: 'The Guardian', description: 'Provides practical, reliable advice based on what has worked in the past', priority: 4, color: 'yellow' },
    { role: 'alterego', mbtiCode: 'ESTP', title: 'The Explorer', description: 'Encourages action and adaptability, helping you test ideas in the real world', priority: 5, color: 'yellow' },
    { role: 'playmate', mbtiCode: 'INFP', title: 'The Idealist', description: 'Reminds you to stay true to your authentic values and compassion', priority: 6, color: 'green' },
    { role: 'twinflame', mbtiCode: 'ENTP', title: 'The Innovator', description: 'Challenges assumptions and generates innovative new possibilities', priority: 7, color: 'purple' }
  ]
};

/**
 * Selects the appropriate counselors based on user MBTI and desired council size
 * @param userMBTI - The user's MBTI type (or 'BALANCED')
 * @param councilSize - Number of counselors (3-7)
 * @returns Array of CounselorRole objects sorted by priority
 */
export function selectCouncilors(userMBTI: string | null, councilSize: number): CounselorRole[] {
  const mbtiKey = userMBTI && userMBTI !== 'BALANCED' ? userMBTI : 'BALANCED';
  const allCounselors = COUNSELOR_MATRIX[mbtiKey] || COUNSELOR_MATRIX['BALANCED'];
  
  // Ensure councilSize is within valid range
  const validSize = Math.max(3, Math.min(7, councilSize));
  
  // Sort by priority and take the first N
  return allCounselors
    .sort((a, b) => a.priority - b.priority)
    .slice(0, validSize);
}
