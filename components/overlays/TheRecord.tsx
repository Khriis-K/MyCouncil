import React, { useState } from 'react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { Refinement } from '../../types';
import { formatRecordTime } from '../../utils/recordTime';

interface TheRecordProps {
  dilemma: string;
  originalSummary: string;
  refinements: Refinement[];
  onClose: () => void;
  onAddMoreContext: () => void;
  onRestartScenario: () => void;
}

const SLIDE_MS = 400; // Matches the slide-out animation

// The matter as amended: the original situation, then each refinement in order. Slides in over the chamber floor.
const TheRecord: React.FC<TheRecordProps> = ({
  dilemma,
  originalSummary,
  refinements,
  onClose,
  onAddMoreContext,
  onRestartScenario
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);

  // Slide the panel out, then hand off
  const closeThen = (next: () => void) => {
    setIsClosing(true);
    setTimeout(next, SLIDE_MS);
  };

  // Escape backs out one step: the restart confirmation first, then the record itself
  useEscapeKey(() => {
    if (showRestartConfirm) setShowRestartConfirm(false);
    else closeThen(onClose);
  });

  return (
    <>
      {/* Veil over the floor: a click outside the record closes it */}
      <div className="fixed inset-0 md:top-[58px] bg-veil z-40" onClick={() => closeThen(onClose)}></div>

      <aside
        role="dialog"
        aria-label="The record"
        className={`fixed right-0 bottom-0 top-0 md:top-[58px] z-50 w-full md:w-[520px] flex flex-col bg-paper border-l border-ink ${
          isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'
        }`}
      >
        <header className="shrink-0 px-5 pt-6 md:px-10 md:pt-[30px]">
          <div className="flex justify-between items-baseline">
            <span className="label">The record</span>
            <button type="button" onClick={() => closeThen(onClose)} className="caps text-ink2 hover:text-ink">
              Close
            </button>
          </div>
          <h2 className="display !text-[34px] mt-1.5 mb-4">
            The matter, <em>as amended</em>
          </h2>
        </header>

        {/* Only the entries scroll, so the actions stay in reach however long the record grows */}
        <ol className="flex-1 min-h-0 overflow-y-auto px-5 md:px-10">
          <li className="grid grid-cols-[96px_1fr] gap-3.5 py-3 border-t border-rule">
            <span className="label">Original</span>
            <div>
              <p className="text-[14.5px] text-ink leading-relaxed whitespace-pre-wrap">{dilemma}</p>
              {originalSummary && (
                <p className="text-[13px] italic text-ink2 leading-snug mt-1.5">Summary: {originalSummary}</p>
              )}
            </div>
          </li>
          {refinements.map((r, idx) => (
            <li key={idx} className="grid grid-cols-[96px_1fr] gap-3.5 py-3 border-t border-rule">
              <span className="label">Amend. {idx + 1}</span>
              <div>
                <p className="text-[14.5px] text-ink leading-relaxed whitespace-pre-wrap">{r.text}</p>
                <p className="text-[12px] italic text-ink2 mt-1">{formatRecordTime(r.timestamp)}</p>
              </div>
            </li>
          ))}
        </ol>

        <footer className="shrink-0 flex flex-wrap items-center gap-x-[22px] gap-y-3 px-5 py-5 md:px-10 border-t border-rule">
          <button type="button" onClick={() => closeThen(onAddMoreContext)} className="btn-seal">
            Add to the record
          </button>
          <button type="button" onClick={() => setShowRestartConfirm(true)} className="btn-link">
            Start a new matter
          </button>
        </footer>
      </aside>

      {/* Restart confirmation */}
      {showRestartConfirm && (
        <>
          <div className="fixed inset-0 bg-veil z-[60]" onClick={() => setShowRestartConfirm(false)}></div>
          <div
            role="alertdialog"
            aria-label="Start a new matter?"
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[calc(100%-2rem)] max-w-md bg-paper2 border border-ink px-6 pt-5 pb-6 animate-fade-in"
          >
            <span className="label">Start a new matter</span>
            <h3 className="display !text-[28px] mt-1.5 mb-3">Set this matter aside?</h3>
            <p className="text-[14.5px] text-ink leading-relaxed mb-6">
              This clears the matter, every counselor's opinion and the record of amendments. You'll begin again from a blank page.
            </p>
            <div className="flex flex-wrap items-center gap-x-[22px] gap-y-3">
              <button type="button" onClick={() => closeThen(onRestartScenario)} className="btn-seal">
                Start a new matter
              </button>
              <button type="button" onClick={() => setShowRestartConfirm(false)} className="btn-link">
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default TheRecord;
