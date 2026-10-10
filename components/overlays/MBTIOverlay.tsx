import React, { useState, useEffect, useMemo } from 'react';
import { MBTIType } from '../../types';
import { MBTI_TYPES } from '../../constants';
import { TYPE_DETAILS, AVATAR_URLS, TRAIT_DEFINITIONS, BEHAVIOR_DEFINITIONS, WEAKNESS_DEFINITIONS } from '../../data/mbtiData';
import { groupColor } from '../../utils/groupColor';

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

  const accent = selectedType ? groupColor(selectedType.code) : null;

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
        className={`w-20 truncate ${align === 'right' ? 'text-right' : 'text-left'} leading-none`}
        style={{ color: isActive && accent ? accent : 'var(--ink2)' }}
      >
        {text}
      </div>
    );

    return (
      <div className="flex items-center justify-between text-xs py-1 w-full">
        <LabelDisplay text={labelLeft} isActive={isLeft} align="right" />

        <div className="mx-3 flex-grow h-1.5 bg-[var(--paper2)] border border-[var(--rule)] relative overflow-hidden">
          {/* Center marker */}
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[var(--rule)] z-10 -translate-x-1/2"></div>
          {/* Value Bar */}
          <div
            className="absolute top-0 bottom-0 transition-all duration-500 ease-out"
            style={{ left: barLeft, width: barWidth, backgroundColor: accent ?? 'var(--ink2)' }}
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
        className="absolute inset-0 transition-all"
        style={{ backgroundColor: 'var(--veil)' }}
        onClick={selectedType ? () => setSelectedType(null) : onClose}
      ></div>

      {/* Grid Content Container */}
      <div className={`relative z-10 flex-grow flex flex-col items-center justify-center p-4 overflow-y-auto scrollbar-hide transition-all duration-500 ${selectedType ? 'pointer-events-none' : ''}`}>
        <div className={`w-full max-w-5xl flex flex-col items-center animate-fade-in my-auto px-6 py-8 ${selectedType ? '[&>*]:opacity-40' : ''}`} style={{ backgroundColor: 'var(--paper)', border: '1px solid var(--ink)' }}>
          <h2 className="display mb-8 text-center">Select Your <em>MBTI</em> Type</h2>

          <div className="grid grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {MBTI_TYPES.map((type) => {
              const color = groupColor(type.code);
              return (
                <button
                  key={type.code}
                  onClick={() => handleTypeClick(type)}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-[1.6px] flex flex-col items-center justify-center transition-colors duration-300 hover:bg-[var(--paper2)]"
                  style={{ borderColor: color, backgroundColor: 'var(--paper)' }}
                >
                  <span className="font-label text-sm sm:text-base font-semibold tracking-[0.08em] text-[var(--ink)]">{type.code}</span>
                  <span className="font-display text-[13px] sm:text-[15px] font-semibold mt-0.5 text-[var(--ink)]">{type.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Sidebar for Type Details */}
      {selectedType && accent && (
        <aside 
          className="fixed top-0 right-0 h-full w-full max-w-[500px] z-50 border-l overflow-hidden animate-slide-in-right flex flex-col"
          style={{
            backgroundColor: 'var(--paper)',
            borderColor: 'var(--ink)'
          }}
        >
          {/* Header - Compact */}
          <header 
            className="flex items-center justify-between px-6 py-3 shrink-0 border-b"
            style={{ borderColor: 'var(--rule)' }}
          >
            <h2 className="font-display text-2xl font-semibold truncate">About {selectedType.code} - {selectedType.name}</h2>
            <button
              onClick={() => setSelectedType(null)}
              className="p-1.5 text-[var(--ink2)] hover:text-[var(--ink)] transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </header>

          {/* Top Content Area - Flexible Height */}
          <div className="flex-grow flex flex-col px-6 py-4 overflow-hidden gap-4">

            {/* Profile Identity - Hero */}
            <div 
              className="flex items-center gap-5 shrink-0 border-b pb-4"
              style={{ borderColor: 'var(--rule)' }}
            >
              <div 
                className="w-28 h-28 rounded-full flex items-center justify-center shrink-0 overflow-hidden border-[1.6px]"
                style={{ backgroundColor: 'var(--paper2)', borderColor: accent }}
              >
                <img
                  src={AVATAR_URLS[selectedType.code] || AVATAR_URLS.INTJ}
                  alt={`${selectedType.name} avatar`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-[14.5px] text-[var(--ink)] leading-relaxed">
                  {details.description}
                </p>
                <div className="font-display text-base italic text-[var(--ink2)] border-l-2 border-[var(--rule)] pl-3">
                  "{details.quote}"
                </div>
              </div>
            </div>

            {/* Fixed Info Panel Area - Shows category information */}
            {clickedSection && (
              <div className="shrink-0 mb-4 animate-fade-in">
                <div 
                  className="p-3 border relative max-h-[200px] overflow-y-auto scrollbar-hide"
                  style={{ 
                    backgroundColor: 'var(--paper2)',
                    borderColor: 'var(--rule)'
                  }}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <span className="material-symbols-outlined text-lg text-[var(--ink2)] shrink-0">
                      {clickedSection === 'traits' ? 'psychology' : clickedSection === 'dichotomies' ? 'info' : clickedSection === 'behaviors' ? 'psychology_alt' : 'warning'}
                    </span>
                    <h4 className="font-display text-lg font-semibold flex-1">
                      {clickedSection === 'traits' && 'Key Traits Definitions'}
                      {clickedSection === 'dichotomies' && 'MBTI Dichotomies Explained'}
                      {clickedSection === 'behaviors' && 'Common Behaviors Explained'}
                      {clickedSection === 'weaknesses' && 'Weaknesses Explained'}
                    </h4>
                    <button
                      onClick={() => setClickedSection(null)}
                      className="shrink-0 text-[var(--ink2)] hover:text-[var(--ink)] transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                  <div className="space-y-2 text-[13px]">
                    {clickedSection === 'traits' && details.traits.map(trait => (
                      <div key={trait} className="border-l-2 border-[var(--rule)] pl-2">
                        <p className="font-semibold text-[var(--ink)]">{trait}</p>
                        <p className="text-[var(--ink)] leading-relaxed">{TRAIT_DEFINITIONS[trait] || trait}</p>
                      </div>
                    ))}
                    {clickedSection === 'dichotomies' && (
                      <>
                        <div className="border-l-2 border-[var(--rule)] pl-2">
                          <p className="font-semibold text-[var(--ink)]">Introversion (I) vs Extraversion (E)</p>
                          <p className="text-[var(--ink)] leading-relaxed mb-1">{DICHOTOMY_DEFINITIONS["Introversion (I)"]}</p>
                          <p className="text-[var(--ink)] leading-relaxed">{DICHOTOMY_DEFINITIONS["Extraversion (E)"]}</p>
                        </div>
                        <div className="border-l-2 border-[var(--rule)] pl-2">
                          <p className="font-semibold text-[var(--ink)]">Sensing (S) vs Intuition (N)</p>
                          <p className="text-[var(--ink)] leading-relaxed mb-1">{DICHOTOMY_DEFINITIONS["Sensing (S)"]}</p>
                          <p className="text-[var(--ink)] leading-relaxed">{DICHOTOMY_DEFINITIONS["Intuition (N)"]}</p>
                        </div>
                        <div className="border-l-2 border-[var(--rule)] pl-2">
                          <p className="font-semibold text-[var(--ink)]">Thinking (T) vs Feeling (F)</p>
                          <p className="text-[var(--ink)] leading-relaxed mb-1">{DICHOTOMY_DEFINITIONS["Thinking (T)"]}</p>
                          <p className="text-[var(--ink)] leading-relaxed">{DICHOTOMY_DEFINITIONS["Feeling (F)"]}</p>
                        </div>
                        <div className="border-l-2 border-[var(--rule)] pl-2">
                          <p className="font-semibold text-[var(--ink)]">Judging (J) vs Perceiving (P)</p>
                          <p className="text-[var(--ink)] leading-relaxed mb-1">{DICHOTOMY_DEFINITIONS["Judging (J)"]}</p>
                          <p className="text-[var(--ink)] leading-relaxed">{DICHOTOMY_DEFINITIONS["Perceiving (P)"]}</p>
                        </div>
                      </>
                    )}
                    {clickedSection === 'behaviors' && details.commonBehaviors.map(behavior => (
                      <div key={behavior} className="border-l-2 border-[var(--rule)] pl-2">
                        <p className="font-semibold text-[var(--ink)]">{behavior}</p>
                        <p className="text-[var(--ink)] leading-relaxed">{BEHAVIOR_DEFINITIONS[behavior] || behavior}</p>
                      </div>
                    ))}
                    {clickedSection === 'weaknesses' && details.weaknesses.map(weakness => (
                      <div key={weakness} className="border-l-2 border-[var(--seal)] pl-2">
                        <p className="font-semibold text-[var(--ink)]">{weakness}</p>
                        <p className="text-[var(--ink)] leading-relaxed">{WEAKNESS_DEFINITIONS[weakness] || weakness}</p>
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
                <div className="flex items-center justify-between border-b border-[var(--rule)] pb-1">
                  <h3 className="label !text-[10px]" style={{ color: accent }}>Key Traits</h3>
                  <button
                    onClick={() => setClickedSection(clickedSection === 'traits' ? null : 'traits')}
                    className={`hover:text-[var(--ink)] transition-colors ${clickedSection === 'traits' ? 'text-[var(--ink)]' : 'text-[var(--ink2)]'}`}
                  >
                    <span className="material-symbols-outlined text-sm">help</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {details.traits.map(trait => (
                    <span
                      key={trait}
                      className="px-2.5 py-0.5 rounded-full text-[12px] border whitespace-nowrap"
                      style={{ borderColor: accent, color: 'var(--ink)' }}
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>

              {/* Dichotomies */}
              <div className="col-span-1 flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-[var(--rule)] pb-1">
                  <h3 className="label !text-[10px]" style={{ color: accent }}>Dichotomies</h3>
                  <button
                    onClick={() => setClickedSection(clickedSection === 'dichotomies' ? null : 'dichotomies')}
                    className={`hover:text-[var(--ink)] transition-colors ${clickedSection === 'dichotomies' ? 'text-[var(--ink)]' : 'text-[var(--ink2)]'}`}
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
                <div className="flex items-center justify-between border-b border-[var(--rule)] pb-1">
                  <h3 className="label !text-[10px]">Common Behaviors</h3>
                  <button
                    onClick={() => setClickedSection(clickedSection === 'behaviors' ? null : 'behaviors')}
                    className={`hover:text-[var(--ink)] transition-colors ${clickedSection === 'behaviors' ? 'text-[var(--ink)]' : 'text-[var(--ink2)]'}`}
                  >
                    <span className="material-symbols-outlined text-sm">help</span>
                  </button>
                </div>
                <ul className="space-y-1">
                  {details.commonBehaviors.map(b => (
                    <li 
                      key={b} 
                      className="text-[13px] text-[var(--ink)] flex items-start gap-2"
                    >
                      <span className="material-symbols-outlined text-[14px] text-[var(--ink2)]">psychology_alt</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses */}
              <div className="col-span-1 flex flex-col gap-2 mt-2">
                <div className="flex items-center justify-between border-b border-[var(--rule)] pb-1">
                  <h3 className="label !text-[10px] !text-[var(--seal)]">Weaknesses</h3>
                  <button
                    onClick={() => setClickedSection(clickedSection === 'weaknesses' ? null : 'weaknesses')}
                    className={`hover:text-[var(--ink)] transition-colors ${clickedSection === 'weaknesses' ? 'text-[var(--ink)]' : 'text-[var(--ink2)]'}`}
                  >
                    <span className="material-symbols-outlined text-sm">help</span>
                  </button>
                </div>
                <ul className="space-y-1">
                  {details.weaknesses.map(w => (
                    <li 
                      key={w} 
                      className="text-[13px] text-[var(--ink)] flex items-start gap-2"
                    >
                      <span className="material-symbols-outlined text-[14px] text-[var(--seal)]">cancel</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>

          {/* Bottom Validation Section - Compact & Integrated */}
          <div 
            className="px-6 py-5 border-t shrink-0 flex flex-col gap-4"
            style={{ 
              backgroundColor: 'var(--paper)',
              borderColor: 'var(--rule)'
            }}
          >
            <div className="flex justify-between items-center">
              <h3 className="label">Validate Profile</h3>
              <span
                className="font-label text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink)]"
              >
                Confidence: {confidence}%
              </span>
            </div>

            <div className="min-h-[3rem] flex items-center justify-center text-center px-2">
              <p className={`font-display italic text-xl leading-snug transition-opacity duration-300 ${isQuestionVisible ? 'opacity-100' : 'opacity-0'}`}>
                {currentQuestion}
              </p>
            </div>

            <div>
              {/* Labels */}
              <div className="flex justify-between text-[12px] italic text-[var(--ink2)] mb-2 px-1">
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

                  const colorClass = "border-[var(--ink2)] text-[var(--ink2)] hover:bg-[var(--seal)] hover:border-[var(--seal)] hover:text-[var(--on-seal)]";

                  return (
                    <button
                      key={val}
                      onClick={() => {
                        setSliderVal(val);
                        setTimeout(() => handleNext(val), 200);
                      }}
                      className={`
                                       rounded-full border flex items-center justify-center transition-all duration-200
                                       ${sizeClass} ${colorClass}
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
              className="btn-seal w-full"
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
