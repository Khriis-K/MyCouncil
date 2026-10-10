import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { CouncilResponse, ChatMessage } from '../../types';
import { CouncilSeat } from '../../utils/councilSeats';
import { recallFootnotes } from '../../utils/footnotes';
import { remarkFootnoteMarker } from '../../utils/footnoteMarker';
import { seatHeading } from '../../utils/seatHeading';

interface CounselorDossierProps {
  seat: CouncilSeat;
  dynamicData?: CouncilResponse['counselors'][0];
  onClose: () => void;
  chatMessages: ChatMessage[];
  isTyping: boolean;
  onSendMessage: (message: string) => void;
}

const PLAN_NUMERALS = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'];

// "The Commander" reads as "the Commander" mid-sentence
const inSentence = (name: string) => name.replace(/^The /, 'the ');

// A counselor's full opinion, set like a printed one, with the correspondence beside it (below it on a phone).
const CounselorDossier: React.FC<CounselorDossierProps> = ({
  seat,
  dynamicData,
  onClose,
  chatMessages,
  isTyping,
  onSendMessage
}) => {
  const [inputValue, setInputValue] = useState('');
  const lettersRef = useRef<HTMLDivElement>(null);
  const lettersEndRef = useRef<HTMLDivElement>(null);
  const seen = useRef({ chatMessages, isTyping });
  const name = inSentence(seat.name);

  // Keep the latest letter in view. The desktop column opens at its foot; after that a new letter
  // or the typing line is scrolled into view, which on a phone scrolls the page instead. Not on open,
  // or a phone would jump past the opinion straight to the correspondence.
  useEffect(() => {
    const letters = lettersRef.current;
    if (letters) letters.scrollTop = letters.scrollHeight;
    if (seen.current.chatMessages !== chatMessages || seen.current.isTyping !== isTyping) {
      lettersEndRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    seen.current = { chatMessages, isTyping };
  }, [chatMessages, isTyping]);

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-grow min-h-0 overflow-y-auto md:overflow-hidden flex flex-col md:grid md:grid-cols-[1fr_400px] animate-fade-in">
      <article className="px-4 md:pl-24 md:pr-14 pt-7 pb-10 md:overflow-y-auto">
        <button type="button" onClick={onClose} className="caps text-ink2 hover:text-ink">
          ← Back to the chamber
        </button>
        <h2 className="display mt-3.5 mb-1">
          Opinion of <em>{name}</em>
        </h2>
        <p className="text-[13.5px] italic text-ink2 mb-[22px]">{seatHeading(seat)}.</p>

        {dynamicData ? (
          <>
            <p className="text-[16px] leading-[1.6] max-w-[62ch] first-letter:font-display first-letter:text-[56px] first-letter:float-left first-letter:leading-[0.85] first-letter:pt-1.5 first-letter:pr-2">
              {dynamicData.assessment}
            </p>

            <ol className="mt-[22px] grid md:grid-cols-3 border-t border-rule">
              {dynamicData.action_plan.map((step, idx) => (
                <li
                  key={idx}
                  className="pt-3.5 pb-1 md:pr-4 text-[14px] leading-[1.45] max-md:[&+li]:border-t md:[&:not(:nth-child(3n+1))]:border-l md:[&:not(:nth-child(3n+1))]:pl-4 border-rule"
                >
                  <b className="block font-display text-[24px] font-semibold text-seal">
                    {PLAN_NUMERALS[idx] ?? idx + 1}.
                  </b>
                  {step}
                </li>
              ))}
            </ol>

            <p className="label mt-[22px]">For your reflection</p>
            <p className="font-display italic text-[26px] leading-[1.25] max-w-[30ch] mt-1">{dynamicData.reflection_q}</p>
          </>
        ) : (
          <p className="italic text-ink2">No analysis data available.</p>
        )}
      </article>

      <aside className="border-t md:border-t-0 md:border-l border-rule flex flex-col px-4 md:px-7 pt-7 pb-[22px] md:min-h-0">
        <h3 className="label">Correspondence with {name}</h3>

        <div ref={lettersRef} className="flex-1 flex flex-col gap-[18px] mt-4 md:overflow-y-auto md:min-h-0 pb-4">
          {chatMessages.length === 0 && !isTyping && (
            <p className="italic text-[14px] text-ink2">No letters yet. Write to {name} below.</p>
          )}

          {chatMessages.map((msg) => {
            const fromYou = msg.sender === 'user';
            const notes = fromYou ? [] : recallFootnotes(msg.recalled);
            return (
              <div key={msg.id} className="animate-fade-in">
                <div className="label !text-[11px] mb-[3px]">{fromYou ? 'You' : seat.name}</div>
                <div className={`text-[14.5px] leading-[1.5] ${fromYou ? 'italic' : ''}`}>
                  <ReactMarkdown
                    remarkPlugins={notes.length > 0 ? [[remarkFootnoteMarker, notes.map(n => n.number).join(',')]] : []}
                    components={{
                      p: ({children}) => <p className="mb-1.5 last:mb-0">{children}</p>,
                      strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                      em: ({children}) => <em className="italic">{children}</em>,
                      ul: ({children}) => <ul className="list-disc list-inside mb-1.5 last:mb-0">{children}</ul>,
                      ol: ({children}) => <ol className="list-decimal list-inside mb-1.5 last:mb-0">{children}</ol>,
                      li: ({children}) => <li className="ml-1">{children}</li>,
                      sup: ({children}) => <sup className="not-italic text-seal font-semibold ml-0.5">{children}</sup>
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </div>
                {notes.length > 0 && (
                  <ol className="text-[12px] text-ink2 border-t border-rule pt-1.5 mt-2 space-y-1">
                    {notes.map(n => (
                      <li key={n.number}>
                        <sup className="text-seal font-semibold mr-0.5">{n.number}</sup>
                        {n.source}: “{n.text}”
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}

          {isTyping && <p className="italic text-[13.5px] text-ink2">{seat.name} is writing…</p>}
          <div ref={lettersEndRef} />
        </div>

        <div className="border-t border-ink pt-2.5 flex items-baseline gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Write to ${name}`}
            aria-label={`Write to ${name}`}
            className="flex-1 min-w-0 bg-transparent py-1 italic focus:outline-none placeholder:text-ink2 text-ink"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            className="btn-link"
          >
            Send
          </button>
        </div>
      </aside>
    </div>
  );
};

export default CounselorDossier;
