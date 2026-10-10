import React from 'react';

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

const CONTEXT_MAX = 300;

// Under the chamber floor: add to the record and refine, and show or hide the disagreements.
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
  const canRefine = !isDisabled && !isRefining && additionalContext.trim().length > 0;

  return (
    <footer
      className={`flex-none flex flex-wrap md:flex-nowrap items-center gap-x-5 gap-y-3 px-4 md:px-9 py-3 md:h-16 bg-paper border-t border-rule transition-opacity ${
        isDisabled ? 'opacity-50 pointer-events-none' : ''
      } ${isHighlighted ? 'ring-2 ring-inset ring-seal' : ''}`}
    >
      <div className="relative basis-full md:basis-auto md:flex-1">
        <input
          type="text"
          aria-label="Add to the record"
          placeholder="Add to the record. Something new since you began?"
          value={additionalContext}
          onChange={e => setAdditionalContext(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && canRefine && onRefine()}
          maxLength={CONTEXT_MAX}
          disabled={isDisabled || isRefining}
          className="w-full bg-transparent border-b border-rule py-1.5 pr-16 italic text-[15px] text-ink placeholder:text-ink2 focus:outline-none focus:border-ink"
        />
        {additionalContext.length > 0 && (
          <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-ink2">
            {additionalContext.length}/{CONTEXT_MAX}
          </span>
        )}
      </div>

      <button type="button" onClick={onRefine} disabled={!canRefine} className={`btn-link ${isRefining ? 'cursor-wait' : ''}`}>
        {isRefining ? 'Refining…' : 'Refine'}
      </button>

      <button
        type="button"
        onClick={toggleDebateMode}
        disabled={isRefining}
        aria-pressed={isDebateMode}
        className="ml-auto md:ml-0 flex items-center gap-2 caps text-ink disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={`relative w-[30px] h-4 rounded-full border ${isDebateMode ? 'border-ink' : 'border-rule'}`}>
          <span
            className={`absolute top-[2px] w-2.5 h-2.5 rounded-full transition-[left] ${
              isDebateMode ? 'left-[15px] bg-seal' : 'left-[2px] bg-ink2'
            }`}
          />
        </span>
        Show disagreements
      </button>
    </footer>
  );
};

export default BottomBar;
