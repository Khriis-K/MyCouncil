import React, { useState, useEffect, useMemo } from 'react';
import { MBTIType } from '../../types';
import { MBTI_TYPES } from '../../constants';
import { TYPE_DETAILS, AVATAR_URLS, TRAIT_DEFINITIONS, BEHAVIOR_DEFINITIONS, WEAKNESS_DEFINITIONS } from '../../data/mbtiData';

interface MBTIOverlayProps {
  onClose: () => void;
  onConfirm: (code: string) => void;
}

const MBTIOverlay: React.FC<MBTIOverlayProps> = ({ onClose, onConfirm }) => {
  const [selectedType, setSelectedType] = useState<MBTIType | null>(null);

  // Validation State
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [seenIndices, setSeenIndices] = useState<Set<number>>(new Set());
  const [confidence, setConfidence] = useState(50);
  const [sliderVal, setSliderVal] = useState(3); // Default to Neutral (3)
  const [isQuestionVisible, setIsQuestionVisible] = useState(true);
  
  // Click info state
  const [clickedSection, setClickedSection] = useState<'traits' | 'dichotomies' | 'behaviors' | 'weaknesses' | null>(null);

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
      setConfidence(50);
      setSliderVal(3); // Reset to Neutral
      setSeenIndices(new Set());

      // Pick Initial Question
      const firstQIndex = Math.floor(Math.random() * allQuestions.length);
      setCurrentQuestion(allQuestions[firstQIndex]);
      setSeenIndices(new Set([firstQIndex]));

      setIsQuestionVisible(false);
      setTimeout(() => setIsQuestionVisible(true), 100);
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

    setIsQuestionVisible(false);

    setTimeout(() => {
      // Get Next Question Logic
      const { text, index, shouldReset } = getRandomQuestion(seenIndices);

      setCurrentQuestion(text);
      setSliderVal(3); // Reset slider to Neutral

      if (shouldReset) {
        setSeenIndices(new Set([index]));
      } else {
        setSeenIndices(prev => new Set(prev).add(index));
      }
      setIsQuestionVisible(true);
    }, 300);
  };

  // Simple definitions for the tooltips
  const DICHOTOMY_DEFINITIONS: Record<string, string> = {
    "Introversion (I)": "Gains energy from solitary reflection and internal ideas.",
    "Extraversion (E)": "Gains energy from social interaction and the external world.",
    "Sensing (S)": "Focuses on facts, details, and present reality.",
    "Intuition (N)": "Focuses on patterns, possibilities, and the future.",
    "Thinking (T)": "Makes decisions based on logic and objective analysis.",
    "Feeling (F)": "Makes decisions based on values and impact on people.",
    "Judging (J)": "Prefers structure, plans, and closure.",
    "Perceiving (P)": "Prefers flexibility, spontaneity, and keeping options open."
  };

  const renderDichotomy = (labelLeft: string, labelRight: string, value: number) => {
    // Value is 0 (Left) to 100 (Right)
    const isLeft = value < 50;
    const distanceFromCenter = Math.abs(value - 50);

    const barLeft = isLeft ? `${value}%` : '50%';
    const barWidth = `${distanceFromCenter}%`;

    const LabelDisplay = ({ text, isActive, align }: { text: string, isActive: boolean, align: 'left' | 'right' }) => (
      <div 
        className={`w-20 truncate ${align === 'right' ? 'text-right' : 'text-left'} font-medium leading-none ${isActive && activeStyles ? activeStyles.text : 'text-slate-500'}`}
      >
        {text}
      </div>
    );

    return (
      <div className="flex items-center justify-between text-xs py-1 w-full">
        <LabelDisplay text={labelLeft} isActive={isLeft} align="right" />

        <div className="mx-3 flex-grow h-2 bg-slate-800 rounded-full relative overflow-hidden">
          {/* Center marker */}
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-slate-700 z-10 -translate-x-1/2"></div>
          {/* Value Bar */}
          <div
            className={`absolute top-0 bottom-0 rounded-full transition-all duration-500 ease-out ${activeStyles ? activeStyles.barColor : 'bg-slate-400'}`}
            style={{ left: barLeft, width: barWidth }}
          ></div>
        </div>

        <LabelDisplay text={labelRight} isActive={!isLeft} align="left" />
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
          <div className="flex-grow flex flex-col px-6 py-4 overflow-hidden gap-4">

            {/* Profile Identity - Hero */}
            <div className="flex items-center gap-5 shrink-0 border-b border-slate-800/50 pb-4">
              <div className={`w-28 h-28 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border-2 ${activeStyles.border} bg-slate-800/50 shadow-lg`}>
                <img
                  src={AVATAR_URLS[selectedType.code] || AVATAR_URLS.INTJ}
                  alt={`${selectedType.name} avatar`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm text-slate-300 leading-relaxed font-light">
                  {details.description}
                </p>
                <div className="text-xs italic text-slate-400 font-serif border-l-2 border-slate-700 pl-3">
                  "{details.quote}"
                </div>
              </div>
            </div>

            {/* Fixed Info Panel Area - Shows category information */}
            {clickedSection && (
              <div className="shrink-0 mb-4 animate-fade-in">
                <div className="p-3 bg-slate-800/80 border border-slate-600 rounded-lg shadow-lg relative max-h-[200px] overflow-y-auto scrollbar-hide">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="material-symbols-outlined text-lg text-cyan-400 shrink-0">
                      {clickedSection === 'traits' ? 'psychology' : clickedSection === 'dichotomies' ? 'info' : clickedSection === 'behaviors' ? 'psychology_alt' : 'warning'}
                    </span>
                    <h4 className="text-sm font-bold text-white flex-1">
                      {clickedSection === 'traits' && 'Key Traits Definitions'}
                      {clickedSection === 'dichotomies' && 'MBTI Dichotomies Explained'}
                      {clickedSection === 'behaviors' && 'Common Behaviors Explained'}
                      {clickedSection === 'weaknesses' && 'Weaknesses Explained'}
                    </h4>
                    <button
                      onClick={() => setClickedSection(null)}
                      className="shrink-0 text-slate-400 hover:text-white transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    {clickedSection === 'traits' && details.traits.map(trait => (
                      <div key={trait} className="border-l-2 border-cyan-400 pl-2">
                        <p className="font-semibold text-white">{trait}</p>
                        <p className="text-slate-300 leading-relaxed">{TRAIT_DEFINITIONS[trait] || trait}</p>
                      </div>
                    ))}
                    {clickedSection === 'dichotomies' && (
                      <>
                        <div className="border-l-2 border-cyan-400 pl-2">
                          <p className="font-semibold text-white">Introversion (I) vs Extraversion (E)</p>
                          <p className="text-slate-300 leading-relaxed mb-1">{DICHOTOMY_DEFINITIONS["Introversion (I)"]}</p>
                          <p className="text-slate-300 leading-relaxed">{DICHOTOMY_DEFINITIONS["Extraversion (E)"]}</p>
                        </div>
                        <div className="border-l-2 border-cyan-400 pl-2">
                          <p className="font-semibold text-white">Sensing (S) vs Intuition (N)</p>
                          <p className="text-slate-300 leading-relaxed mb-1">{DICHOTOMY_DEFINITIONS["Sensing (S)"]}</p>
                          <p className="text-slate-300 leading-relaxed">{DICHOTOMY_DEFINITIONS["Intuition (N)"]}</p>
                        </div>
                        <div className="border-l-2 border-cyan-400 pl-2">
                          <p className="font-semibold text-white">Thinking (T) vs Feeling (F)</p>
                          <p className="text-slate-300 leading-relaxed mb-1">{DICHOTOMY_DEFINITIONS["Thinking (T)"]}</p>
                          <p className="text-slate-300 leading-relaxed">{DICHOTOMY_DEFINITIONS["Feeling (F)"]}</p>
                        </div>
                        <div className="border-l-2 border-cyan-400 pl-2">
                          <p className="font-semibold text-white">Judging (J) vs Perceiving (P)</p>
                          <p className="text-slate-300 leading-relaxed mb-1">{DICHOTOMY_DEFINITIONS["Judging (J)"]}</p>
                          <p className="text-slate-300 leading-relaxed">{DICHOTOMY_DEFINITIONS["Perceiving (P)"]}</p>
                        </div>
                      </>
                    )}
                    {clickedSection === 'behaviors' && details.commonBehaviors.map(behavior => (
                      <div key={behavior} className="border-l-2 border-blue-400 pl-2">
                        <p className="font-semibold text-white">{behavior}</p>
                        <p className="text-slate-300 leading-relaxed">{BEHAVIOR_DEFINITIONS[behavior] || behavior}</p>
                      </div>
                    ))}
                    {clickedSection === 'weaknesses' && details.weaknesses.map(weakness => (
                      <div key={weakness} className="border-l-2 border-red-400 pl-2">
                        <p className="font-semibold text-white">{weakness}</p>
                        <p className="text-slate-300 leading-relaxed">{WEAKNESS_DEFINITIONS[weakness] || weakness}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Content Grid - 2 Columns */}
            <div className="flex-grow grid grid-cols-2 gap-x-6 gap-y-4 overflow-y-auto scrollbar-hide content-start">

              {/* Traits */}
              <div className="col-span-1 flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                  <h3 className={`text-[10px] font-bold tracking-widest uppercase ${activeStyles.text}`}>Key Traits</h3>
                  <button
                    onClick={() => setClickedSection(clickedSection === 'traits' ? null : 'traits')}
                    className={`text-slate-500 hover:text-cyan-400 transition-colors ${clickedSection === 'traits' ? 'text-cyan-400' : ''}`}
                  >
                    <span className="material-symbols-outlined text-sm">help</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {details.traits.map(trait => (
                    <span
                      key={trait}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${activeStyles.border} ${activeStyles.text} ${activeStyles.lightBg} whitespace-nowrap`}
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>

              {/* Dichotomies */}
              <div className="col-span-1 flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                  <h3 className={`text-[10px] font-bold tracking-widest uppercase ${activeStyles.text}`}>Dichotomies</h3>
                  <button
                    onClick={() => setClickedSection(clickedSection === 'dichotomies' ? null : 'dichotomies')}
                    className={`text-slate-500 hover:text-cyan-400 transition-colors ${clickedSection === 'dichotomies' ? 'text-cyan-400' : ''}`}
                  >
                    <span className="material-symbols-outlined text-sm">help</span>
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {renderDichotomy("Introversion (I)", "Extraversion (E)", details.dichotomyValues.ie)}
                  {renderDichotomy("Sensing (S)", "Intuition (N)", details.dichotomyValues.sn)}
                  {renderDichotomy("Thinking (T)", "Feeling (F)", details.dichotomyValues.tf)}
                  {renderDichotomy("Judging (J)", "Perceiving (P)", details.dichotomyValues.jp)}
                </div>
              </div>

              {/* Common Behaviors */}
              <div className="col-span-1 flex flex-col gap-2 mt-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                  <h3 className="text-[10px] font-bold text-blue-500/70 tracking-widest uppercase">Common Behaviors</h3>
                  <button
                    onClick={() => setClickedSection(clickedSection === 'behaviors' ? null : 'behaviors')}
                    className={`text-slate-500 hover:text-cyan-400 transition-colors ${clickedSection === 'behaviors' ? 'text-cyan-400' : ''}`}
                  >
                    <span className="material-symbols-outlined text-sm">help</span>
                  </button>
                </div>
                <ul className="space-y-1">
                  {details.commonBehaviors.map(b => (
                    <li 
                      key={b} 
                      className="text-xs text-slate-300 flex items-start gap-2"
                    >
                      <span className="material-symbols-outlined text-[14px] text-blue-400">psychology_alt</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses */}
              <div className="col-span-1 flex flex-col gap-2 mt-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                  <h3 className="text-[10px] font-bold text-red-500/70 tracking-widest uppercase">Weaknesses</h3>
                  <button
                    onClick={() => setClickedSection(clickedSection === 'weaknesses' ? null : 'weaknesses')}
                    className={`text-slate-500 hover:text-cyan-400 transition-colors ${clickedSection === 'weaknesses' ? 'text-cyan-400' : ''}`}
                  >
                    <span className="material-symbols-outlined text-sm">help</span>
                  </button>
                </div>
                <ul className="space-y-1">
                  {details.weaknesses.map(w => (
                    <li 
                      key={w} 
                      className="text-xs text-slate-300 flex items-start gap-2"
                    >
                      <span className="material-symbols-outlined text-[14px] text-red-500">cancel</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>

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
              <p className={`text-white text-base font-medium leading-snug transition-opacity duration-300 ${isQuestionVisible ? 'opacity-100' : 'opacity-0'}`}>
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
