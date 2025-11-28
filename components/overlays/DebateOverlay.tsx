import React, { useState } from 'react';
import { TensionPair, Counselor, CouncilResponse } from '../../types';

interface DebateOverlayProps {
   pair: TensionPair;
   counselors: Counselor[];
   dynamicData?: CouncilResponse['tensions'][0]; // Optional dynamic data
   onClose: () => void;
}

const DebateOverlay: React.FC<DebateOverlayProps> = ({ pair, counselors, dynamicData, onClose }) => {
   const [showMap, setShowMap] = useState(false);

   const c1 = counselors.find(c => c.id === pair.counselor1);
   const c2 = counselors.find(c => c.id === pair.counselor2);

   if (!c1 || !c2) return null;

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
         <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose}></div>

         <div className="relative w-full max-w-4xl max-h-[90vh] md:max-h-[80vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">

            {/* Header */}
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 md:p-6 gap-3 border-b border-slate-800 bg-slate-900">
               <div>
                  <h2 className="text-lg md:text-xl font-bold text-white">
                     {showMap ? 'Argument Map: ' : 'Tension: '} {c1.name} vs. {c2.name}
                  </h2>
               </div>
               <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto">
                  <button
                     onClick={() => setShowMap(!showMap)}
                     className="flex-1 sm:flex-none text-xs md:text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-md px-3 md:px-4 py-2 hover:bg-slate-700 transition-colors"
                  >
                     {showMap ? 'Dialogue' : 'Argument Map'}
                  </button>
                  <button onClick={onClose} className="text-slate-500 hover:text-white">
                     <span className="material-symbols-outlined">close</span>
                  </button>
               </div>
            </header>

            {/* Body */}
            <div className="flex-grow overflow-y-auto bg-slate-900 relative">
               {!showMap ? (
                  /* Dialogue View */
                  <div className="p-8 space-y-8 max-w-3xl mx-auto">
                     {dynamicData ? (
                        // Dynamic Dialogue
                        dynamicData.dialogue.map((turn, idx) => {
                           const speaker = counselors.find(c => c.id === turn.speaker);
                           const isLeft = turn.speaker === c2.id; // Alternating sides based on speaker ID match

                           if (!speaker) return null;

                           return (
                              <div key={idx} className={`flex items-start gap-4 ${isLeft ? '' : 'flex-row-reverse'}`}>
                                 <div className={`w-10 h-10 rounded-full border flex items-center justify-center ${isLeft ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500' : 'bg-blue-500/20 border-blue-500/50 text-blue-500'}`}>
                                    <span className="material-symbols-outlined">{speaker.icon}</span>
                                 </div>
                                 <div className={`p-4 text-slate-200 shadow-sm rounded-lg ${isLeft ? 'bg-slate-800 border border-slate-700 rounded-tl-none' : 'bg-blue-900/20 border border-blue-500/30 rounded-tr-none'}`}>
                                    <p>{turn.text}</p>
                                 </div>
                              </div>
                           );
                        })
                     ) : (
                        // Static Fallback
                        <>
                           <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-full bg-yellow-500/20 border-yellow-500/50 flex items-center justify-center text-yellow-500">
                                 <span className="material-symbols-outlined">{c2.icon}</span>
                              </div>
                              <div className="bg-slate-800 border border-slate-700 rounded-lg rounded-tl-none p-4 text-slate-300 shadow-sm">
                                 <p>Strategist, your 'quantifying emotion' is a fallacy. This isn't about data; it's about risk. Are you romantically idealizing this new opportunity's 'career growth' while downplaying the very real risks?</p>
                              </div>
                           </div>

                           <div className="flex items-start gap-4 flex-row-reverse">
                              <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-500">
                                 <span className="material-symbols-outlined">{c1.icon}</span>
                              </div>
                              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg rounded-tr-none p-4 text-slate-200 shadow-sm">
                                 <p>Skeptic, while your cynicism is noted, the decision matrix forces risk assessment to be defined and scored, making it a quantifiable variable, not an excuse for inaction.</p>
                              </div>
                           </div>
                        </>
                     )}
                  </div>
               ) : (
                  /* Argument Map View */
                  <div className="p-12 flex flex-col items-center h-full justify-center relative">
                     {/* Background Lines (SVG) */}
                     <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 600">
                        <path d="M 400 100 L 400 180" stroke="#475569" strokeWidth="2" />
                        <path d="M 400 180 L 200 250" stroke="#475569" strokeWidth="2" fill="none" />
                        <path d="M 400 180 L 600 250" stroke="#475569" strokeWidth="2" fill="none" />
                        {/* Dashed Interactions */}
                        <path d="M 200 350 Q 400 500 600 350" stroke="#ef4444" strokeWidth="2" strokeDasharray="6 6" fill="none" />
                     </svg>

                     <div className="relative z-10 text-center bg-slate-800 border border-slate-600 px-6 py-3 rounded-lg shadow-lg mb-16">
                        <span className="text-lg font-bold text-white">Core Conflict: {dynamicData?.core_issue || "Risk vs. Quantification"}</span>
                     </div>

                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-32 w-full max-w-4xl">
                        {/* Left Side */}
                        <div className="flex flex-col space-y-6">
                           <div className="bg-slate-800 border-l-4 border-blue-500 p-4 rounded-r-lg shadow-lg">
                              <span className="text-xs font-bold text-blue-400 uppercase">Strategist's Proposition</span>
                              <p className="text-sm text-slate-200 mt-1">Emotion is quantifiable via metrics.</p>
                           </div>
                           <div className="bg-slate-800/50 border border-slate-700 p-3 rounded-lg text-center">
                              <span className="text-xs font-bold text-blue-400 uppercase">Evidence</span>
                              <p className="text-xs text-slate-400 mt-1">Decision matrix forces subjectivity into data.</p>
                           </div>
                        </div>

                        {/* Right Side */}
                        <div className="flex flex-col space-y-6">
                           <div className="bg-slate-800 border-l-4 border-yellow-500 p-4 rounded-r-lg shadow-lg">
                              <span className="text-xs font-bold text-yellow-400 uppercase">Skeptic's Proposition</span>
                              <p className="text-sm text-slate-200 mt-1">Quantification is a fallacy; focus on unknowns.</p>
                           </div>
                           <div className="bg-slate-800/50 border border-slate-700 p-3 rounded-lg text-center">
                              <span className="text-xs font-bold text-yellow-400 uppercase">Evidence</span>
                              <p className="text-xs text-slate-400 mt-1">New environment introduces unpredictable variables.</p>
                           </div>
                        </div>
                     </div>
                  </div>
               )}
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-6 border-t border-slate-800 bg-slate-900">
               <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                  <input
                     type="text"
                     placeholder="Inject your comment or question..."
                     className="flex-grow bg-slate-800 border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:ring-primary focus:border-primary text-sm md:text-base"
                  />
                  <button className="bg-primary hover:bg-indigo-500 text-white px-6 py-3 sm:py-0 rounded-lg font-semibold shadow-lg text-sm md:text-base whitespace-nowrap">
                     Send to Council
                  </button>
               </div>
            </div>

         </div>
      </div>
   );
};

export default DebateOverlay;