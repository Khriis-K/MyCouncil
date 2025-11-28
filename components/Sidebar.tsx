
import React, { useState, useRef, useEffect } from 'react';
import { MBTI_TYPES, REFLECTION_FOCUS_OPTIONS } from '../constants';
import { ReflectionFocus } from '../types';

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
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
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
  onToggleTheme
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showFocusDescription, setShowFocusDescription] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    setShowFocusDescription(true);
    setTimeout(() => setShowFocusDescription(false), 3000);
  };

  const currentFocusOption = REFLECTION_FOCUS_OPTIONS.find(opt => opt.value === reflectionFocus);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}
      
      <aside
        className={`fixed inset-y-0 left-0 z-[60] backdrop-blur-xl transition-all duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ 
          width: isMobile ? '100vw' : 'var(--sidebar-width)',
          maxWidth: isMobile ? '100vw' : '360px',
          backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderRight: isMobile ? 'none' : `1px solid var(--border-primary)`
        }}
      >
        <div className="p-6 space-y-8 flex-grow overflow-y-auto scrollbar-hide">
          <header className="flex items-center justify-center mb-4">
            <img 
              src={theme === 'dark' ? '/imgs/logo_transparent_dark_mode.png' : '/imgs/logo_transparent_light_mode.png'} 
              alt="MyCouncil" 
              style={{ width: '75%', height: 'auto' }}
              className="animate-float-glow"
            />
          </header>

          <div className="space-y-6">
            {/* Dilemma Input */}
            <div>
              <label htmlFor="dilemma" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                What's on your mind? <span style={{ color: 'var(--text-muted)' }}>(Your Dilemma)</span>
              </label>
              <textarea
                ref={textareaRef}
                id="dilemma"
                rows={5}
                className={`w-full rounded-lg focus:ring-primary focus:border-primary resize-none p-3 text-sm transition-all ${isHighlighted ? 'ring-4 ring-primary ring-opacity-50 shadow-[0_0_30px_rgba(79,70,229,0.6)]' : ''} ${hasCouncil ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{
                  backgroundColor: theme === 'dark' ? 'rgb(30, 41, 59)' : 'rgb(241, 245, 249)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)'
                }}
                placeholder="I've been offered a new job in a different city. It's a great career opportunity but..."
                value={dilemma}
                onChange={(e) => setDilemma(e.target.value)}
                disabled={isGenerating || hasCouncil}
              />
            </div>

            {/* Focus Dropdown */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Reflection Focus</label>
              <div className="relative">
                <select 
                  value={reflectionFocus}
                  onChange={handleReflectionFocusChange}
                  disabled={hasCouncil}
                  className={`w-full rounded-lg focus:ring-primary focus:border-primary appearance-none p-3 text-sm ${hasCouncil ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{
                    backgroundColor: theme === 'dark' ? 'rgb(30, 41, 59)' : 'rgb(241, 245, 249)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)'
                  }}
                >
                  {REFLECTION_FOCUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-sm" style={{ color: 'var(--text-muted)' }}>
                  expand_more
                </span>
              </div>
              {showFocusDescription && currentFocusOption && (
                <p className="text-xs mt-2 animate-fade-in" style={{ color: 'var(--text-tertiary)' }}>
                  {currentFocusOption.description}
                </p>
              )}
            </div>

            {/* Cognitive Style Dropdown */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Your Cognitive Style</label>
              <div className="relative">
                <select
                  value={isMBTIOverlayOpen ? 'TRIGGER' : (selectedMBTI === 'BALANCED' ? 'BALANCED' : (selectedMBTI || 'BALANCED'))}
                  onChange={handleCognitiveStyleChange}
                  disabled={hasCouncil}
                  className={`w-full appearance-none rounded-lg focus:ring-primary focus:border-primary p-3 text-sm transition-colors ${selectedMBTI && selectedMBTI !== 'BALANCED' ? 'border-diplomat' : ''} ${hasCouncil ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{
                    backgroundColor: theme === 'dark' ? 'rgb(30, 41, 59)' : 'rgb(241, 245, 249)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="BALANCED">Balanced (Default)</option>
                  {selectedMBTI && selectedMBTI !== 'BALANCED' && (
                    <option value={selectedMBTI}>{getMBTIDisplay()}</option>
                  )}
                  <option value="TRIGGER">Select MBTI Type...</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-sm" style={{ color: 'var(--text-muted)' }}>
                  expand_more
                </span>
              </div>
            </div>

            {/* Council Size Linear Scale */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Council Size
                </label>
                <span className="text-xs font-bold text-primary bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">
                  {councilSize} Counselors
                </span>
              </div>

              <div className="relative h-12 flex items-center select-none">
                {/* Track Lines */}
                <div className="absolute left-0 right-0 h-1 rounded-full z-0" style={{ backgroundColor: 'var(--border-primary)' }}></div>
                <div
                  className="absolute left-0 h-1 bg-primary rounded-full z-0 transition-all duration-300 ease-out"
                  style={{ width: `${((councilSize - 3) / 5) * 100}%` }}
                ></div>

                {/* Steps */}
                <div className="relative w-full flex justify-between z-10 px-[2px]">
                  {[3, 4, 5, 6, 7].map((size) => (
                    <button
                      key={size}
                      onClick={() => !hasCouncil && setCouncilSize(size)}
                      disabled={hasCouncil}
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 border-2 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2
                        ${hasCouncil ? 'opacity-50 cursor-not-allowed' : ''}
                        ${size === councilSize
                          ? 'bg-primary border-primary text-white scale-110 shadow-[0_0_10px_rgba(79,70,229,0.5)]'
                          : size < councilSize
                            ? 'border-primary text-primary'
                            : ''
                        }
                      `}
                      style={{
                        backgroundColor: size === councilSize ? undefined : (theme === 'dark' ? 'rgb(30, 41, 59)' : 'rgb(241, 245, 249)'),
                        borderColor: size >= councilSize && size !== councilSize ? 'var(--border-secondary)' : undefined,
                        color: size > councilSize ? 'var(--text-muted)' : undefined
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-between text-[10px] uppercase tracking-wider font-medium px-1" style={{ color: 'var(--text-muted)' }}>
                <span>Min</span>
                <span>Max</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Theme Toggle & Summon/Restart Button */}
        <div className="p-6" style={{ borderTop: '1px solid var(--border-primary)' }}>
          {/* Theme Toggle Switch */}
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base" style={{ color: theme === 'light' ? '#f59e0b' : 'var(--text-muted)' }}>light_mode</span>
            </div>
            <button
              onClick={onToggleTheme}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              style={{
                backgroundColor: theme === 'dark' ? '#4f46e5' : '#cbd5e1'
              }}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              <span
                className="inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300"
                style={{
                  transform: theme === 'dark' ? 'translateX(1.375rem)' : 'translateX(0.25rem)'
                }}
              />
            </button>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base" style={{ color: theme === 'dark' ? '#a5b4fc' : 'var(--text-muted)' }}>dark_mode</span>
            </div>
          </div>

          {!hasCouncil ? (
            <button
              onClick={onSummon}
              disabled={isGenerating}
              className={`w-full font-semibold py-3 px-4 rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all duration-300 ease-in-out flex items-center justify-center ${isGenerating
                  ? 'cursor-not-allowed'
                  : 'bg-primary hover:bg-indigo-500 text-white'
                }`}
              style={isGenerating ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' } : undefined}
            >
              {isGenerating ? (
                <>
                  <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mr-2" style={{ borderColor: 'var(--text-muted)', borderTopColor: 'transparent' }}></span>
                  Consulting...
                </>
              ) : (
                'Summon the Council'
              )}
            </button>
          ) : (
            <button
              onClick={onRestart}
              className="w-full font-semibold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out flex items-center justify-center gap-2"
              style={{
                backgroundColor: theme === 'dark' ? 'rgb(51, 65, 85)' : 'rgb(226, 232, 240)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-secondary)'
              }}
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
          className={`backdrop-blur-sm flex items-center justify-center hover:shadow-[0_0_12px_rgba(79,70,229,0.5)] transition-all ${
            isMobile 
              ? 'h-12 w-12 rounded-full shadow-lg' 
              : 'h-16 w-6 rounded-r-lg'
          }`}
          style={{
            backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            border: isMobile ? '1px solid var(--border-primary)' : undefined,
            borderTop: isMobile ? undefined : '1px solid var(--border-primary)',
            borderRight: isMobile ? undefined : '1px solid var(--border-primary)',
            borderBottom: isMobile ? undefined : '1px solid var(--border-primary)',
            color: 'var(--text-tertiary)'
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
