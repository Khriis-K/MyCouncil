import React, { useState } from 'react';
import { Counselor, CouncilResponse } from '../../types';

interface CounselorOverlayProps {
  counselor: Counselor;
  dynamicData?: CouncilResponse['counselors'][0]; // Optional dynamic data
  onClose: () => void;
}

const CounselorOverlay: React.FC<CounselorOverlayProps> = ({ counselor, dynamicData, onClose }) => {
  const [view, setView] = useState<'TEXT' | 'CHAT'>('TEXT');
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 400); // Match animation duration
  };

  const colorStyles: Record<string, string> = {
    blue: 'text-blue-400 border-blue-500/30 shadow-blue-500/10',
    green: 'text-green-400 border-green-500/30 shadow-green-500/10',
    yellow: 'text-yellow-400 border-yellow-500/30 shadow-yellow-500/10',
    purple: 'text-purple-400 border-purple-500/30 shadow-purple-500/10',
  };

  const bgButtonStyles: Record<string, string> = {
    blue: 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]',
    green: 'bg-green-600 hover:bg-green-500 shadow-[0_0_15px_rgba(22,163,74,0.4)]',
    yellow: 'bg-yellow-600 hover:bg-yellow-500 shadow-[0_0_15px_rgba(202,138,4,0.4)]',
    purple: 'bg-purple-600 hover:bg-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.4)]',
  };

  return (
    <>
      {/* Full-screen backdrop with blur/opacity - click to close */}
      <div 
        className="fixed inset-0 bg-[var(--overlay-backdrop)] backdrop-blur-sm z-40"
        onClick={handleClose}
      ></div>

      {/* Side Panel */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full sm:max-w-xl h-full bg-[var(--bg-secondary)] border-l border-[var(--border-primary)] shadow-2xl flex flex-col ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'} ${colorStyles[counselor.color].split(' ')[2]}`}>

        {/* Header */}
        <header className={`flex items-center p-6 border-b ${colorStyles[counselor.color].split(' ')[1]} bg-[var(--bg-glass)]`}>
          <span className={`material-symbols-outlined text-3xl mr-4 ${colorStyles[counselor.color].split(' ')[0]}`}>
            {counselor.icon}
          </span>
          <div className="flex-grow">
            <h3 className="text-xl font-bold text-[var(--text-primary)]">{counselor.name}</h3>
            <div className="flex items-center text-xs text-[var(--text-tertiary)] mt-1">
              <span className="material-symbols-outlined text-sm mr-1">settings</span>
              <span>Tone: {counselor.role}</span>
            </div>
          </div>
          <button onClick={handleClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-grow overflow-y-auto p-8 scrollbar-hide">
          {view === 'TEXT' ? (
            <div className="space-y-6">
              <h4 className="text-xl font-semibold text-[var(--text-primary)]">
                {dynamicData ? "My Assessment of Your Situation" : "Structured Approach to Navigating Your Career Crossroads."}
              </h4>

              {dynamicData ? (
                <>
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">ANALYSIS</h5>
                    <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                      {dynamicData.assessment}
                    </p>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">ACTION PLAN</h5>
                    <ul className="list-disc list-inside space-y-2 text-[var(--text-secondary)] text-sm">
                      {dynamicData.action_plan.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg p-4 mt-6">
                    <p className="text-xs font-semibold text-[var(--text-tertiary)] mb-2 uppercase">For Your Reflection:</p>
                    <p className="text-base text-[var(--text-primary)]">{dynamicData.reflection_q}</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">ASSESSMENT</h5>
                    <ul className="list-disc list-inside space-y-2 text-[var(--text-secondary)] text-sm">
                      <li>Focus on logic for career choice.</li>
                      <li>Create a decision matrix based on values.</li>
                    </ul>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">ACTION/OUTCOME</h5>
                    <ul className="list-disc list-inside space-y-2 text-[var(--text-secondary)] text-sm">
                      <li>Quantify pros/cons, including financial.</li>
                      <li>Goal: data-driven, optimal path.</li>
                    </ul>
                  </div>

                  <div className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg p-4 mt-6">
                    <p className="text-xs font-semibold text-[var(--text-tertiary)] mb-2 uppercase">For Your Reflection:</p>
                    <p className="text-base text-[var(--text-primary)]">What are the non-negotiable values that will most influence your decision?</p>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Simple Chat Mockup */
            <div className="space-y-4 flex flex-col h-full">
              <div className="flex justify-end">
                <div className="bg-primary text-white rounded-lg rounded-br-none p-3 max-w-sm text-sm">
                  How do I weigh relationships in the matrix?
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-secondary)] rounded-lg rounded-bl-none p-3 max-w-md text-sm">
                  Relationships are weighted by their impact on long-term happiness. Assign a score (0-10).
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`p-6 border-t ${colorStyles[counselor.color].split(' ')[1]} bg-[var(--bg-glass)]`}>
          {view === 'TEXT' ? (
            <button
              onClick={() => setView('CHAT')}
              className={`w-full text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center ${bgButtonStyles[counselor.color]}`}
            >
              <span className="material-symbols-outlined mr-2">forum</span>
              Dialogue with {counselor.name}
            </button>
          ) : (
            <div className="flex space-x-2">
              <input type="text" placeholder="Ask a follow up..." className="flex-grow bg-[var(--bg-tertiary)] border-[var(--border-primary)] rounded-lg px-4 text-[var(--text-secondary)] focus:ring-primary" />
              <button className="bg-primary text-white px-4 py-2 rounded-lg">Send</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CounselorOverlay;