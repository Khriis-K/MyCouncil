
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
const fieldClass = 'w-full border p-3 text-[15px] focus:outline-none focus:border-[var(--ink)]';
const fieldStyle: React.CSSProperties = { backgroundColor: 'var(--paper2)', borderColor: 'var(--rule)', color: 'var(--ink)' };

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
          className="fixed inset-0 z-[55]"
          style={{ backgroundColor: 'var(--veil)' }}
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-[60] transition-all duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          width: isMobile ? '100vw' : 'var(--sidebar-width)',
          maxWidth: isMobile ? '100vw' : '360px',
          backgroundColor: 'var(--paper)',
          borderRight: isMobile ? 'none' : `1px solid var(--rule)`
        }}
      >
        <div className="p-6 space-y-8 flex-grow overflow-y-auto scrollbar-hide">
          {/* Masthead */}
          <header className="space-y-3 pb-5" style={{ borderBottom: '1px solid var(--rule)' }}>
            <h1 className="wordmark">My<em>Council</em></h1>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="docket">{sittingDate}</span>
              <div className="flex gap-3" role="group" aria-label="Theme">
                {THEME_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setThemeMode(mode.id)}
                    aria-pressed={theme === mode.id}
                    className="font-label text-[11px] uppercase tracking-[0.1em] underline-offset-[3px]"
                    style={{
                      color: theme === mode.id ? 'var(--ink)' : 'var(--ink2)',
                      textDecorationLine: theme === mode.id ? 'underline' : 'none'
                    }}
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
                className={`${fieldClass} resize-none transition-all ${isHighlighted ? 'ring-2 ring-seal' : ''} ${hasCouncil ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={fieldStyle}
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
                  className={`${fieldClass} appearance-none ${hasCouncil ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={fieldStyle}
                >
                  {REFLECTION_FOCUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-sm" style={{ color: 'var(--ink2)' }}>
                  expand_more
                </span>
              </div>
              {currentFocusOption && (
                <p className="text-[13px] italic mt-2 animate-fade-in" style={{ color: 'var(--ink2)' }}>
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
                  className={`${fieldClass} appearance-none ${hasCouncil ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ ...fieldStyle, borderColor: selectedMBTI && selectedMBTI !== 'BALANCED' ? 'var(--ink)' : 'var(--rule)' }}
                >
                  <option value="BALANCED">Balanced (Default)</option>
                  {selectedMBTI && selectedMBTI !== 'BALANCED' && (
                    <option value={selectedMBTI}>{getMBTIDisplay()}</option>
                  )}
                  <option value="TRIGGER">Select MBTI Type...</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-sm" style={{ color: 'var(--ink2)' }}>
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
                <span className="text-[13px] italic" style={{ color: 'var(--ink2)' }}>
                  {councilSize} Counselors
                </span>
              </div>

              <div className="relative h-12 flex items-center select-none">
                {/* Track Lines */}
                <div className="absolute left-0 right-0 h-px z-0" style={{ backgroundColor: 'var(--rule)' }}></div>
                <div
                  className="absolute left-0 h-px z-0 transition-all duration-300 ease-out"
                  style={{ width: `${((councilSize - 3) / 4) * 100}%`, backgroundColor: 'var(--ink)' }}
                ></div>

                {/* Steps */}
                <div className="relative w-full flex justify-between z-10 px-[2px]">
                  {[3, 4, 5, 6, 7].map((size) => (
                    <button
                      key={size}
                      onClick={() => !hasCouncil && setCouncilSize(size)}
                      disabled={hasCouncil}
                      className={`w-[30px] h-[30px] rounded-full flex items-center justify-center font-display text-[17px] border transition-colors duration-200 ${hasCouncil ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={{
                        backgroundColor: size === councilSize ? 'var(--ink)' : 'var(--paper)',
                        borderColor: size <= councilSize ? 'var(--ink)' : 'var(--rule)',
                        color: size === councilSize ? 'var(--paper)' : (size < councilSize ? 'var(--ink)' : 'var(--ink2)')
                      }}
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
        <div className="p-6" style={{ borderTop: '1px solid var(--rule)' }}>
          {!hasCouncil ? (
            <button
              onClick={onSummon}
              disabled={isGenerating}
              className="btn-seal relative overflow-hidden w-full flex items-center justify-center disabled:!opacity-100"
              style={isGenerating ? { backgroundColor: 'var(--paper2)', color: 'var(--ink2)', outline: '1px solid var(--rule)', outlineOffset: '-1px' } : undefined}
            >
              {/* Progressive Loading Bar */}
              {isGenerating && (
                <div
                  className="absolute left-0 top-0 bottom-0 transition-all ease-out"
                  style={{
                    width: `${currentProgress}%`,
                    transitionDuration: `${estimatedLoadDuration || 0}ms`, // Use estimated duration for CSS transition
                    backgroundColor: 'var(--rule)'
                  }}
                />
              )}

              <div className="relative z-10 flex items-center">
                {isGenerating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mr-2" style={{ borderColor: 'var(--ink2)', borderTopColor: 'transparent' }}></span>
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
          className={`flex items-center justify-center transition-colors hover:text-[var(--ink)] ${
            isMobile
              ? 'h-12 w-12 rounded-full'
              : 'h-16 w-6'
          }`}
          style={{
            backgroundColor: 'var(--paper)',
            color: 'var(--ink2)',
            // React clears a longhand set to undefined, which would wipe the shorthand, so set one or the other
            ...(isMobile
              ? { border: '1px solid var(--rule)' }
              : { borderTop: '1px solid var(--rule)', borderRight: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)' })
          }}
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
