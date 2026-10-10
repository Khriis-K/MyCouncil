
import React, { useState, useRef, useEffect } from 'react';
import { MBTI_TYPES, REFLECTION_FOCUS_OPTIONS } from '../constants';
import { ReflectionFocus } from '../types';
import { formatSittingDate } from '../utils/sittingDate';

type ThemeMode = 'light' | 'dark' | 'amoled';

const THEME_MODES: { id: ThemeMode; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'amoled', label: 'OLED' },
];

// Shared look for the setup fields: flat paper, ruled border, square corners.
const fieldClass = 'w-full border p-3 text-[15px] bg-paper2 text-ink focus:outline-none focus:border-ink';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  dilemma: string;
  setDilemma: (val: string) => void;
  selectedMBTI: string | null;
  councilSize: number;
  setCouncilSize: (val: number) => void;
  reflectionFocus: ReflectionFocus;
  setReflectionFocus: (val: ReflectionFocus) => void;
  onOpenMBTI: () => void;
  onSelectMBTI: (val: string) => void;
  onSummon: () => void;
  onRestart: () => void;
  isGenerating?: boolean;
  isMBTIOverlayOpen?: boolean;
  isHighlighted?: boolean;
  hasCouncil?: boolean;
  theme: ThemeMode;
  setThemeMode: (theme: ThemeMode) => void;
  estimatedLoadDuration?: number;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  toggleSidebar,
  dilemma,
  setDilemma,
  selectedMBTI,
  councilSize,
  setCouncilSize,
  reflectionFocus,
  setReflectionFocus,
  onOpenMBTI,
  onSelectMBTI,
  onSummon,
  onRestart,
  isGenerating = false,
  isMBTIOverlayOpen = false,
  isHighlighted = false,
  hasCouncil = false,
  theme,
  setThemeMode,
  estimatedLoadDuration = 0 // Provide a default value
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [currentProgress, setCurrentProgress] = useState(0);
  const animationFrameId = useRef<number | null>(null);
  const [sittingDate] = useState(() => formatSittingDate(new Date()));

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isGenerating && estimatedLoadDuration) {
      setCurrentProgress(0); // Reset progress

      const startTime = performance.now();
      const targetProgress = 95; // Stop just short of 100% to allow instant completion

      const animateProgress = (currentTime: number) => {
        const elapsedTime = currentTime - startTime;
        let progress = (elapsedTime / estimatedLoadDuration) * targetProgress;

        if (progress >= targetProgress) {
          progress = targetProgress;
          if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
          }
        }
        setCurrentProgress(progress);

        if (progress < targetProgress) {
          animationFrameId.current = requestAnimationFrame(animateProgress);
        }
      };

      animationFrameId.current = requestAnimationFrame(animateProgress);

      return () => {
        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
        }
      };
    } else if (!isGenerating) {
      // If generation stops, immediately complete the progress bar
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      setCurrentProgress(100); // Instantly fill to 100%
      // After a short delay, reset to 0 for next generation
      const resetTimer = setTimeout(() => setCurrentProgress(0), 500);
      return () => clearTimeout(resetTimer);
    }
  }, [isGenerating, estimatedLoadDuration]);

  useEffect(() => {
    if (isHighlighted && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isHighlighted]);

  const getMBTIDisplay = () => {
    if (!selectedMBTI || selectedMBTI === 'BALANCED') return 'Balanced (Default)';
    const type = MBTI_TYPES.find(t => t.code === selectedMBTI);
    return type ? `${type.code} - ${type.name}` : selectedMBTI;
  };

  const handleCognitiveStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'TRIGGER') {
      onOpenMBTI();
    } else {
      onSelectMBTI(val);
    }
  };

  const handleReflectionFocusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFocus = e.target.value as ReflectionFocus;
    setReflectionFocus(newFocus);
  };

  const currentFocusOption = REFLECTION_FOCUS_OPTIONS.find(opt => opt.value === reflectionFocus);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-[55] bg-veil"
          
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-[60] transition-all duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } bg-paper ${isMobile ? 'w-screen' : 'w-[var(--sidebar-width)] max-w-[360px] border-r border-rule'}`}
      >
        <div className="p-6 space-y-8 flex-grow overflow-y-auto scrollbar-hide">
          {/* Masthead */}
          <header className="space-y-3 pb-5 border-b border-rule">
            <h1 className="wordmark">My<em>Council</em></h1>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="docket">{sittingDate}</span>
              <div className="flex gap-3" role="group" aria-label="Theme">
                {THEME_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setThemeMode(mode.id)}
                    aria-pressed={theme === mode.id}
                    className={`caps !text-[11px] underline-offset-[3px] ${theme === mode.id ? 'text-ink underline' : 'text-ink2'}`}
                    title={`Switch to ${mode.label} mode`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <div className="space-y-6">
            {/* Dilemma Input */}
            <div>
              <label htmlFor="dilemma" className="label block mb-2">
                What's on your mind? <span className="font-body italic font-normal normal-case tracking-normal text-[13px]">(Your Dilemma)</span>
              </label>
              <textarea
                ref={textareaRef}
                id="dilemma"
                rows={5}
                className={`${fieldClass} border-rule resize-none transition-all ${isHighlighted ? 'ring-2 ring-seal' : ''} ${hasCouncil ? 'opacity-50 cursor-not-allowed' : ''}`}
                placeholder="I've been offered a new job in a different city. It's a great career opportunity but..."
                value={dilemma}
                onChange={(e) => setDilemma(e.target.value)}
                disabled={isGenerating || hasCouncil}
              />
            </div>

            {/* Focus Dropdown */}
            <div>
              <label className="label block mb-2">Reflection Focus</label>
              <div className="relative">
                <select
                  value={reflectionFocus}
                  onChange={handleReflectionFocusChange}
                  disabled={hasCouncil}
                  className={`${fieldClass} appearance-none border-rule ${hasCouncil ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {REFLECTION_FOCUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-sm text-ink2">
                  expand_more
                </span>
              </div>
              {currentFocusOption && (
                <p className="text-[13px] italic mt-2 animate-fade-in text-ink2">
                  {currentFocusOption.description}
                </p>
              )}
            </div>

            {/* Cognitive Style Dropdown */}
            <div>
              <label className="label block mb-2">Your Cognitive Style</label>
              <div className="relative">
                <select
                  value={isMBTIOverlayOpen ? 'TRIGGER' : (selectedMBTI === 'BALANCED' ? 'BALANCED' : (selectedMBTI || 'BALANCED'))}
                  onChange={handleCognitiveStyleChange}
                  disabled={hasCouncil}
                  className={`${fieldClass} appearance-none ${selectedMBTI && selectedMBTI !== 'BALANCED' ? 'border-ink' : 'border-rule'} ${hasCouncil ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <option value="BALANCED">Balanced (Default)</option>
                  {selectedMBTI && selectedMBTI !== 'BALANCED' && (
                    <option value={selectedMBTI}>{getMBTIDisplay()}</option>
                  )}
                  <option value="TRIGGER">Select MBTI Type...</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-sm text-ink2">
                  expand_more
                </span>
              </div>
            </div>

            {/* Council Size Linear Scale */}
            <div>
              <div className="flex items-baseline justify-between mb-4">
                <label className="label block">
                  Council Size
                </label>
                <span className="text-[13px] italic text-ink2">
                  {councilSize} Counselors
                </span>
              </div>

              <div className="relative h-12 flex items-center select-none">
                {/* Track Lines */}
                <div className="absolute left-0 right-0 h-px z-0 bg-rule"></div>
                <div
                  className="absolute left-0 h-px z-0 transition-all duration-300 ease-out bg-ink"
                  style={{ width: `${((councilSize - 3) / 4) * 100}%` }}
                ></div>

                {/* Steps */}
                <div className="relative w-full flex justify-between z-10 px-[2px]">
                  {[3, 4, 5, 6, 7].map((size) => (
                    <button
                      key={size}
                      onClick={() => !hasCouncil && setCouncilSize(size)}
                      disabled={hasCouncil}
                      className={`w-[30px] h-[30px] rounded-full flex items-center justify-center font-display text-[17px] border transition-colors duration-200 ${
                        size === councilSize ? 'bg-ink border-ink text-paper'
                        : size < councilSize ? 'bg-paper border-ink text-ink'
                        : 'bg-paper border-rule text-ink2'
                      } ${hasCouncil ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              <div className="label !text-[10px] flex justify-between px-1">
                <span>Min</span>
                <span>Max</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Summon/Restart Button */}
        <div className="p-6 border-t border-rule">
          {!hasCouncil ? (
            <button
              onClick={onSummon}
              disabled={isGenerating}
              className={`btn-seal relative overflow-hidden w-full flex items-center justify-center disabled:!opacity-100 ${isGenerating ? '!bg-paper2 !text-ink2 outline outline-1 -outline-offset-1 outline-rule' : ''}`}
            >
              {/* Progressive Loading Bar */}
              {isGenerating && (
                <div
                  className="absolute left-0 top-0 bottom-0 transition-all ease-out bg-rule"
                  style={{
                    width: `${currentProgress}%`,
                    transitionDuration: `${estimatedLoadDuration || 0}ms`, // Use estimated duration for CSS transition
                  }}
                />
              )}

              <div className="relative z-10 flex items-center">
                {isGenerating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-ink2 border-t-transparent rounded-full animate-spin mr-2"></span>
                    Consulting...
                  </>
                ) : (
                  'Summon the Council'
                )}
              </div>
            </button>
          ) : (
            <button
              onClick={onRestart}
              className="btn-outline w-full flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
              Restart Scenario
            </button>
          )}
        </div>
      </aside>

      {/* Sidebar Toggle Handle */}
      <div
        className={`fixed z-[55] transition-all duration-300 ${
          isMobile
            ? 'top-4 left-4'
            : 'top-1/2 -translate-y-1/2'
        }`}
        style={{
          left: isMobile
            ? (isOpen ? 'auto' : '1rem')
            : (isOpen ? 'var(--sidebar-width)' : '0'),
          right: isMobile && isOpen ? '1rem' : 'auto'
        }}
      >
        <button
          onClick={toggleSidebar}
          className={`flex items-center justify-center transition-colors bg-paper text-ink2 hover:text-ink border-rule ${
            isMobile
              ? 'h-12 w-12 rounded-full border'
              : 'h-16 w-6 border border-l-0'
          }`}
        >
          <span className="material-symbols-outlined text-xl">
            {isMobile
              ? (isOpen ? 'close' : 'menu')
              : (isOpen ? 'chevron_left' : 'chevron_right')
            }
          </span>
        </button>
      </div>
    </>
  );
};

export default Sidebar;
