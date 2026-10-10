import React, { useState, useEffect } from 'react';

interface BottomBarProps {
  isDebateMode: boolean;
  toggleDebateMode: () => void;
  isDisabled: boolean;
  onRefine: () => void;
  additionalContext: string;
  setAdditionalContext: (value: string) => void;
  isRefining: boolean;
  isHighlighted?: boolean;
}

const BottomBar: React.FC<BottomBarProps> = ({ 
  isDebateMode, 
  toggleDebateMode, 
  isDisabled, 
  onRefine, 
  additionalContext, 
  setAdditionalContext,
  isRefining,
  isHighlighted = false
}) => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && additionalContext.trim() && !isDisabled && !isRefining) {
      onRefine();
    }
  };

  return (
    <footer 
      className={`absolute bottom-0 left-0 right-0 p-3 md:p-4 z-40 transition-all duration-300 ${isDisabled ? 'opacity-50 pointer-events-none' : 'opacity-100'} ${isHighlighted ? 'ring-2 ring-inset ring-seal' : ''} bg-paper border-t border-rule`}
    >
      <div className={`max-w-screen-2xl mx-auto ${isMobile ? 'flex flex-col space-y-3' : 'flex items-center space-x-4'}`}>
        
        {/* Context Input */}
        <div className="flex-grow relative">
           <input
            type="text"
            placeholder="Add more context..."
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            onKeyPress={handleKeyPress}
            maxLength={300}
            className="w-full bg-transparent border-b pl-0 pr-16 py-2 italic text-[15px] focus:outline-none focus:border-ink placeholder:text-ink2 border-rule text-ink"
            
            disabled={isDisabled || isRefining}
          />
          {additionalContext.length > 0 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink2">
              {additionalContext.length}/300
            </span>
          )}
        </div>

        {/* Mobile: Row with toggle and button */}
        <div className={`${isMobile ? 'flex items-center justify-between' : 'flex items-center space-x-4'}`}>
          {/* Debate Toggle */}
          <div className={`flex items-center space-x-2 md:space-x-3 ${isMobile ? '' : 'px-4 border-r border-rule'}`}>
            <label htmlFor="debate-mode" className="caps cursor-pointer select-none whitespace-nowrap text-ink">
              {isMobile ? 'Debate' : 'Debate Mode'}
            </label>
            <button
              id="debate-mode"
              onClick={toggleDebateMode}
              disabled={isRefining}
              aria-pressed={isDebateMode}
              className={`relative inline-flex h-4 w-[30px] items-center rounded-full border transition-colors ${isDebateMode ? 'border-ink' : 'border-rule'} ${isRefining ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-2.5 w-2.5 transform rounded-full transition-transform ${
                  isDebateMode ? 'translate-x-[15px] bg-seal' : 'translate-x-[2px] bg-ink2'
                }`}
              />
            </button>
          </div>

          {/* Action Button */}
          <button 
            onClick={onRefine}
            disabled={isRefining || (!additionalContext.trim())}
            className={`btn-seal !py-2.5 !px-5 whitespace-nowrap flex items-center gap-2 ${
              isRefining ? 'cursor-wait' : ''
            }`}
          >
            {isRefining && (
              <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
            )}
            {isMobile 
              ? (isDebateMode ? 'Refresh' : 'Refine')
              : (isDebateMode ? 'Refresh Debate' : 'Refine Perspective')
            }
          </button>
        </div>
      </div>
    </footer>
  );
};

export default BottomBar;