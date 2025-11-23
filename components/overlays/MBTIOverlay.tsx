
import React, { useState, useEffect, useMemo } from 'react';
import { MBTIType } from '../../types';
import { MBTI_TYPES } from '../../constants';

interface MBTIOverlayProps {
  onClose: () => void;
  onConfirm: (code: string) => void;
}

interface TypeDetail {
  description: string;
  traits: string[];
  dichotomyValues: { ie: number; sn: number; tf: number; jp: number }; // 0 (Left) to 100 (Right)
  quote: string;
  validationQuestions: string[];
}

// Full Data Set for 16 Personalities
const TYPE_DETAILS: Record<string, TypeDetail> = {
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
  },
  // Fallback
  DEFAULT: {
    description: "A unique personality type characterized by distinct cognitive preferences.",
    traits: ["Analytical", "Creative", "Social", "Organized"],
    dichotomyValues: { ie: 50, sn: 50, tf: 50, jp: 50 },
    quote: "Understanding yourself is the beginning of all wisdom.",
    validationQuestions: ["I feel confident in my self-assessment."]
  }
};

const AVATAR_URLS: Record<string, string> = {
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

const MBTIOverlay: React.FC<MBTIOverlayProps> = ({ onClose, onConfirm }) => {
  const [selectedType, setSelectedType] = useState<MBTIType | null>(null);

  // Validation State
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [seenIndices, setSeenIndices] = useState<Set<number>>(new Set());
  const [confidence, setConfidence] = useState(75);
  const [sliderVal, setSliderVal] = useState(3); // Default to Neutral (3)

  const details = selectedType ? (TYPE_DETAILS[selectedType.code] || TYPE_DETAILS.DEFAULT) : TYPE_DETAILS.DEFAULT;
  const allQuestions = details.validationQuestions || ["Confirm details"];

  // Pick a random question that hasn't been seen yet.
  // If all have been seen, reset the seen list (infinite loop).
  const getRandomQuestion = (seen: Set<number>) => {
    const available = allQuestions.map((_, i) => i).filter(i => !seen.has(i));

    if (available.length === 0) {
      // All questions seen, reset loop but keep current history cleared
      const randomIndex = Math.floor(Math.random() * allQuestions.length);
      return { text: allQuestions[randomIndex], index: randomIndex, shouldReset: true };
    }

    const randomIndex = Math.floor(Math.random() * available.length);
    const selectedIndex = available[randomIndex];
    return { text: allQuestions[selectedIndex], index: selectedIndex, shouldReset: false };
  };

  // Reset state when type changes
  useEffect(() => {
    if (selectedType) {
      setConfidence(75);
      setSliderVal(3); // Reset to Neutral
      setSeenIndices(new Set());

      // Pick Initial Question
      const firstQIndex = Math.floor(Math.random() * allQuestions.length);
      setCurrentQuestion(allQuestions[firstQIndex]);
      setSeenIndices(new Set([firstQIndex]));
    }
  }, [selectedType]);

  const handleTypeClick = (type: MBTIType) => {
    setSelectedType(type);
  };

  const getGroupStyles = (group: string) => {
    switch (group) {
      case 'analyst':
        return {
          border: 'border-analyst',
          text: 'text-analyst',
          shadow: 'hover:shadow-[0_0_20px_rgba(8,145,178,0.4)]',
          bg: 'hover:bg-analyst/10',
          lightBg: 'bg-analyst/5',
          colorHex: '#0891b2',
          barColor: 'bg-[#0891b2]'
        };
      case 'diplomat':
        return {
          border: 'border-diplomat',
          text: 'text-diplomat',
          shadow: 'hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]',
          bg: 'hover:bg-diplomat/10',
          lightBg: 'bg-diplomat/5',
          colorHex: '#10b981',
          barColor: 'bg-[#10b981]'
        };
      case 'sentinel':
        return {
          border: 'border-sentinel',
          text: 'text-sentinel',
          shadow: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]',
          bg: 'hover:bg-sentinel/10',
          lightBg: 'bg-sentinel/5',
          colorHex: '#f59e0b',
          barColor: 'bg-[#f59e0b]'
        };
      case 'explorer':
        return {
          border: 'border-explorer',
          text: 'text-explorer',
          shadow: 'hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]',
          bg: 'hover:bg-explorer/10',
          lightBg: 'bg-explorer/5',
          colorHex: '#a855f7',
          barColor: 'bg-[#a855f7]'
        };
      default:
        return {
          border: 'border-slate-600',
          text: 'text-slate-400',
          shadow: '',
          bg: 'hover:bg-slate-800',
          lightBg: 'bg-slate-800',
          colorHex: '#94a3b8',
          barColor: 'bg-slate-400'
        };
    }
  };

  const activeStyles = selectedType ? getGroupStyles(selectedType.group) : null;

  const handleNext = (val?: number) => {
    const valueToUse = val !== undefined ? val : sliderVal;
    // Simulate confidence change based on Likert scale
    // 1 = Strong Disagree (-2 impact), 2 = Disagree (-1), 3 = Neutral (0), 4 = Agree (+1), 5 = Strong Agree (+2)
    // Mapping to 5% increments
    const change = (valueToUse - 3) * 5;
    setConfidence(prev => Math.min(99, Math.max(1, Math.round(prev + change))));

    // Get Next Question Logic
    const { text, index, shouldReset } = getRandomQuestion(seenIndices);

    setCurrentQuestion(text);
    setSliderVal(3); // Reset slider to Neutral

    if (shouldReset) {
      setSeenIndices(new Set([index]));
    } else {
      setSeenIndices(prev => new Set(prev).add(index));
    }
  };

  const renderDichotomy = (labelLeft: string, labelRight: string, value: number) => {
    // Value is 0 (Left) to 100 (Right)
    const isLeft = value < 50;
    const distanceFromCenter = Math.abs(value - 50);

    const barLeft = isLeft ? `${value}%` : '50%';
    const barWidth = `${distanceFromCenter}%`;

    return (
      <div className="flex items-center justify-between text-xs py-1 w-full">
        <span className={`w-20 text-right font-medium leading-none truncate ${isLeft && activeStyles ? activeStyles.text : 'text-slate-500'}`}>
          {labelLeft}
        </span>

        <div className="mx-3 flex-grow h-2 bg-slate-800 rounded-full relative overflow-hidden">
          {/* Center marker */}
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-slate-700 z-10 -translate-x-1/2"></div>
          {/* Value Bar */}
          <div
            className={`absolute top-0 bottom-0 rounded-full transition-all duration-500 ease-out ${activeStyles ? activeStyles.barColor : 'bg-slate-400'}`}
            style={{ left: barLeft, width: barWidth }}
          ></div>
        </div>

        <span className={`w-20 text-left font-medium leading-none truncate ${!isLeft && activeStyles ? activeStyles.text : 'text-slate-500'}`}>
          {labelRight}
        </span>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-all"
        onClick={selectedType ? () => setSelectedType(null) : onClose}
      ></div>

      {/* Grid Content Container */}
      <div className={`relative z-10 flex-grow flex flex-col items-center justify-center p-4 overflow-y-auto scrollbar-hide transition-all duration-500 ${selectedType ? 'blur-sm opacity-50 pointer-events-none' : ''}`}>
        <div className="w-full max-w-5xl flex flex-col items-center animate-fade-in my-auto">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Select Your MBTI Type</h2>

          <div className="grid grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {MBTI_TYPES.map((type) => {
              const styles = getGroupStyles(type.group);
              return (
                <button
                  key={type.code}
                  onClick={() => handleTypeClick(type)}
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-[3px] flex flex-col items-center justify-center transition-all duration-300 hover:scale-110 bg-transparent ${styles.border} ${styles.bg} ${styles.shadow}`}
                >
                  <span className="text-lg sm:text-xl font-bold text-white tracking-wide drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">{type.code}</span>
                  <span className={`text-[10px] sm:text-xs font-medium mt-0.5 ${styles.text}`}>{type.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Sidebar for Type Details */}
      {selectedType && activeStyles && (
        <aside className="fixed top-0 right-0 h-full w-[500px] z-50 bg-slate-900/95 backdrop-blur-2xl border-l border-slate-700 shadow-2xl overflow-hidden animate-slide-in-right flex flex-col">
            {/* Header - Compact */}
            <header className="flex items-center justify-between px-6 py-3 shrink-0 border-b border-slate-800/50">
                <h2 className="text-lg font-bold text-white truncate">About {selectedType.code} - {selectedType.name}</h2>
                <button 
                    onClick={() => setSelectedType(null)} 
                    className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors focus:outline-none"
                >
                    <span className="material-symbols-outlined text-xl">close</span>
                </button>
            </header>

            {/* Top Content Area - Flexible Height */}
            <div className="flex-grow flex flex-col px-6 py-4 overflow-hidden gap-6">
                
                {/* Profile Identity - More Prominent */}
                <div className="flex items-start gap-4 shrink-0">
                    <div className={`w-24 h-24 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border-2 ${activeStyles.border} bg-slate-800/50 shadow-lg`}>
                        <img 
                          src={AVATAR_URLS[selectedType.code] || AVATAR_URLS.INTJ}
                          alt={`${selectedType.name} avatar`}
                          className="w-full h-full object-cover"
                        />
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed font-light pt-1">
                        {details.description}
                    </p>
                </div>

                {/* Traits & Dichotomies - Balanced Grid */}
                <div className="flex-grow grid grid-cols-2 gap-6 min-h-0">
                    {/* Left: Traits */}
                    <div className="flex flex-col h-full overflow-hidden">
                        <h3 className="text-[10px] font-bold text-slate-500 tracking-widest mb-3 uppercase border-b border-slate-800 pb-1">Key Traits</h3>
                        <div className="flex flex-wrap gap-2 content-start overflow-y-auto scrollbar-hide pr-1">
                        {details.traits.map(trait => (
                            <span 
                                key={trait} 
                                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${activeStyles.border} ${activeStyles.text} ${activeStyles.lightBg} transition-colors cursor-default whitespace-nowrap`}
                            >
                                {trait}
                            </span>
                        ))}
                        </div>
                    </div>

                    {/* Right: Dichotomies */}
                    <div className="flex flex-col h-full overflow-hidden">
                        <h3 className="text-[10px] font-bold text-slate-500 tracking-widest mb-3 uppercase text-right border-b border-slate-800 pb-1">Dichotomies</h3>
                        <div className="flex flex-col justify-start gap-3 overflow-y-auto scrollbar-hide">
                        {renderDichotomy("Introversion (I)", "Extraversion (E)", details.dichotomyValues.ie)}
                        {renderDichotomy("Sensing (S)", "Intuition (N)", details.dichotomyValues.sn)}
                        {renderDichotomy("Thinking (T)", "Feeling (F)", details.dichotomyValues.tf)}
                        {renderDichotomy("Judging (J)", "Perceiving (P)", details.dichotomyValues.jp)}
                        </div>
                    </div>
                </div>

                {/* Quote - Compact */}
                <div className="text-sm italic text-slate-400 text-center leading-relaxed opacity-80 px-8 font-serif shrink-0 border-t border-slate-800/50 pt-4">
                    "{details.quote}"
                </div>
            </div>

            {/* Bottom Validation Section - Compact & Integrated */}
            <div className="px-6 py-5 border-t border-slate-700/60 bg-slate-900/60 backdrop-blur-xl shrink-0 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                   <h3 className="font-bold text-white text-sm uppercase tracking-wide">Validate Profile</h3>
                   <span 
                     className="font-bold text-xs transition-colors duration-300 bg-slate-800 px-2 py-1 rounded"
                     style={{ color: `hsl(${Math.round((confidence / 100) * 120)}, 100%, 50%)` }}
                   >
                     Confidence: {confidence}%
                   </span>
                </div>

                <div className="min-h-[3rem] flex items-center justify-center text-center px-2">
                   <p className="text-white text-base font-medium leading-snug">
                      {currentQuestion}
                   </p>
                </div>
                
                <div>
                   {/* Labels */}
                   <div className="flex justify-between text-[9px] text-slate-500 mb-2 uppercase tracking-wider font-bold px-1">
                       <span>Strongly Disagree</span>
                       <span>Strongly Agree</span>
                   </div>
                   
                   {/* 5-Circle Meter */}
                   <div className="flex justify-between items-center px-1">
                       {[1, 2, 3, 4, 5].map((val) => {
                           // Determine styles based on value
                           let sizeClass = "w-10 h-10"; // Default (Moderate)
                           if (val === 1 || val === 5) sizeClass = "w-12 h-12"; // Extremes
                           if (val === 3) sizeClass = "w-8 h-8"; // Neutral

                           let colorClass = "border-slate-600 hover:border-slate-400 text-slate-500 bg-slate-800/50";
                           
                           if (val === 1) { // Strong Disagree
                               colorClass = "border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500";
                           } else if (val === 2) { // Disagree
                               colorClass = "border-red-400/30 text-red-400 hover:bg-red-400/50 hover:text-white hover:border-red-400";
                           } else if (val === 3) { // Neutral
                               colorClass = "border-slate-500 text-slate-400 hover:bg-slate-500 hover:text-white hover:border-slate-500";
                           } else if (val === 4) { // Agree
                               colorClass = "border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/50 hover:text-white hover:border-emerald-400";
                           } else if (val === 5) { // Strong Agree
                               colorClass = "border-emerald-500/50 text-emerald-500 hover:bg-emerald-500 hover:text-white hover:border-emerald-500";
                           }

                           return (
                               <button
                                   key={val}
                                   onClick={() => {
                                       setSliderVal(val);
                                       setTimeout(() => handleNext(val), 200);
                                   }}
                                   className={`
                                       rounded-full border-2 flex items-center justify-center transition-all duration-200 
                                       ${sizeClass} ${colorClass} shadow-sm
                                   `}
                               >
                                   <span className="material-symbols-outlined text-base">
                                       {val === 3 ? 'remove' : (val > 3 ? 'check' : 'close')}
                                   </span>
                               </button>
                           );
                       })}
                   </div>
                </div>

                <button 
                onClick={() => onConfirm(selectedType.code)}
                className={`w-full bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold py-3 rounded-lg shadow-md transition-all border border-slate-600 text-sm tracking-wide uppercase`}
                >
                Confirm & Select Profile
                </button>
            </div>
        </aside>
      )}
    </div>
  );
};

export default MBTIOverlay;
