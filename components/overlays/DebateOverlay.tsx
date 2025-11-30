import React, { useState, useEffect, useRef } from 'react';
import { TensionPair, Counselor, CouncilResponse } from '../../types';
import { injectIntoDebate } from '../../services/CouncilService';

interface DebateOverlayProps {
   pair: TensionPair;
   counselors: Counselor[];
   dynamicData?: CouncilResponse['tensions'][0]; // Optional dynamic data
   onClose: () => void;
   dilemma: string; // Needed for context
}

// Helper to map counselor colors to Tailwind classes
const getColorClasses = (color: string) => {
   const map: Record<string, any> = {
      blue: {
         bg: 'bg-blue-500/20',
         border: 'border-blue-400/50',
         text: 'text-blue-400',
         shadow: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]',
         gradient: 'from-blue-900/20',
         panelBg: 'bg-blue-950/40',
         panelBorder: 'border-blue-500/30'
      },
      green: {
         bg: 'bg-emerald-500/20',
         border: 'border-emerald-400/50',
         text: 'text-emerald-400',
         shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
         gradient: 'from-emerald-900/20',
         panelBg: 'bg-emerald-950/40',
         panelBorder: 'border-emerald-500/30'
      },
      yellow: {
         bg: 'bg-amber-500/20',
         border: 'border-amber-400/50',
         text: 'text-amber-400',
         shadow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]',
         gradient: 'from-amber-900/20',
         panelBg: 'bg-amber-950/40',
         panelBorder: 'border-amber-500/30'
      },
      purple: {
         bg: 'bg-purple-500/20',
         border: 'border-purple-400/50',
         text: 'text-purple-400',
         shadow: 'shadow-[0_0_15px_rgba(168,85,247,0.3)]',
         gradient: 'from-purple-900/20',
         panelBg: 'bg-purple-950/40',
         panelBorder: 'border-purple-500/30'
      },
      red: {
         bg: 'bg-red-500/20',
         border: 'border-red-400/50',
         text: 'text-red-400',
         shadow: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]',
         gradient: 'from-red-900/20',
         panelBg: 'bg-red-950/40',
         panelBorder: 'border-red-500/30'
      }
   };
   return map[color] || map['blue'];
};

const DebateOverlay: React.FC<DebateOverlayProps> = ({ pair, counselors, dynamicData, onClose, dilemma }) => {
   const [showMap, setShowMap] = useState(false);
   const [dialogue, setDialogue] = useState<{speaker: string, text: string}[]>(dynamicData?.dialogue || []);
   const [mapState, setMapState] = useState({
      core_issue: dynamicData?.core_issue || '',
      c1_claim: dynamicData?.c1_claim || '',
      c1_evidence: dynamicData?.c1_evidence || '',
      c2_claim: dynamicData?.c2_claim || '',
      c2_evidence: dynamicData?.c2_evidence || ''
   });
   const [userInput, setUserInput] = useState('');
   const [isSending, setIsSending] = useState(false);
   const scrollRef = useRef<HTMLDivElement>(null);

   const c1 = counselors.find(c => c.id === pair.counselor1);
   const c2 = counselors.find(c => c.id === pair.counselor2);

   // Auto-scroll to bottom when dialogue updates
   useEffect(() => {
      if (scrollRef.current) {
         scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
   }, [dialogue]);

   if (!c1 || !c2) return null;

   const c1Colors = getColorClasses(c1.color);
   const c2Colors = getColorClasses(c2.color);

   const handleSend = async () => {
      if (!userInput.trim() || isSending || !dynamicData) return;

      const currentInput = userInput;
      setUserInput('');
      setIsSending(true);

      // Optimistically add user message
      const newHistory = [...dialogue, { speaker: 'user', text: currentInput }];
      setDialogue(newHistory);

      try {
         console.log("Sending injection to council...");
         const response = await injectIntoDebate(
            dilemma,
            { 
               core_issue: mapState.core_issue, 
               counselor_ids: dynamicData.counselor_ids,
               c1_claim: mapState.c1_claim,
               c1_evidence: mapState.c1_evidence,
               c2_claim: mapState.c2_claim,
               c2_evidence: mapState.c2_evidence
            },
            newHistory,
            currentInput,
            [c1, c2]
         );
         console.log("Received response from council:", response);

         if (!response.dialogue || !Array.isArray(response.dialogue)) {
            throw new Error("Invalid response from Council");
         }

         setDialogue([...newHistory, ...response.dialogue]);
         
         // Update map state if provided
         if (response.mapState) {
            setMapState(response.mapState);
         }
      } catch (error) {
         console.error("Failed to inject into debate:", error);
         alert("The Council was unable to hear you. Please try again.");
         // Revert optimistic update on error
         setDialogue(dialogue);
      } finally {
         setIsSending(false);
      }
   };

   const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
         e.preventDefault();
         handleSend();
      }
   };

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
         {/* Backdrop */}
         <div className="absolute inset-0 bg-[var(--overlay-backdrop)] backdrop-blur-sm" onClick={onClose}></div>

         {/* Main Container - Council Clash Style */}
         <div className="relative w-full max-w-5xl h-[85vh] bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border-subtle)] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
            
            {/* Split Backgrounds (Only visible in Dialogue mode) */}
            {!showMap && (
               <div className="absolute inset-0 flex pointer-events-none">
                  <div className={`w-1/2 bg-gradient-to-r ${c1Colors.gradient} to-transparent opacity-30`}></div>
                  <div className={`w-1/2 bg-gradient-to-l ${c2Colors.gradient} to-transparent opacity-30`}></div>
               </div>
            )}

            {/* Center Divider (Only visible in Dialogue mode) */}
            {!showMap && (
               <div className="absolute inset-y-0 left-1/2 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent pointer-events-none"></div>
            )}

            {/* Header */}
            <header className="relative z-20 flex items-center justify-between p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-glass)] backdrop-blur-md">
               <div className="flex flex-col">
                  <h2 className="text-2xl font-bold tracking-widest text-[var(--text-primary)] uppercase font-orbitron">
                     {showMap ? 'Argument Map' : 'Council Clash'}
                  </h2>
                  <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-[0.2em]">
                     Conflict: {dynamicData?.core_issue || "Analyzing Tension..."}
                  </p>
               </div>
               
               <div className="flex items-center gap-4">
                  <button
                     onClick={() => setShowMap(!showMap)}
                     className="px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wider border border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)]"
                  >
                     {showMap ? 'View Dialogue' : 'View Map'}
                  </button>
                  <button 
                     onClick={onClose}
                     className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  >
                     <span className="material-symbols-outlined">close</span>
                  </button>
               </div>
            </header>

            {/* Content Body */}
            <div ref={scrollRef} className="relative z-10 flex-grow overflow-y-auto overflow-x-hidden scroll-smooth">
               {!showMap ? (
                  /* Council Clash Dialogue View */
                  <div className="p-8 space-y-8 min-h-full">
                     {dialogue.length > 0 ? (
                        dialogue.map((turn, idx) => {
                           if (turn.speaker === 'user') {
                              return (
                                 <div key={idx} className="flex justify-center w-full animate-fade-in">
                                    <div className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] px-6 py-3 rounded-full shadow-lg text-sm max-w-2xl text-center backdrop-blur-md">
                                       <span className="font-bold text-[var(--text-secondary)] mr-2">YOU:</span>
                                       {turn.text}
                                    </div>
                                 </div>
                              );
                           }

                           const speaker = counselors.find(c => c.id === turn.speaker || c.role === turn.speaker || c.name === turn.speaker);
                           if (!speaker) {
                              console.warn(`Could not find speaker for ID: ${turn.speaker}. Available IDs:`, counselors.map(c => c.id));
                              return null;
                           }
                           
                           const isC1 = speaker.id === c1.id;
                           const colors = isC1 ? c1Colors : c2Colors;
                           
                           return (
                              <div 
                                 key={idx} 
                                 className={`flex items-start gap-4 w-full md:w-2/3 ${isC1 ? '' : 'ml-auto flex-row-reverse'} animate-slide-in-right`}
                                 style={{ animationDelay: `${idx * 100}ms` }}
                              >
                                 {/* Avatar */}
                                 <div className={`
                                    w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center border
                                    ${colors.bg} ${colors.border} ${colors.shadow}
                                 `}>
                                    <span className={`material-symbols-outlined ${colors.text}`}>
                                       {speaker.icon}
                                    </span>
                                 </div>

                                 {/* Message Bubble */}
                                 <div className={`flex-1 min-w-0 ${isC1 ? 'text-left' : 'text-right'}`}>
                                    <div className={`text-xs mb-1 font-bold tracking-wider uppercase ${colors.text}`}>
                                       {speaker.name}
                                    </div>
                                    <div className={`
                                       p-5 text-sm leading-relaxed text-[var(--text-primary)] shadow-lg backdrop-blur-sm border
                                       ${colors.panelBg} ${colors.panelBorder}
                                       ${isC1 ? 'rounded-r-2xl rounded-bl-2xl' : 'rounded-l-2xl rounded-br-2xl'}
                                    `}>
                                       {turn.text}
                                    </div>
                                 </div>
                              </div>
                           );
                        })
                     ) : (
                        /* Static Fallback */
                        <>
                           {/* Message 1 (Left - C1) */}
                           <div className="flex items-start gap-4 w-full md:w-2/3">
                              <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center border ${c1Colors.bg} ${c1Colors.border} ${c1Colors.shadow}`}>
                                 <span className={`material-symbols-outlined ${c1Colors.text}`}>{c1.icon}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                 <div className={`text-xs mb-1 font-bold tracking-wider uppercase ${c1Colors.text}`}>{c1.name}</div>
                                 <div className={`p-5 text-sm leading-relaxed text-[var(--text-primary)] shadow-lg backdrop-blur-sm border ${c1Colors.panelBg} ${c1Colors.panelBorder} rounded-r-2xl rounded-bl-2xl`}>
                                    We must define the scope to manage it. Without boundaries, there is only chaos.
                                 </div>
                              </div>
                           </div>

                           {/* Message 2 (Right - C2) */}
                           <div className="flex items-start gap-4 w-full md:w-2/3 ml-auto flex-row-reverse">
                              <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center border ${c2Colors.bg} ${c2Colors.border} ${c2Colors.shadow}`}>
                                 <span className={`material-symbols-outlined ${c2Colors.text}`}>{c2.icon}</span>
                              </div>
                              <div className="flex-1 min-w-0 text-right">
                                 <div className={`text-xs mb-1 font-bold tracking-wider uppercase ${c2Colors.text}`}>{c2.name}</div>
                                 <div className={`p-5 text-sm leading-relaxed text-[var(--text-primary)] shadow-lg backdrop-blur-sm border ${c2Colors.panelBg} ${c2Colors.panelBorder} rounded-l-2xl rounded-br-2xl text-left`}>
                                    Defining the scope limits our perception of the danger. You blind yourself willingly.
                                 </div>
                              </div>
                           </div>
                        </>
                     )}
                     
                     {isSending && (
                        <div className="flex justify-center w-full py-4">
                           <div className="flex space-x-2">
                              <div className="w-2 h-2 bg-[var(--text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-2 h-2 bg-[var(--text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-2 h-2 bg-[var(--text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                           </div>
                        </div>
                     )}
                  </div>
               ) : (
                  /* Argument Map View (Preserved but styled) */
                  <div className="p-12 flex flex-col items-center h-full justify-center relative">
                     {/* Background Lines (SVG) */}
                     <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" viewBox="0 0 800 600">
                        <path d="M 400 100 L 400 180" stroke="#94a3b8" strokeWidth="2" />
                        <path d="M 400 180 L 200 250" stroke="#94a3b8" strokeWidth="2" fill="none" />
                        <path d="M 400 180 L 600 250" stroke="#94a3b8" strokeWidth="2" fill="none" />
                        <path d="M 200 350 Q 400 500 600 350" stroke="#ef4444" strokeWidth="2" strokeDasharray="6 6" fill="none" />
                     </svg>

                     <div className="relative z-10 text-center bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] px-6 py-3 rounded-lg shadow-lg mb-16 backdrop-blur-md">
                        <span className="text-lg font-bold text-[var(--text-primary)]">Core Conflict: {mapState.core_issue || "Analyzing Tension..."}</span>
                     </div>

                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-32 w-full max-w-4xl">
                        {/* Left Side */}
                        <div className="flex flex-col space-y-6">
                           <div className={`bg-[var(--bg-tertiary)] border-l-4 ${c1Colors.border.replace('/50','')} p-4 rounded-r-lg shadow-lg backdrop-blur-md`}>
                              <span className={`text-xs font-bold uppercase ${c1Colors.text}`}>{c1.name}'s Proposition</span>
                              <p className="text-sm text-[var(--text-secondary)] mt-1">{mapState.c1_claim || "Formulating argument..."}</p>
                           </div>
                           <div className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] p-3 rounded-lg text-center backdrop-blur-sm">
                              <span className={`text-xs font-bold uppercase ${c1Colors.text}`}>Evidence</span>
                              <p className="text-xs text-[var(--text-tertiary)] mt-1">{mapState.c1_evidence || "Gathering evidence..."}</p>
                           </div>
                        </div>

                        {/* Right Side */}
                        <div className="flex flex-col space-y-6">
                           <div className={`bg-[var(--bg-tertiary)] border-l-4 ${c2Colors.border.replace('/50','')} p-4 rounded-r-lg shadow-lg backdrop-blur-md`}>
                              <span className={`text-xs font-bold uppercase ${c2Colors.text}`}>{c2.name}'s Proposition</span>
                              <p className="text-sm text-[var(--text-secondary)] mt-1">{mapState.c2_claim || "Formulating argument..."}</p>
                           </div>
                           <div className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] p-3 rounded-lg text-center backdrop-blur-sm">
                              <span className={`text-xs font-bold uppercase ${c2Colors.text}`}>Evidence</span>
                              <p className="text-xs text-[var(--text-tertiary)] mt-1">{mapState.c2_evidence || "Gathering evidence..."}</p>
                           </div>
                        </div>
                     </div>
                  </div>
               )}
            </div>

            {/* Input Area */}
            <div className="relative z-20 p-6 border-t border-[var(--border-subtle)] bg-[var(--bg-glass)] backdrop-blur-md">
               <div className="flex flex-col sm:flex-row gap-4">
                  <input
                     type="text"
                     value={userInput}
                     onChange={(e) => setUserInput(e.target.value)}
                     onKeyDown={handleKeyDown}
                     disabled={isSending}
                     placeholder={isSending ? "The Council is deliberating..." : "Inject your comment or question..."}
                     className="flex-grow bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm placeholder-[var(--text-muted)] transition-all disabled:opacity-50"
                  />
                  <button 
                     onClick={handleSend}
                     disabled={isSending || !userInput.trim()}
                     className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-500/20 text-sm whitespace-nowrap transition-all hover:scale-105 active:scale-95"
                  >
                     {isSending ? 'Sending...' : 'Send to Council'}
                  </button>
               </div>
            </div>

         </div>
      </div>
   );
};

export default DebateOverlay;
