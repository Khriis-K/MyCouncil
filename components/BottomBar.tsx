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
      className={`absolute bottom-0 left-0 right-0 backdrop-blur-md p-3 md:p-4 z-40 transition-all duration-300 ${isDisabled ? 'opacity-50 pointer-events-none' : 'opacity-100'} ${isHighlighted ? 'ring-4 ring-primary ring-opacity-50 shadow-[0_0_30px_rgba(79,70,229,0.6)]' : ''}`}
      style={{
        backgroundColor: 'var(--bg-glass)',
        borderTop: '1px solid var(--border-primary)'
      }}
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
            className="w-full rounded-lg pl-4 pr-20 py-2 focus:ring-primary focus:border-primary text-sm"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-secondary)'
            }}
            disabled={isDisabled || isRefining}
          />
          {additionalContext.length > 0 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-muted)' }}>
              {additionalContext.length}/300
            </span>
          )}
        </div>

        {/* Mobile: Row with toggle and button */}
        <div className={`${isMobile ? 'flex items-center justify-between' : 'flex items-center space-x-4'}`}>
          {/* Debate Toggle */}
          <div className={`flex items-center space-x-2 md:space-x-3 ${isMobile ? '' : 'px-4'}`} style={!isMobile ? { borderRight: '1px solid var(--border-primary)' } : undefined}>
            <label htmlFor="debate-mode" className="text-xs md:text-sm font-medium cursor-pointer select-none whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
              {isMobile ? 'Debate' : 'Debate Mode'}
            </label>
            <button
              id="debate-mode"
              onClick={toggleDebateMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                isDebateMode ? 'bg-primary' : ''
              }`}
              style={!isDebateMode ? { backgroundColor: 'var(--border-secondary)' } : undefined}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isDebateMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Action Button */}
          <button 
            onClick={onRefine}
            disabled={isRefining || (!additionalContext.trim())}
            className={`bg-primary hover:bg-indigo-500 text-white font-semibold py-2 px-4 md:px-6 rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm md:text-base ${
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