import React, { useState } from 'react';
import { Counselor, CouncilResponse } from '../../types';

interface CounselorOverlayProps {
  counselor: Counselor;
  dynamicData?: CouncilResponse['counselors'][0]; // Optional dynamic data
  onClose: () => void;
}

const CounselorOverlay: React.FC<CounselorOverlayProps> = ({ counselor, dynamicData, onClose }) => {
  const [view, setView] = useState<'TEXT' | 'CHAT'>('TEXT');

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
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl animate-slide-in-right">
      {/* Backdrop (click to close) */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm -z-10" onClick={onClose}></div>

      {/* Side Panel */}
      <div className={`h-full bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col ${colorStyles[counselor.color].split(' ')[2]}`}>

        {/* Header */}
        <header className={`flex items-center p-6 border-b ${colorStyles[counselor.color].split(' ')[1]} bg-slate-900/50`}>
          <span className={`material-symbols-outlined text-3xl mr-4 ${colorStyles[counselor.color].split(' ')[0]}`}>
            {counselor.icon}
          </span>
          <div className="flex-grow">
            <h3 className="text-xl font-bold text-white">{counselor.name}</h3>
            <div className="flex items-center text-xs text-slate-400 mt-1">
              <span className="material-symbols-outlined text-sm mr-1">settings</span>
              <span>Tone: {counselor.role}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-grow overflow-y-auto p-8 scrollbar-hide">
          {view === 'TEXT' ? (
            <div className="space-y-6">
              <h4 className="text-xl font-semibold text-white">
                {dynamicData ? "My Assessment of Your Situation" : "Structured Approach to Navigating Your Career Crossroads."}
              </h4>

              {dynamicData ? (
                <>
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">ANALYSIS</h5>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      {dynamicData.assessment}
                    </p>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">ACTION PLAN</h5>
                    <ul className="list-disc list-inside space-y-2 text-slate-300 text-sm">
                      {dynamicData.action_plan.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mt-6">
                    <p className="text-xs font-semibold text-slate-400 mb-2 uppercase">For Your Reflection:</p>
                    <p className="text-base text-white">{dynamicData.reflection_q}</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">ASSESSMENT</h5>
                    <ul className="list-disc list-inside space-y-2 text-slate-300 text-sm">
                      <li>Focus on logic for career choice.</li>
                      <li>Create a decision matrix based on values.</li>
                    </ul>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">ACTION/OUTCOME</h5>
                    <ul className="list-disc list-inside space-y-2 text-slate-300 text-sm">
                      <li>Quantify pros/cons, including financial.</li>
                      <li>Goal: data-driven, optimal path.</li>
                    </ul>
                  </div>

                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mt-6">
                    <p className="text-xs font-semibold text-slate-400 mb-2 uppercase">For Your Reflection:</p>
                    <p className="text-base text-white">What are the non-negotiable values that will most influence your decision?</p>
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
                <div className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg rounded-bl-none p-3 max-w-md text-sm">
                  Relationships are weighted by their impact on long-term happiness. Assign a score (0-10).
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`p-6 border-t ${colorStyles[counselor.color].split(' ')[1]} bg-slate-900/50`}>
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
              <input type="text" placeholder="Ask a follow up..." className="flex-grow bg-slate-800 border-slate-700 rounded-lg px-4 text-slate-300 focus:ring-primary" />
              <button className="bg-primary text-white px-4 py-2 rounded-lg">Send</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CounselorOverlay;