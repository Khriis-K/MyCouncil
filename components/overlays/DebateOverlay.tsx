import React, { useState, useEffect, useRef } from 'react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import ReactMarkdown from 'react-markdown';
import { TensionPair, Counselor, CouncilResponse, DebateInterjection, MemorySource } from '../../types';
import { injectIntoDebate } from '../../services/CouncilService';
import { debateInjectionText, interjectionFrom, DebateRequest } from '../../utils/debateInterjection';
import { groupColor } from '../../utils/groupColor';
import { higherScore, debateTitle, weightedAlignment, DEFAULT_WEIGHT } from '../../utils/pointsOfContention';

interface DebateOverlayProps {
   pair: TensionPair;
   counselors: Counselor[];
   dynamicData?: CouncilResponse['tensions'][0]; // Optional dynamic data
   onClose: () => void;
   dilemma: string; // Needed for context
   memorySources: MemorySource[]; // Earlier session turns the counselors can recall
   onInterjection: (interjection: DebateInterjection) => void; // Called after a user's own words reach the council
   // Unsent interjection and criterion, kept by the caller so they survive closing the debate
   interjectionDraft: string;
   onInterjectionDraftChange: (draft: string) => void;
   criterionDraft: string;
   onCriterionDraftChange: (draft: string) => void;
}

const DebateOverlay: React.FC<DebateOverlayProps> = ({
   pair,
   counselors,
   dynamicData,
   onClose,
   dilemma,
   memorySources,
   onInterjection,
   interjectionDraft,
   onInterjectionDraftChange,
   criterionDraft,
   onCriterionDraftChange
}) => {
   const [dialogue, setDialogue] = useState<{speaker: string, text: string}[]>(dynamicData?.dialogue || []);
   
   // Matrix State
   const [matrixState, setMatrixState] = useState(dynamicData?.matrix || { criteria: [] });
   const [userWeights, setUserWeights] = useState<Record<string, number>>({});

   const [isSending, setIsSending] = useState(false);
   const linesEndRef = useRef<HTMLDivElement>(null);

   const [isAddingCriterion, setIsAddingCriterion] = useState(false);
   
   // Controls staggered revealing of messages
   const [visibleCount, setVisibleCount] = useState(0);

   const c1 = counselors.find(c => c.id === pair.counselor1);
   const c2 = counselors.find(c => c.id === pair.counselor2);

   useEscapeKey(onClose); // Safe even mid-sentence: the drafts are kept by the caller

   // Initialize weights
   useEffect(() => {
      if (matrixState.criteria.length > 0) {
         setUserWeights(prev => {
            const next = { ...prev };
            let changed = false;
            matrixState.criteria.forEach(c => {
               if (next[c.id] === undefined) {
                  next[c.id] = DEFAULT_WEIGHT;
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

   // Keep the latest line in view: the transcript column scrolls on a desktop, the page on a phone.
   // 'nearest' leaves the view alone while the line is already showing, so a phone doesn't jump on open.
   useEffect(() => {
      if (visibleCount > 0 || isSending) {
         linesEndRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
   }, [visibleCount, isSending]);

   if (!c1 || !c2) return null;

   const c1Color = groupColor(c1.role);
   const c2Color = groupColor(c2.role);

   const handleWeightChange = (id: string, val: string) => {
      setUserWeights(prev => ({ ...prev, [id]: parseInt(val) }));
   };

   const scores = weightedAlignment(matrixState.criteria, userWeights);
   // A lone criterion has nothing to be weighed against, so it gets no slider
   const canWeigh = matrixState.criteria.length > 1;

   const handleAddCriterion = async () => {
      if (!criterionDraft.trim() || isAddingCriterion || !dynamicData) return;

      // Not recorded as a memory: the instruction is synthetic, not the user's words.
      const request: DebateRequest = { kind: 'criterion', label: criterionDraft };
      onCriterionDraftChange('');
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
      if (!interjectionDraft.trim() || isSending || !dynamicData) return;

      const request: DebateRequest = { kind: 'interjection', text: interjectionDraft };
      const sentAt = Date.now();
      onInterjectionDraftChange('');
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

   const title = debateTitle(c1.name, c2.name, pair.type);
   const shortName = (c: Counselor) => c.name.replace(/^The /, '');
   // Oxblood marks conflict, brass marks synthesis
   const markColor = pair.type === 'synthesis' ? 'text-brass' : 'text-seal';

   // A debate set as a transcript, with the points of contention beside it (below it on a phone).
   return (
      <div className="flex-grow min-h-0 overflow-y-auto md:overflow-hidden flex flex-col md:grid md:grid-cols-[1fr_430px] animate-fade-in">
         <section className="px-4 md:pl-24 md:pr-12 pt-7 flex flex-col md:min-h-0">
            <button type="button" onClick={onClose} className="caps text-ink2 hover:text-ink self-start">
               ← Back to the chamber
            </button>
            <h2 className="display !text-[34px] mt-2.5 mb-0.5">
               {title.first} <em>{title.joiner}</em> {title.second}
            </h2>
            <p className="italic text-ink2 mb-4">{dynamicData?.core_issue || 'Analyzing Tension...'}</p>

            {/* Reaches 14px into the gutter so the interjection rule, hung there, isn't clipped by the scroll box */}
            <div className="flex-1 flex flex-col gap-3 md:overflow-y-auto md:min-h-0 md:-ml-3.5 md:pl-3.5 pb-4">
               {dialogue.slice(0, visibleCount).map((turn, idx) => {
                  if (turn.speaker === 'user') {
                     return (
                        <div key={idx} className="grid md:grid-cols-[130px_1fr] gap-x-3.5 gap-y-0.5 text-[15px] leading-[1.5] border-l-2 border-seal pl-3 md:-ml-3.5 animate-fade-in">
                           <span className="label !text-seal pt-1">You, interjecting</span>
                           <p className="italic">{turn.text}</p>
                        </div>
                     );
                  }

                  const speaker = counselors.find(c => c.id === turn.speaker);
                  if (!speaker) return null;

                  return (
                     <div key={idx} className="grid md:grid-cols-[130px_1fr] gap-x-3.5 gap-y-0.5 text-[15px] leading-[1.5] animate-fade-in">
                        <span className="label pt-1" style={{ color: speaker.id === c1.id ? c1Color : c2Color }}>
                           {shortName(speaker)}
                        </span>
                        <div className="min-w-0">
                           <ReactMarkdown
                              components={{
                                 p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                                 strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                                 em: ({children}) => <em className="italic">{children}</em>,
                                 ul: ({children}) => <ul className="list-disc list-inside mb-2 last:mb-0 space-y-1">{children}</ul>,
                                 ol: ({children}) => <ol className="list-decimal list-inside mb-2 last:mb-0 space-y-1">{children}</ol>,
                                 li: ({children}) => <li className="ml-2">{children}</li>
                              }}
                           >
                              {turn.text}
                           </ReactMarkdown>
                        </div>
                     </div>
                  );
               })}

               {isSending && (
                  <p className="italic text-[13.5px] text-ink2">{title.first} and {title.second} are conferring…</p>
               )}
               <div ref={linesEndRef} />
            </div>

            <div className="border-t border-ink pt-3 pb-5 flex items-baseline gap-3">
               <input
                  type="text"
                  value={interjectionDraft}
                  onChange={(e) => onInterjectionDraftChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSending}
                  placeholder="Interject. Put your own view to both of them."
                  aria-label="Interject"
                  className="flex-1 min-w-0 bg-transparent py-1 italic text-ink focus:outline-none placeholder:text-ink2 disabled:opacity-50"
               />
               <button
                  type="button"
                  onClick={handleSend}
                  disabled={isSending || !interjectionDraft.trim()}
                  className="btn-link"
               >
                  {isSending ? 'Sending…' : 'Send'}
               </button>
            </div>
         </section>

         <aside className="border-t md:border-t-0 md:border-l border-rule px-4 md:px-[30px] pt-[26px] pb-8 md:overflow-y-auto md:min-h-0">
            <h3 className="label">Points of contention</h3>
            <table className="w-full mt-2 border-collapse">
               <thead>
                  <tr className="border-b border-rule">
                     <th className="label !text-[10.5px] text-left py-[11px]">Criterion</th>
                     <th className="label !text-[10.5px] text-center py-[11px] px-1">{shortName(c1)}</th>
                     <th className="label !text-[10.5px] text-center py-[11px] px-1">{shortName(c2)}</th>
                     <th className="w-6"><span className="sr-only">Remove</span></th>
                  </tr>
               </thead>
               <tbody>
                  {matrixState.criteria.map(criterion => {
                     const marked = higherScore(criterion.c1_score, criterion.c2_score);
                     return (
                        <tr key={criterion.id} className="border-b border-rule align-top text-[14px]">
                           <td className="py-[11px] pr-2">
                              {criterion.label}
                              <small className="block text-ink2 italic text-[12.5px] leading-[1.4] mt-0.5">{criterion.reasoning}</small>
                              {canWeigh && (
                                 <label className="flex items-center gap-2.5 mt-2">
                                    <span className="label !text-[10px] whitespace-nowrap">Your weight</span>
                                    <input
                                       type="range"
                                       min="0"
                                       max="100"
                                       value={userWeights[criterion.id] ?? DEFAULT_WEIGHT}
                                       onChange={(e) => handleWeightChange(criterion.id, e.target.value)}
                                       className="cursor-pointer"
                                    />
                                 </label>
                              )}
                           </td>
                           <td className={`py-[11px] w-[52px] text-center font-display text-[22px] font-semibold tabular-nums ${marked === 'c1' ? markColor : ''}`}>
                              {criterion.c1_score}
                           </td>
                           <td className={`py-[11px] w-[52px] text-center font-display text-[22px] font-semibold tabular-nums ${marked === 'c2' ? markColor : ''}`}>
                              {criterion.c2_score}
                           </td>
                           <td className="py-[11px] text-right">
                              <button
                                 type="button"
                                 onClick={() => handleRemoveCriterion(criterion.id)}
                                 className="text-ink2 hover:text-seal"
                                 title="Remove criterion"
                                 aria-label={`Remove ${criterion.label}`}
                              >
                                 <span aria-hidden="true" className="text-lg leading-none">×</span>
                              </button>
                           </td>
                        </tr>
                     );
                  })}
               </tbody>
            </table>

            <div className="border-b border-rule py-2.5 flex items-baseline gap-3">
               <input
                  type="text"
                  value={criterionDraft}
                  onChange={(e) => onCriterionDraftChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCriterion()}
                  placeholder="Add your own criterion"
                  aria-label="Add your own criterion"
                  className="flex-1 min-w-0 bg-transparent py-1 italic text-[14px] text-ink focus:outline-none placeholder:text-ink2"
               />
               <button
                  type="button"
                  onClick={handleAddCriterion}
                  disabled={!criterionDraft.trim() || isAddingCriterion}
                  className="btn-link"
               >
                  {isAddingCriterion ? 'Scoring…' : 'Score'}
               </button>
            </div>

            <p className="text-[12.5px] italic text-ink2 mt-3">
               Scores out of ten. The higher score in each row is marked.
               {matrixState.criteria.length === 1 && ' Add a second criterion to weigh them against each other.'}
            </p>

            {scores && (
               <>
                  <div className="mt-6 pt-3 border-t border-ink grid grid-cols-[1fr_52px_52px_24px] items-baseline">
                     <span className="label">Weighted alignment</span>
                     <span className="text-center font-display text-[22px] font-semibold tabular-nums" style={{ color: c1Color }}>{scores.c1Percent}%</span>
                     <span className="text-center font-display text-[22px] font-semibold tabular-nums" style={{ color: c2Color }}>{scores.c2Percent}%</span>
                  </div>
                  <p className="text-[14px] mt-3">
                     {Math.abs(scores.c1Percent - scores.c2Percent) <= 5 ? (
                        <><span className="font-semibold text-brass">Balanced approach:</span> both perspectives align closely with your priorities. Consider a synthesis.</>
                     ) : (
                        <>Based on your priorities, <span className="font-semibold" style={{ color: scores.c1Percent > scores.c2Percent ? c1Color : c2Color }}>
                           {shortName(scores.c1Percent > scores.c2Percent ? c1 : c2)}'s
                        </span> approach aligns better with your goals.</>
                     )}
                  </p>
               </>
            )}
         </aside>
      </div>
   );
};

export default DebateOverlay;
