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
      {/* Full-screen backdrop with blur/opacity - click to close */}
      <div 
        className="fixed inset-0 bg-[var(--overlay-backdrop)] backdrop-blur-sm z-40"
        onClick={handleClose}
      ></div>

      {/* Side Panel */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full max-w-xl h-full bg-[var(--bg-secondary)] border-l border-[var(--border-primary)] shadow-2xl flex flex-col ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>

        {/* Header */}
        <header className="flex items-center p-6 border-b border-[var(--border-primary)] bg-[var(--bg-glass)]">
          <div className="flex-grow">
            <h3 className="text-xl font-bold text-[var(--text-primary)]">Your Dilemma & History</h3>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">Original situation and refinement context</p>
          </div>
          <button onClick={handleClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-grow overflow-y-auto p-8 scrollbar-hide space-y-6">
          {/* Original Situation */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Original Situation</h4>
            <div className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg p-4">
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed whitespace-pre-wrap">{dilemma}</p>
            </div>
            {originalSummary && (
              <div className="mt-3 pl-4 border-l-2 border-primary/30">
                <p className="text-xs text-[var(--text-tertiary)] mb-1">AI Summary:</p>
                <p className="text-sm text-[var(--text-secondary)] italic">{originalSummary}</p>
              </div>
            )}
          </div>

          {/* Refinement History */}
          {refinementHistory.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3">
                Additional Context (Refinements)
              </h4>
              <ul className="space-y-3">
                {refinementHistory.map((context, idx) => (
                  <li key={idx} className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)]/50 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-bold text-indigo-400 mt-0.5">Update {idx + 1}:</span>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed flex-grow">{context}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-[var(--border-primary)] bg-[var(--bg-glass)] space-y-3">
          <button
            onClick={handleAddMoreContext}
            className="w-full bg-primary hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.4)]"
          >
            <span className="material-symbols-outlined mr-2">add</span>
            Add More Context...
          </button>
          
          <button
            onClick={() => setShowRestartConfirm(true)}
            className="w-full bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80 text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center border border-[var(--border-primary)]"
          >
            <span className="material-symbols-outlined mr-2">refresh</span>
            Restart Scenario
          </button>
        </div>
      </div>

      {/* Restart Confirmation Dialog */}
      {showRestartConfirm && (
        <>
          <div className="fixed inset-0 bg-[var(--overlay-backdrop)] z-[60]" onClick={() => setShowRestartConfirm(false)}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-md bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg shadow-2xl p-6 animate-fade-in">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Restart Scenario?</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              This will clear your current dilemma, all counselor insights, and refinement history. You'll start fresh with a new scenario.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRestartConfirm(false)}
                className="flex-1 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80 border border-[var(--border-primary)] text-[var(--text-primary)] font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRestartConfirm}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
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
