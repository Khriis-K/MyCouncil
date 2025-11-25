export interface TypeDetail {
  description: string;
  traits: string[];
  dichotomyValues: { ie: number; sn: number; tf: number; jp: number }; // 0 (Left) to 100 (Right)
  quote: string;
  validationQuestions: string[];
  strengths: string[];
  weaknesses: string[];
}

// Full Data Set for 16 Personalities
export const TYPE_DETAILS: Record<string, TypeDetail> = {
  // Analysts (Intuitve (N) and Thinking (T))
  INTJ: {
    description: "The Architect is a strategic thinker with a plan for everything. They are independent, analytical, and driven to improve systems and processes with long-range vision.",
    traits: ["Strategic", "Analytical", "Independent", "Decisive", "Determined"],
    dichotomyValues: { ie: 15, sn: 80, tf: 20, jp: 10 },
    quote: "Competence, intelligence, and structure are the foundations of progress.",
    validationQuestions: [
      "I prefer to have a detailed plan rather than improvising.",
      "I often value objective truth over emotional comfort.",
      "I feel drained after extensive social interaction.",
      "I am more interested in the underlying patterns than the surface details.",
      "Inefficiency is one of my biggest frustrations.",
      "I tend to analyze situations from a detached perspective.",
      "I value competence above almost everything else.",
      "I rarely change my mind once I have reached a logical conclusion.",
      "I prefer deep, theoretical conversation to small talk.",
      "I am comfortable standing alone if I believe I am right."
    ],
    strengths: ["Rational", "Informed", "Independent", "Determined"],
    weaknesses: ["Arrogant", "Dismissive of Emotions", "Overly Critical", "Combative"]
  },
  INTP: {
    description: "The Logician is an innovative inventor with an unquenchable thirst for knowledge. They love patterns, logical analysis, and theoretical abstract concepts.",
    traits: ["Curious", "Logical", "Original", "Open-minded", "Objective"],
    dichotomyValues: { ie: 10, sn: 85, tf: 15, jp: 90 },
    quote: "Learn from yesterday, live for today, hope for tomorrow. The important thing is not to stop questioning.",
    validationQuestions: [
      "I enjoy exploring theoretical concepts more than practical application.",
      "I often get lost in my own thoughts.",
      "Structure and rigid rules feel limiting to me.",
      "I spot logical inconsistencies almost immediately.",
      "I prefer to keep my options open rather than committing to a plan.",
      "I am often skeptical of established authorities.",
      "I enjoy taking things apart to see how they work.",
      "I delay decisions to gather more information.",
      "I value precision in language and definitions.",
      "I tend to be private about my feelings."
    ],
    strengths: ["Analytical", "Original", "Open-Minded", "Curious"],
    weaknesses: ["Disconnected", "Insensitive", "Dissatisfied", "Impatient"]
  },
  ENTJ: {
    description: "The Commander is a bold, imaginative, and strong-willed leader, always finding a way - or making one. They see challenges as opportunities to push boundaries.",
    traits: ["Efficient", "Energetic", "Confident", "Charismatic", "Strategic"],
    dichotomyValues: { ie: 90, sn: 75, tf: 10, jp: 15 },
    quote: "There is no such thing as failure, only feedback and a chance to strategize better.",
    validationQuestions: [
      "I naturally take charge in group situations.",
      "Inefficiency bothers me more than almost anything.",
      "I see complex challenges as opportunities to grow.",
      "I focus on long-term goals rather than immediate comfort.",
      "I am decisive and confident in my judgments.",
      "I value productivity and tangible results.",
      "I enjoy debating to prove a point or find the truth.",
      "I struggle to tolerate incompetence.",
      "I am energized by setting and achieving ambitious goals.",
      "I tend to be direct and honest, sometimes to a fault."
    ],
    strengths: ["Efficient", "Energetic", "Self-Confident", "Strong-Willed"],
    weaknesses: ["Stubborn", "Intolerant", "Impatient", "Arrogant"]
  },
  ENTP: {
    description: "The Debater is a smart and curious thinker who cannot resist an intellectual challenge. They thrive on deconstructing arguments and exploring new ideas.",
    traits: ["Knowledgeable", "Quick-thinking", "Original", "Charismatic", "Debater"],
    dichotomyValues: { ie: 85, sn: 90, tf: 25, jp: 85 },
    quote: "Follow the path of the unsafe, independent thinker. Expose your ideas to the dangers of controversy.",
    validationQuestions: [
      "I enjoy playing devil's advocate to test ideas.",
      "I get bored easily with routine implementation tasks.",
      "I prefer brainstorming over finishing details.",
      "I love debating just for the mental exercise.",
      "I find rules to be mere guidelines/suggestions.",
      "I am energized by new possibilities and future potential.",
      "I can argue both sides of an issue convincingly.",
      "I value innovation over tradition.",
      "I sometimes struggle to focus on one thing at a time.",
      "I enjoy analyzing complex systems and how to break them."
    ],
    strengths: ["Knowledgeable", "Quick-Thinking", "Original", "Charismatic"],
    weaknesses: ["Very Argumentative", "Insensitive", "Intolerant", "Can Find It Difficult to Focus"]
  },

  // Diplomats (Intuitive (N) and Feeling (F))
  INFJ: {
    description: "The Advocate is a rare, empathetic idealist driven by strong principles, seeking to inspire change and support others with quiet determination.",
    traits: ["Empathetic", "Insightful", "Principled", "Creative", "Determined"],
    dichotomyValues: { ie: 10, sn: 85, tf: 80, jp: 15 },
    quote: "Driven by a vision for positive change, they reflect on ethics and impact, finding meaning in helping others.",
    validationQuestions: [
      "I often prioritize ethical principles over practical concerns.",
      "I can easily sense what others are feeling, even if they don't say it.",
      "I need a sense of meaningful purpose in my work.",
      "I prefer deep, one-on-one connections over large groups.",
      "I am often described as an 'old soul'.",
      "I avoid conflict but will fight for my values.",
      "I plan for the future and dislike unexpected changes.",
      "I am very private and selective about who I open up to.",
      "I seek harmony and understanding in relationships.",
      "I trust my intuition/gut feeling about people."
    ],
    strengths: ["Creative", "Insightful", "Principled", "Passionate"],
    weaknesses: ["Sensitive to Criticism", "Reluctant to Open Up", "Perfectionistic", "Prone to Burnout"]
  },
  INFP: {
    description: "The Mediator is a poetic, kind, and altruistic person, always eager to help a good cause. They are guided by their inner values and seek harmony in all interactions.",
    traits: ["Idealistic", "Empathetic", "Open-minded", "Creative", "Passionate"],
    dichotomyValues: { ie: 5, sn: 90, tf: 90, jp: 95 },
    quote: "All that is gold does not glitter, not all those who wander are lost.",
    validationQuestions: [
      "I make decisions based on how I feel about them internally.",
      "I often daydream about future possibilities.",
      "I value harmony and avoid conflict whenever possible.",
      "I am deeply moved by art, music, or nature.",
      "I struggle with rigid structures and deadlines.",
      "I often feel misunderstood by others.",
      "I have a rich inner world that I keep mostly to myself.",
      "I am guided more by personal values than logic.",
      "I prefer to work independently and creatively.",
      "I am flexible and adaptable, unless a value is violated."
    ],
    strengths: ["Empathetic", "Generous", "Open-Minded", "Creative"],
    weaknesses: ["Unrealistic", "Self-Isolating", "Unfocused", "Emotionally Vulnerable"]
  },
  ENFJ: {
    description: "The Protagonist is a charismatic and inspiring leader, able to mesmerize their listeners. They are deeply attuned to the emotions and needs of others.",
    traits: ["Reliable", "Passion", "Altruistic", "Charismatic", "Natural Leader"],
    dichotomyValues: { ie: 95, sn: 80, tf: 85, jp: 10 },
    quote: "To the world you may be one person; but to one person you may be the world.",
    validationQuestions: [
      "I feel responsible for the feelings of others.",
      "I am energized by helping people grow.",
      "I prioritize group consensus over my own logic.",
      "I am naturally drawn to leadership roles.",
      "I can easily communicate with all types of people.",
      "I value harmony and cooperation above competition.",
      "I tend to take on others' problems as my own.",
      "I am organized and like to have a plan for the group.",
      "I am very sensitive to criticism.",
      "I strive to make the world a better place."
    ],
    strengths: ["Receptive", "Reliable", "Passionate", "Altruistic"],
    weaknesses: ["Unrealistic", "Overly Idealistic", "Condescending", "Intense"]
  },
  ENFP: {
    description: "The Campaigner is an enthusiastic, creative, and sociable free spirit, who can always find a reason to smile. They see life as a big, complex puzzle of connections.",
    traits: ["Curious", "Observant", "Energetic", "Enthusiastic", "Communicator"],
    dichotomyValues: { ie: 90, sn: 95, tf: 80, jp: 90 },
    quote: "Creativity is seeing what everyone else has seen, and thinking what no one else has thought.",
    validationQuestions: [
      "I am drawn to novel ideas and experiences.",
      "I have a hard time focusing on one thing for too long.",
      "I am led by my enthusiasm and curiosity.",
      "I enjoy connecting with people on a deep level.",
      "I value freedom and independence highly.",
      "I am optimistic and see the best in people.",
      "I struggle with routine and repetitive tasks.",
      "I process my feelings by talking them out.",
      "I am spontaneous and love surprises.",
      "I see patterns and connections everywhere."
    ],
    strengths: ["Curious", "Observant", "Energetic", "Enthusiastic"],
    weaknesses: ["Poor Practical Skills", "Find it Difficult to Focus", "Overthink Things", "Get Stressed Easily"]
  },

  // Sentinels (Sensing (S) and Judging (J))
  ISTJ: {
    description: "The Logistician is a practical and fact-minded individual whose reliability cannot be doubted. They value structure, order, and traditions.",
    traits: ["Honest", "Direct", "Responsible", "Practical", "Orderly"],
    dichotomyValues: { ie: 10, sn: 15, tf: 10, jp: 5 },
    quote: "I hold that a rustle in the bushes is actually a rustle in the bushes, not a monster.",
    validationQuestions: [
      "I rely on past experience to solve current problems.",
      "I value duty and responsibility above all.",
      "I prefer clear rules and expectations.",
      "I am very detail-oriented and thorough.",
      "I keep my promises and expect others to do the same.",
      "I prefer to work alone and without interruption.",
      "I value tradition and established methods.",
      "I am practical and grounded in reality.",
      "I dislike chaos and disorder.",
      "I make decisions based on facts and logic."
    ],
    strengths: ["Honest", "Direct", "Strong-willed", "Dutiful"],
    weaknesses: ["Stubborn", "Insensitive", "Always by the Book", "Judgmental"]
  },
  ISFJ: {
    description: "The Defender is a dedicated and warm protector, always ready to defend their loved ones. They are hardworking, loyal, and deeply concerned with the feelings of others.",
    traits: ["Supportive", "Reliable", "Observant", "Enthusiastic", "Hardworking"],
    dichotomyValues: { ie: 15, sn: 10, tf: 75, jp: 10 },
    quote: "Love only grows by sharing. You can only have more for yourself by giving it away to others.",
    validationQuestions: [
      "I notice details about people that others miss.",
      "I struggle to say no when asked for help.",
      "I value stability and tradition.",
      "I am very loyal to my friends and family.",
      "I work hard to ensure others are comfortable.",
      "I prefer to stay in the background.",
      "I take my responsibilities very personally.",
      "I am sensitive to others' feelings.",
      "I prefer practical help over abstract advice.",
      "I remember birthdays and special occasions."
    ],
    strengths: ["Supportive", "Reliable", "Observant", "Enthusiastic"],
    weaknesses: ["Overly Humble", "Taking Things Personally", "Repressing Their Feelings", "Overworking"]
  },
  ESTJ: {
    description: "The Executive is an administrator, unsurpassed at managing things or people. They rely on facts and prefer organized, structured environments.",
    traits: ["Dedicated", "Strong-willed", "Direct", "Honest", "Loyal"],
    dichotomyValues: { ie: 85, sn: 10, tf: 5, jp: 5 },
    quote: "Order and simplification are the first steps toward the mastery of a subject.",
    validationQuestions: [
      "I value efficiency and clear hierarchy.",
      "I am comfortable enforcing rules.",
      "I focus on concrete facts rather than abstract ideas.",
      "I like to organize people and resources.",
      "I am direct and honest in my communication.",
      "I value hard work and dedication.",
      "I expect others to follow through on their commitments.",
      "I prefer established procedures over experimentation.",
      "I am confident in my leadership abilities.",
      "I dislike laziness and incompetence."
    ],
    strengths: ["Dedicated", "Strong-willed", "Direct", "Honest"],
    weaknesses: ["Inflexible", "Uncomfortable with Unconventional Situations", "Judgmental", "Too Focused on Social Status"]
  },
  ESFJ: {
    description: "The Consul is an extraordinarily caring, social, and popular person, always eager to help. They focus on the people around them and practical support.",
    traits: ["Practical", "Loyal", "Sensitive", "Warm", "Connector"],
    dichotomyValues: { ie: 90, sn: 15, tf: 80, jp: 10 },
    quote: "Encourage, lift and strengthen one another. For the positive energy spread to one will be felt by us all.",
    validationQuestions: [
      "I enjoy hosting and caring for others.",
      "I value social status and belonging.",
      "I prioritize the practical needs of my community.",
      "I am very attentive to social norms.",
      "I dislike conflict and tension.",
      "I am loyal to my group and friends.",
      "I enjoy organizing social events.",
      "I am sensitive to criticism and rejection.",
      "I like to be helpful in practical ways.",
      "I value harmony and cooperation."
    ],
    strengths: ["Strong Practical Skills", "Strong Sense of Duty", "Very Loyal", "Sensitive"],
    weaknesses: ["Worried about Their Social Status", "Inflexible", "Reluctant to Innovate", "Vulnerable to Criticism"]
  },

  // Explorers (Sensing (S) and Perceiving (P))
  ISTP: {
    description: "The Virtuoso is a bold and practical experimenter, master of all kinds of tools. They are rational, relaxed, and enjoy exploring the world with their hands.",
    traits: ["Rational", "Relaxed", "Optimistic", "Practical", "Energetic"],
    dichotomyValues: { ie: 20, sn: 10, tf: 15, jp: 90 },
    quote: "The only source of knowledge is experience.",
    validationQuestions: [
      "I learn best by doing and using my hands.",
      "I stay calm in a crisis.",
      "I value my independence and freedom.",
      "I enjoy taking things apart and fixing them.",
      "I am often described as cool and detached.",
      "I live in the moment and adapt quickly.",
      "I dislike long-term planning.",
      "I am practical and realistic.",
      "I enjoy risky or adrenaline-filled activities.",
      "I communicate through action rather than words."
    ],
    strengths: ["Optimistic", "Energetic", "Creative", "Spontaneous"],
    weaknesses: ["Stubborn", "Insensitive", "Private and Reserved", "Easily Bored"]
  },
  ISFP: {
    description: "The Adventurer is a flexible and charming artist, always ready to explore and experience something new. They live in the moment and seek beauty.",
    traits: ["Charming", "Sensitive", "Imaginative", "Passionate", "Curious"],
    dichotomyValues: { ie: 15, sn: 20, tf: 85, jp: 85 },
    quote: "I dream my painting and I paint my dream.",
    validationQuestions: [
      "I express myself through action or art.",
      "I dislike rigid schedules and constraints.",
      "I value aesthetic beauty in my environment.",
      "I am sensitive to the feelings of others.",
      "I enjoy exploring new places and experiences.",
      "I am quiet and reserved but friendly.",
      "I live in the present moment.",
      "I avoid conflict and criticism.",
      "I value my personal space and freedom.",
      "I am guided by my own inner values."
    ],
    strengths: ["Charming", "Sensitive to Others", "Imaginative", "Passionate"],
    weaknesses: ["Fiercely Independent", "Unpredictable", "Easily Stressed", "Overly Competitive"]
  },
  ESTP: {
    description: "The Entrepreneur is a smart, energetic, and very perceptive person, who truly enjoys living on the edge. They are action-oriented and dive right into problems.",
    traits: ["Bold", "Rational", "Original", "Perceptive", "Direct"],
    dichotomyValues: { ie: 95, sn: 15, tf: 10, jp: 95 },
    quote: "Life is either a daring adventure or nothing at all.",
    validationQuestions: [
      "I live in the moment and enjoy action.",
      "I prefer to ask for forgiveness than permission.",
      "I bore easily with abstract theory.",
      "I am competitive and love a challenge.",
      "I am good at reading people and situations.",
      "I enjoy being the center of attention.",
      "I solve problems practically and immediately.",
      "I dislike rules and restrictions.",
      "I am direct and straightforward.",
      "I enjoy taking risks."
    ],
    strengths: ["Bold", "Rational", "Original", "Perceptive"],
    weaknesses: ["Insensitive", "Impatient", "Risk-prone", "Unstructured"]
  },
  ESFP: {
    description: "The Entertainer is a spontaneous, energetic, and enthusiastic person - life is never boring around them. They love the spotlight and helping others have fun.",
    traits: ["Bold", "Original", "Aesthetics", "Practical", "Observant"],
    dichotomyValues: { ie: 95, sn: 10, tf: 90, jp: 90 },
    quote: "We don't stop playing because we grow old; we grow old because we stop playing.",
    validationQuestions: [
      "I love being the center of attention.",
      "I try to make everything fun.",
      "I focus on immediate experiences.",
      "I am very social and outgoing.",
      "I enjoy performing and entertaining others.",
      "I dislike routine and boredom.",
      "I am practical and realistic.",
      "I am sensitive to others' feelings.",
      "I avoid conflict and negative emotions.",
      "I love to explore new things and places."
    ],
    strengths: ["Bold", "Original", "Aesthetics", "Practical"],
    weaknesses: ["Sensitive", "Conflict-Averse", "Easily Bored", "Poor Long-Term Planners"]
  },
  // Fallback
  DEFAULT: {
    description: "A unique personality type characterized by distinct cognitive preferences.",
    traits: ["Analytical", "Creative", "Social", "Organized"],
    dichotomyValues: { ie: 50, sn: 50, tf: 50, jp: 50 },
    quote: "Understanding yourself is the beginning of all wisdom.",
    validationQuestions: ["I feel confident in my self-assessment."],
    strengths: ["Adaptable", "Balanced"],
    weaknesses: ["Uncertain", "Hesitant"]
  }
};

export const AVATAR_URLS: Record<string, string> = {
  INTJ: "https://avataaars.io/?avatarStyle=Transparent&topType=ShortHairTheCaesar&accessoriesType=Blank&hairColor=Black&facialHairType=Blank&clotheType=BlazerShirt&eyeType=Default&eyebrowType=Default&mouthType=Serious&skinColor=Light",
  INTP: "https://avataaars.io/?avatarStyle=Transparent&topType=ShortHairSides&accessoriesType=Round&hairColor=Brown&facialHairType=Blank&clotheType=BlazerSweater&clotheColor=Blue02&eyeType=Squint&eyebrowType=Default&mouthType=Concerned&skinColor=Light",
  ENTJ: "https://avataaars.io/?avatarStyle=Transparent&topType=ShortHairShortFlat&accessoriesType=Blank&hairColor=Black&facialHairType=Blank&clotheType=BlazerShirt&clotheColor=Black&eyeType=Default&eyebrowType=Default&mouthType=Serious&skinColor=Tanned",
  ENTP: "https://avataaars.io/?avatarStyle=Transparent&topType=ShortHairShortCurly&accessoriesType=Wayfarers&hairColor=BrownDark&facialHairType=Blank&clotheType=Hoodie&clotheColor=Red&eyeType=Wink&eyebrowType=RaisedExcited&mouthType=Smile&skinColor=Light",
  INFJ: "https://avataaars.io/?avatarStyle=Transparent&topType=LongHairStraight&accessoriesType=Blank&hairColor=Brown&facialHairType=Blank&clotheType=BlazerSweater&clotheColor=Gray01&eyeType=Default&eyebrowType=DefaultNatural&mouthType=Smile&skinColor=Light",
  INFP: "https://avataaars.io/?avatarStyle=Transparent&topType=LongHairCurvy&accessoriesType=Blank&hairColor=Blonde&facialHairType=Blank&clotheType=CollarSweater&clotheColor=PastelGreen&eyeType=Happy&eyebrowType=DefaultNatural&mouthType=Smile&skinColor=Pale",
  ENFJ: "https://avataaars.io/?avatarStyle=Transparent&topType=LongHairBob&accessoriesType=Blank&hairColor=BrownDark&facialHairType=Blank&clotheType=BlazerSweater&clotheColor=Red&eyeType=Happy&eyebrowType=RaisedExcited&mouthType=Smile&skinColor=Light",
  ENFP: "https://avataaars.io/?avatarStyle=Transparent&topType=LongHairBigHair&accessoriesType=Blank&hairColor=Red&facialHairType=Blank&clotheType=Hoodie&clotheColor=Pink&eyeType=Wink&eyebrowType=RaisedExcitedNatural&mouthType=Twinkle&skinColor=Light",
  ISTJ: "https://avataaars.io/?avatarStyle=Transparent&topType=ShortHairTheCaesarSidePart&accessoriesType=Prescription02&hairColor=Black&facialHairType=Blank&clotheType=ShirtCrewNeck&clotheColor=Gray02&eyeType=Default&eyebrowType=Default&mouthType=Default&skinColor=Light",
  ISFJ: "https://avataaars.io/?avatarStyle=Transparent&topType=LongHairStraight&accessoriesType=Blank&hairColor=BlondeGolden&facialHairType=Blank&clotheType=CollarSweater&clotheColor=PastelBlue&eyeType=Happy&eyebrowType=DefaultNatural&mouthType=Smile&skinColor=Light",
  ESTJ: "https://avataaars.io/?avatarStyle=Transparent&topType=ShortHairShortFlat&accessoriesType=Blank&hairColor=Brown&facialHairType=Blank&clotheType=BlazerShirt&clotheColor=Blue01&eyeType=Default&eyebrowType=Default&mouthType=Serious&skinColor=Tanned",
  ESFJ: "https://avataaars.io/?avatarStyle=Transparent&topType=ShortHairShortWaved&accessoriesType=Blank&hairColor=BrownDark&facialHairType=Blank&clotheType=ShirtVNeck&clotheColor=PastelOrange&eyeType=Happy&eyebrowType=DefaultNatural&mouthType=Smile&skinColor=Light",
  ISTP: "https://avataaars.io/?avatarStyle=Transparent&topType=ShortHairSides&accessoriesType=Sunglasses&hairColor=Black&facialHairType=BeardLight&facialHairColor=Black&clotheType=Hoodie&clotheColor=Gray01&eyeType=Side&eyebrowType=Default&mouthType=Default&skinColor=Light",
  ISFP: "https://avataaars.io/?avatarStyle=Transparent&topType=LongHairShavedSides&accessoriesType=Blank&hairColor=Brown&facialHairType=Blank&clotheType=GraphicShirt&clotheColor=PastelYellow&graphicType=Diamond&eyeType=Wink&eyebrowType=DefaultNatural&mouthType=Smile&skinColor=Light",
  ESTP: "https://avataaars.io/?avatarStyle=Transparent&topType=ShortHairShortWaved&accessoriesType=Blank&hairColor=Blonde&facialHairType=Blank&clotheType=BlazerSweater&clotheColor=Blue03&eyeType=Wink&eyebrowType=RaisedExcited&mouthType=Smile&skinColor=Tanned",
  ESFP: "https://avataaars.io/?avatarStyle=Transparent&topType=LongHairFro&accessoriesType=Blank&hairColor=PastelPink&facialHairType=Blank&clotheType=GraphicShirt&clotheColor=Pink&graphicType=Hola&eyeType=Hearts&eyebrowType=RaisedExcited&mouthType=Smile&skinColor=Brown"
};
