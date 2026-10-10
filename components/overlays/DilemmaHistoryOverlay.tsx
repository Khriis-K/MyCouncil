import React, { useState } from 'react';

interface DilemmaHistoryOverlayProps {
  dilemma: string;
  originalSummary: string;
  refinementHistory: string[];
  onClose: () => void;
  onAddMoreContext: () => void;
  onRestartScenario: () => void;
}

const DilemmaHistoryOverlay: React.FC<DilemmaHistoryOverlayProps> = ({
  dilemma,
  originalSummary,
  refinementHistory,
  onClose,
  onAddMoreContext,
  onRestartScenario
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 400); // Match animation duration
  };

  const handleAddMoreContext = () => {
    setIsClosing(true);
    setTimeout(() => {
      onAddMoreContext();
    }, 400);
  };

  const handleRestartConfirm = () => {
    setIsClosing(true);
    setTimeout(() => {
      onRestartScenario();
    }, 400);
  };

  return (
    <>
      {/* Full-screen veil - click to close */}
      <div
        className="fixed inset-0 bg-[var(--veil)] z-40"
        onClick={handleClose}
      ></div>

      {/* Side Panel */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full max-w-xl h-full bg-[var(--paper)] border-l border-[var(--ink)] flex flex-col ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>

        {/* Header */}
        <header className="flex items-start px-8 pt-8 pb-5 border-b border-[var(--rule)]">
          <div className="flex-grow">
            <p className="label">The record</p>
            <h3 className="display !text-[34px] mt-1">Your Dilemma &amp; History</h3>
            <p className="text-[13px] italic text-[var(--ink2)] mt-1">Original situation and refinement context</p>
          </div>
          <button onClick={handleClose} className="text-[var(--ink2)] hover:text-[var(--ink)] transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-grow overflow-y-auto px-8 py-6 scrollbar-hide space-y-8">
          {/* Original Situation */}
          <div>
            <h4 className="label mb-3">Original Situation</h4>
            <p className="text-[var(--ink)] leading-relaxed whitespace-pre-wrap">{dilemma}</p>
            {originalSummary && (
              <div className="mt-4 pl-4 border-l-2 border-[var(--rule)]">
                <p className="label !text-[10px] mb-1">AI Summary</p>
                <p className="font-display italic text-lg leading-snug text-[var(--ink)]">{originalSummary}</p>
              </div>
            )}
          </div>

          {/* Refinement History */}
          {refinementHistory.length > 0 && (
            <div>
              <h4 className="label mb-1">
                Additional Context (Refinements)
              </h4>
              <ul>
                {refinementHistory.map((context, idx) => (
                  <li key={idx} className="grid grid-cols-[96px_1fr] gap-3 py-3 border-t border-[var(--rule)]">
                    <span className="text-[13px] italic text-[var(--ink2)]">Update {idx + 1}</span>
                    <p className="text-[14.5px] text-[var(--ink)] leading-relaxed">{context}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-6 border-t border-[var(--rule)] space-y-3">
          <button
            onClick={handleAddMoreContext}
            className="btn-seal w-full flex items-center justify-center"
          >
            <span className="material-symbols-outlined mr-2 text-lg">add</span>
            Add More Context...
          </button>

          <button
            onClick={() => setShowRestartConfirm(true)}
            className="btn-outline w-full flex items-center justify-center"
          >
            <span className="material-symbols-outlined mr-2 text-lg">refresh</span>
            Restart Scenario
          </button>
        </div>
      </div>

      {/* Restart Confirmation Dialog */}
      {showRestartConfirm && (
        <>
          <div className="fixed inset-0 bg-[var(--veil)] z-[60]" onClick={() => setShowRestartConfirm(false)}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[calc(100%-2rem)] max-w-md bg-[var(--paper2)] border border-[var(--ink)] p-6 animate-fade-in">
            <h3 className="font-display text-2xl font-semibold text-[var(--ink)] mb-2">Restart Scenario?</h3>
            <p className="text-[14.5px] text-[var(--ink)] mb-6">
              This will clear your current dilemma, all counselor insights, and refinement history. You'll start fresh with a new scenario.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRestartConfirm(false)}
                className="btn-outline flex-1 !py-2.5"
              >
                Cancel
              </button>
              <button
                onClick={handleRestartConfirm}
                className="btn-seal flex-1 !py-2.5"
              >
                Restart
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default DilemmaHistoryOverlay;
