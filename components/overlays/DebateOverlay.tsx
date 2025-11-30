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
   const [showMatrix, setShowMatrix] = useState(false);
   const [dialogue, setDialogue] = useState<{speaker: string, text: string}[]>(dynamicData?.dialogue || []);
   
   // Matrix State
   const [matrixState, setMatrixState] = useState(dynamicData?.matrix || { criteria: [] });
   const [userWeights, setUserWeights] = useState<Record<string, number>>({});

   const [userInput, setUserInput] = useState('');
   const [isSending, setIsSending] = useState(false);
   const scrollRef = useRef<HTMLDivElement>(null);

   const [newCriterion, setNewCriterion] = useState('');
   const [isAddingCriterion, setIsAddingCriterion] = useState(false);

   const c1 = counselors.find(c => c.id === pair.counselor1);
   const c2 = counselors.find(c => c.id === pair.counselor2);

   // Initialize weights
   useEffect(() => {
      if (matrixState.criteria.length > 0) {
         setUserWeights(prev => {
            const next = { ...prev };
            let changed = false;
            matrixState.criteria.forEach(c => {
               if (next[c.id] === undefined) {
                  next[c.id] = 50;
                  changed = true;
               }
            });
            return changed ? next : prev;
         });
      }
   }, [matrixState]);

   // Auto-scroll to bottom when dialogue updates
   useEffect(() => {
      if (scrollRef.current) {
         scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
   }, [dialogue]);

   if (!c1 || !c2) return null;

   const c1Colors = getColorClasses(c1.color);
   const c2Colors = getColorClasses(c2.color);

   const handleWeightChange = (id: string, val: string) => {
      setUserWeights(prev => ({ ...prev, [id]: parseInt(val) }));
   };

   const calculateScores = () => {
      let c1Total = 0;
      let c2Total = 0;
      let maxPossible = 0;

      matrixState.criteria.forEach(c => {
         const weight = userWeights[c.id] ?? 50;
         c1Total += c.c1_score * weight;
         c2Total += c.c2_score * weight;
         maxPossible += 10 * weight;
      });

      if (maxPossible === 0) return { c1Percent: 0, c2Percent: 0 };

      return {
         c1Percent: Math.round((c1Total / maxPossible) * 100),
         c2Percent: Math.round((c2Total / maxPossible) * 100)
      };
   };

   const { c1Percent, c2Percent } = calculateScores();
   const isBalanced = Math.abs(c1Percent - c2Percent) <= 5;

   const handleAddCriterion = async () => {
      if (!newCriterion.trim() || isAddingCriterion || !dynamicData) return;

      const criterionLabel = newCriterion;
      setNewCriterion('');
      setIsAddingCriterion(true);

      try {
         console.log("Adding criterion...");
         const response = await injectIntoDebate(
            dilemma,
            { 
               core_issue: dynamicData.core_issue, 
               counselor_ids: dynamicData.counselor_ids,
               matrix: matrixState
            },
            dialogue, // Pass existing dialogue
            `Please add the criterion "${criterionLabel}" to the decision matrix and score it for both counselors (1-10) with reasoning.`,
            [c1, c2]
         );

         if (response.mapState && response.mapState.matrix) {
            setMatrixState(response.mapState.matrix);
         }
      } catch (error) {
         console.error("Failed to add criterion:", error);
         alert("Failed to add criterion. Please try again.");
      } finally {
         setIsAddingCriterion(false);
      }
   };

   const handleRemoveCriterion = (id: string) => {
      setMatrixState(prev => ({
         ...prev,
         criteria: prev.criteria.filter(c => c.id !== id)
      }));
      setUserWeights(prev => {
         const next = { ...prev };
         delete next[id];
         return next;
      });
   };

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
         // Note: We are passing the matrix state now instead of the old map state
         const response = await injectIntoDebate(
            dilemma,
            { 
               core_issue: dynamicData.core_issue, 
               counselor_ids: dynamicData.counselor_ids,
               matrix: matrixState
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
         
         // Update matrix state if provided
         if (response.mapState && response.mapState.matrix) {
            setMatrixState(response.mapState.matrix);
         }
      } catch (error) {
         console.error("Failed to inject into debate:", error);
         alert("The Council was unable to hear you. Please try again.");
         setDialogue(dialogue); // Revert
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

         {/* Main Container */}
         <div className="relative w-full max-w-5xl h-[85vh] bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border-subtle)] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
            
            {/* Split Backgrounds (Only visible in Dialogue mode) */}
            {!showMatrix && (
               <div className="absolute inset-0 flex pointer-events-none">
                  <div className={`w-1/2 bg-gradient-to-r ${c1Colors.gradient} to-transparent opacity-30`}></div>
                  <div className={`w-1/2 bg-gradient-to-l ${c2Colors.gradient} to-transparent opacity-30`}></div>
               </div>
            )}

            {/* Center Divider (Only visible in Dialogue mode) */}
            {!showMatrix && (
               <div className="absolute inset-y-0 left-1/2 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent pointer-events-none"></div>
            )}

            {/* Header */}
            <header className="relative z-20 flex items-center justify-between p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-glass)] backdrop-blur-md">
               <div className="flex flex-col">
                  <h2 className="text-2xl font-bold tracking-widest text-[var(--text-primary)] uppercase font-orbitron">
                     {showMatrix ? 'Decision Matrix' : 'Council Clash'}
                  </h2>
                  <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-[0.2em]">
                     Conflict: {dynamicData?.core_issue || "Analyzing Tension..."}
                  </p>
               </div>
               
               <div className="flex items-center gap-4">
                  <button
                     onClick={() => setShowMatrix(!showMatrix)}
                     className="px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wider border border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)]"
                  >
                     {showMatrix ? 'View Dialogue' : 'View Matrix'}
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
               {!showMatrix ? (
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

                           const speaker = counselors.find(c => c.id === turn.speaker);
                           if (!speaker) {
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
                                       {speaker.name.replace(/^The /, '')}
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
                        <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
                           Initializing debate...
                        </div>
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
                  /* Decision Matrix View */
                  <div className="p-8 flex flex-col items-center min-h-full">
                     <div className="w-full max-w-4xl">
                        {/* Header Row */}
                        <div className="grid grid-cols-12 gap-4 mb-6 text-center px-4">
                           <div className="col-span-4 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Criteria</div>
                           <div className="col-span-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Your Priority (Weight)</div>
                           <div className={`col-span-2 text-xs font-bold uppercase tracking-wider ${c1Colors.text}`}>{c1.name.replace(/^The /, '')}</div>
                           <div className={`col-span-2 text-xs font-bold uppercase tracking-wider ${c2Colors.text}`}>{c2.name.replace(/^The /, '')}</div>
                           <div className="col-span-1"></div>
                        </div>

                        {/* Criteria Rows */}
                        {matrixState.criteria.map((criterion) => (
                           <div key={criterion.id} className="grid grid-cols-12 gap-4 items-center mb-4 p-4 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-primary)] transition-colors group relative">
                              
                              {/* Tooltip for Reasoning */}
                              <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full bg-black/90 text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-64 text-center z-50 mb-2">
                                 {criterion.reasoning}
                                 <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-4 border-transparent border-t-black/90"></div>
                              </div>

                              <div className="col-span-4 font-bold text-sm text-[var(--text-primary)]">{criterion.label}</div>
                              
                              <div className="col-span-3 flex items-center gap-2">
                                 <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    value={userWeights[criterion.id] ?? 50} 
                                    onChange={(e) => handleWeightChange(criterion.id, e.target.value)}
                                    className="w-full h-1 bg-transparent cursor-pointer" 
                                 />
                              </div>
                              
                              <div className={`col-span-2 text-center font-mono font-bold ${c1Colors.text}`}>
                                 {criterion.c1_score}
                              </div>
                              <div className={`col-span-2 text-center font-mono font-bold ${c2Colors.text}`}>
                                 {criterion.c2_score}
                              </div>
                              <div className="col-span-1 flex justify-end">
                                 <button 
                                    onClick={() => handleRemoveCriterion(criterion.id)}
                                    className="text-[var(--text-muted)] hover:text-red-400 transition-colors p-1 rounded-full hover:bg-[var(--bg-secondary)]"
                                    title="Remove Criterion"
                                 >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                 </button>
                              </div>
                           </div>
                        ))}

                        {/* Add New Criterion Row */}
                        <div className="grid grid-cols-12 gap-4 items-center mb-4 p-4 bg-[var(--bg-tertiary)]/50 rounded-xl border border-dashed border-[var(--border-subtle)] hover:border-[var(--border-primary)] transition-colors">
                           <div className="col-span-7">
                              <input
                                 type="text"
                                 value={newCriterion}
                                 onChange={(e) => setNewCriterion(e.target.value)}
                                 placeholder="Add your own criterion..."
                                 className="w-full bg-transparent border-none text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-0"
                                 onKeyDown={(e) => e.key === 'Enter' && handleAddCriterion()}
                              />
                           </div>
                           <div className="col-span-5 flex justify-end">
                              <button
                                 onClick={handleAddCriterion}
                                 disabled={!newCriterion.trim() || isAddingCriterion}
                                 className="px-4 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)] transition-all disabled:opacity-50"
                              >
                                 {isAddingCriterion ? 'Scoring...' : 'Score'}
                              </button>
                           </div>
                        </div>

                        {/* Total Score */}
                        <div className="grid grid-cols-12 gap-4 mt-8 pt-6 border-t border-[var(--border-subtle)]">
                           <div className="col-span-7 text-right font-bold text-lg uppercase tracking-widest text-[var(--text-muted)] flex items-center justify-end h-full">
                              Weighted Alignment
                           </div>
                           <div className={`col-span-2 text-center text-2xl font-bold font-orbitron ${c1Colors.text}`}>
                              {c1Percent}%
                           </div>
                           <div className={`col-span-2 text-center text-2xl font-bold font-orbitron ${c2Colors.text}`}>
                              {c2Percent}%
                           </div>
                           <div className="col-span-1"></div>
                        </div>
                        
                        <div className="mt-8 text-center animate-fade-in">
                           {isBalanced ? (
                              <p className="text-sm text-[var(--text-secondary)]">
                                 <span className="text-indigo-400 font-bold">Balanced Approach:</span> Both perspectives align closely with your priorities. Consider a synthesis.
                              </p>
                           ) : (
                              <p className="text-sm text-[var(--text-secondary)]">
                                 Based on your priorities, <span className={`font-bold ${c1Percent > c2Percent ? c1Colors.text : c2Colors.text}`}>
                                    {c1Percent > c2Percent ? c1.name.replace(/^The /, '') : c2.name.replace(/^The /, '')}'s
                                 </span> approach aligns better with your goals.
                              </p>
                           )}
                        </div>
                     </div>
                  </div>
               )}
            </div>

            {/* Input Area - Only visible in Dialogue Mode */}
            {!showMatrix && (
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
            )}

         </div>
      </div>
   );
};


export default DebateOverlay;
