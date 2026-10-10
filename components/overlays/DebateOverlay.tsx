import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { TensionPair, Counselor, CouncilResponse, DebateInterjection, MemorySource } from '../../types';
import { injectIntoDebate } from '../../services/CouncilService';
import { debateInjectionText, interjectionFrom, DebateRequest } from '../../utils/debateInterjection';
import { groupColor } from '../../utils/groupColor';

interface DebateOverlayProps {
   pair: TensionPair;
   counselors: Counselor[];
   dynamicData?: CouncilResponse['tensions'][0]; // Optional dynamic data
   onClose: () => void;
   dilemma: string; // Needed for context
   memorySources: MemorySource[]; // Earlier session turns the counselors can recall
   onInterjection: (interjection: DebateInterjection) => void; // Called after a user's own words reach the council
}

const DebateOverlay: React.FC<DebateOverlayProps> = ({ pair, counselors, dynamicData, onClose, dilemma, memorySources, onInterjection }) => {
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
   
   // Controls staggered revealing of messages
   const [visibleCount, setVisibleCount] = useState(0);

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

   // Staggered message revealing effect
   useEffect(() => {
      if (visibleCount < dialogue.length) {
         const nextMsg = dialogue[visibleCount];
         const isUser = nextMsg?.speaker === 'user';
         // User messages appear instantly. AI messages have a delay.
         // First message has a shorter delay to feel responsive.
         const delay = isUser ? 0 : (visibleCount === 0 ? 500 : 2000);
         
         const timer = setTimeout(() => {
            setVisibleCount(prev => prev + 1);
         }, delay);
         
         return () => clearTimeout(timer);
      }
   }, [visibleCount, dialogue]);

   // Auto-scroll to bottom when new message becomes visible
   useEffect(() => {
      if (scrollRef.current) {
         scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth'
         });
      }
   }, [visibleCount]);

   if (!c1 || !c2) return null;

   const c1Color = groupColor(c1.role);
   const c2Color = groupColor(c2.role);

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

      // Not recorded as a memory: the instruction is synthetic, not the user's words.
      const request: DebateRequest = { kind: 'criterion', label: newCriterion };
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
            debateInjectionText(request),
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

      const request: DebateRequest = { kind: 'interjection', text: userInput };
      const sentAt = Date.now();
      setUserInput('');
      setIsSending(true);

      // Optimistically add user message
      const newHistory = [...dialogue, { speaker: 'user', text: request.text }];
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
            debateInjectionText(request),
            [c1, c2],
            memorySources
         );
         console.log("Received response from council:", response);

         if (!response.dialogue || !Array.isArray(response.dialogue)) {
            throw new Error("Invalid response from Council");
         }

         setDialogue([...newHistory, ...response.dialogue]);
         const interjection = interjectionFrom(request, pair, dialogue, sentAt);
         if (interjection) onInterjection(interjection);
         
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
      <div className="absolute inset-0 z-50 flex items-center justify-center p-4 font-body">
         {/* Backdrop */}
         <div className="absolute inset-0 bg-[var(--veil)]" onClick={onClose}></div>

         {/* Main Container */}
         <div className="relative w-full max-w-5xl h-[85vh] bg-[var(--paper)] border border-[var(--ink)] flex flex-col overflow-hidden animate-fade-in">
            
            {/* Header */}
            <header className="relative z-20 flex items-center justify-between gap-4 px-8 py-6 border-b border-[var(--rule)] bg-[var(--paper)]">
               <div className="flex flex-col">
                  <h2 className="display !text-[34px] text-[var(--ink)]">
                     {showMatrix ? 'Decision Matrix' : 'Council Clash'}
                  </h2>
                  <p className="italic text-[var(--ink2)] mt-1">
                     Conflict: {dynamicData?.core_issue || "Analyzing Tension..."}
                  </p>
               </div>
               
               <div className="flex items-center gap-4">
                  <button
                     onClick={() => setShowMatrix(!showMatrix)}
                     className="btn-link whitespace-nowrap"
                  >
                     {showMatrix ? 'View Dialogue' : 'View Matrix'}
                  </button>
                  <button 
                     onClick={onClose}
                     className="w-10 h-10 flex items-center justify-center transition-colors text-[var(--ink2)] hover:text-[var(--ink)]"
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
                     {dialogue.slice(0, visibleCount).map((turn, idx) => {
                           if (turn.speaker === 'user') {
                              return (
                                 <div key={idx} className="flex justify-center w-full animate-fade-in">
                                    <div className="border-l-2 border-[var(--seal)] text-[var(--ink)] pl-4 py-1 italic max-w-2xl">
                                       <span className="label not-italic mr-2">You</span>
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
                           const color = isC1 ? c1Color : c2Color;
                           
                           return (
                              <div 
                                 key={idx} 
                                 className={`flex items-start gap-4 w-full md:w-2/3 ${isC1 ? 'animate-slide-in-left' : 'ml-auto flex-row-reverse animate-slide-in-right'}`}
                              >
                                 {/* Avatar */}
                                 <div
                                    className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center border-[1.6px]"
                                    style={{ borderColor: color, color, backgroundColor: 'var(--paper2)' }}
                                 >
                                    <span className="material-symbols-outlined">
                                       {speaker.icon}
                                    </span>
                                 </div>

                                 {/* Message Bubble */}
                                 <div className={`flex-1 min-w-0 ${isC1 ? 'text-left' : 'text-right'}`}>
                                    <div className="label mb-1" style={{ color }}>
                                       {speaker.name.replace(/^The /, '')}
                                    </div>
                                    <div className="py-3 text-[15px] leading-relaxed text-[var(--ink)] border-t border-[var(--rule)]">
                                       <ReactMarkdown
                                          components={{
                                             p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                                             strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                                             em: ({children}) => <em className="italic">{children}</em>,
                                             ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                                             ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                                             li: ({children}) => <li className="ml-2">{children}</li>
                                          }}
                                       >
                                          {turn.text}
                                       </ReactMarkdown>
                                    </div>
                                 </div>
                              </div>
                           );
                        })}
                     
                     {isSending && (
                        <div className="flex justify-center w-full py-4">
                           <div className="flex space-x-2">
                              <div className="w-2 h-2 bg-[var(--ink2)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-2 h-2 bg-[var(--ink2)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-2 h-2 bg-[var(--ink2)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
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
                           <div className="col-span-4 text-left label">Criteria</div>
                           <div className="col-span-3 label">Your Priority (Weight)</div>
                           <div className="col-span-2 label" style={{ color: c1Color }}>{c1.name.replace(/^The /, '')}</div>
                           <div className="col-span-2 label" style={{ color: c2Color }}>{c2.name.replace(/^The /, '')}</div>
                           <div className="col-span-1"></div>
                        </div>

                        {/* Criteria Rows */}
                        {matrixState.criteria.map((criterion, index) => (
                           <div key={criterion.id} className="grid grid-cols-12 gap-4 items-center px-4 py-3 border-t border-[var(--rule)] hover:bg-[var(--paper2)] transition-colors group relative">
                              
                              {/* Tooltip for Reasoning */}
                              <div className={`absolute left-1/2 -translate-x-1/2 bg-[var(--ink)] text-[var(--paper)] text-[13px] p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-80 text-center z-[60] ${
                                 index < 2 
                                    ? 'top-full mt-3' 
                                    : 'bottom-full mb-3'
                              }`}>
                                 <div className="font-display text-lg font-semibold mb-1">{criterion.label}</div>
                                 <div className="leading-relaxed">{criterion.reasoning}</div>
                                 
                                 {/* Arrow */}
                                 <div className={`absolute left-1/2 -translate-x-1/2 border-8 border-transparent ${
                                    index < 2
                                       ? 'bottom-full border-b-[var(--ink)]'
                                       : 'top-full border-t-[var(--ink)]'
                                 }`}></div>
                              </div>

                              <div className="col-span-4 font-display text-xl font-semibold leading-tight text-[var(--ink)]">{criterion.label}</div>
                              
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
                              
                              <div className="col-span-2 text-center font-display text-[22px] font-semibold tabular-nums" style={{ color: c1Color }}>
                                 {criterion.c1_score}
                              </div>
                              <div className="col-span-2 text-center font-display text-[22px] font-semibold tabular-nums" style={{ color: c2Color }}>
                                 {criterion.c2_score}
                              </div>
                              <div className="col-span-1 flex justify-end">
                                 <button 
                                    onClick={() => handleRemoveCriterion(criterion.id)}
                                    className="text-[var(--ink2)] hover:text-[var(--seal)] transition-colors p-1"
                                    title="Remove Criterion"
                                 >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                 </button>
                              </div>
                           </div>
                        ))}

                        {/* Add New Criterion Row */}
                        <div className="grid grid-cols-12 gap-4 items-center px-4 py-3 border-y border-[var(--rule)]">
                           <div className="col-span-7">
                              <input
                                 type="text"
                                 value={newCriterion}
                                 onChange={(e) => setNewCriterion(e.target.value)}
                                 placeholder="Add your own criterion..."
                                 className="w-full bg-transparent border-none italic text-[var(--ink)] placeholder-[var(--ink2)] focus:outline-none"
                                 onKeyDown={(e) => e.key === 'Enter' && handleAddCriterion()}
                              />
                           </div>
                           <div className="col-span-5 flex justify-end">
                              <button
                                 onClick={handleAddCriterion}
                                 disabled={!newCriterion.trim() || isAddingCriterion}
                                 className="btn-link"
                              >
                                 {isAddingCriterion ? 'Scoring...' : 'Score'}
                              </button>
                           </div>
                        </div>

                        {/* Total Score */}
                        <div className="grid grid-cols-12 gap-4 mt-8 pt-6 border-t border-[var(--ink)]">
                           <div className="col-span-7 label !text-[13px] flex items-center justify-end h-full">
                              Weighted Alignment
                           </div>
                           <div className="col-span-2 text-center font-display text-[28px] font-semibold tabular-nums" style={{ color: c1Color }}>
                              {c1Percent}%
                           </div>
                           <div className="col-span-2 text-center font-display text-[28px] font-semibold tabular-nums" style={{ color: c2Color }}>
                              {c2Percent}%
                           </div>
                           <div className="col-span-1"></div>
                        </div>
                        
                        <div className="mt-8 text-center animate-fade-in">
                           {isBalanced ? (
                              <p className="text-[var(--ink)]">
                                 <span className="font-semibold text-[var(--brass)]">Balanced Approach:</span> Both perspectives align closely with your priorities. Consider a synthesis.
                              </p>
                           ) : (
                              <p className="text-[var(--ink)]">
                                 Based on your priorities, <span className="font-semibold" style={{ color: c1Percent > c2Percent ? c1Color : c2Color }}>
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
               <div className="relative z-20 px-8 py-5 border-t border-[var(--ink)] bg-[var(--paper)]">
                  <div className="flex flex-col sm:flex-row gap-4">
                     <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isSending}
                        placeholder={isSending ? "The Council is deliberating..." : "Inject your comment or question..."}
                        className="flex-grow bg-transparent border-b border-[var(--rule)] py-2 italic text-[var(--ink)] focus:outline-none focus:border-[var(--ink)] placeholder-[var(--ink2)] transition-all disabled:opacity-50"
                     />
                     <button 
                        onClick={handleSend}
                        disabled={isSending || !userInput.trim()}
                        className="btn-seal whitespace-nowrap"
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
