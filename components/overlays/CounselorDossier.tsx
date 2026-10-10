import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Counselor, CouncilResponse, ChatMessage } from '../../types';
import { groupColor } from '../../utils/groupColor';

interface CounselorDossierProps {
  counselor: Counselor;
  dynamicData?: CouncilResponse['counselors'][0];
  onClose: () => void;
  chatMessages: ChatMessage[];
  isTyping: boolean;
  onSendMessage: (message: string) => void;
}

type Tab = 'INSIGHT' | 'PROTOCOL' | 'COMMS';

const CounselorDossier: React.FC<CounselorDossierProps> = ({
  counselor,
  dynamicData,
  onClose,
  chatMessages,
  isTyping,
  onSendMessage
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('INSIGHT');
  const [isClosing, setIsClosing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (activeTab === 'COMMS' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab, isTyping]);

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

  const accent = groupColor(counselor.role);

  return (
    <>
      {/* Veil */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'var(--veil)' }}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-[450px] h-full flex flex-col ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
        style={{
          backgroundColor: 'var(--paper)',
          borderLeft: '1px solid var(--ink)'
        }}
      >

        {/* Header */}
        <div
          className="h-20 flex items-center px-6 gap-4"
          style={{ borderBottom: '1px solid var(--rule)' }}
        >
          <div
            className="w-12 h-12 rounded-full border-[1.6px] flex items-center justify-center text-2xl"
            style={{ borderColor: accent, color: accent, backgroundColor: 'var(--paper2)' }}
          >
            <span className="material-symbols-outlined">{counselor.icon}</span>
          </div>
          <div className="flex-1">
            <h2 className="font-display text-2xl font-semibold leading-none" style={{ color: 'var(--ink)' }}>{counselor.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-label text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: accent }}>{counselor.role}</span>
            </div>
          </div>
          <button onClick={handleClose} className="transition-colors hover:text-[var(--ink)]" style={{ color: 'var(--ink2)' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex px-6 gap-6"
          style={{ borderBottom: '1px solid var(--rule)' }}
        >
          {(['INSIGHT', 'PROTOCOL', 'COMMS'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="py-3 font-label text-[12px] uppercase tracking-[0.1em] border-b transition-colors"
              style={{
                color: activeTab === tab ? 'var(--ink)' : 'var(--ink2)',
                borderColor: activeTab === tab ? 'var(--ink)' : 'transparent'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">

          {activeTab === 'INSIGHT' && (
            <div className="animate-fade-in">
              {dynamicData ? (
                <>
                  <div className="mb-6 pb-5" style={{ borderBottom: '1px solid var(--rule)' }}>
                    <h3 className="label mb-2">Impression</h3>
                    <p className="font-display italic text-2xl leading-tight" style={{ color: 'var(--ink)' }}>"{dynamicData.impression}"</p>
                  </div>

                  <div className="max-w-none text-base leading-relaxed" style={{ color: 'var(--ink)' }}>
                    <p>{dynamicData.assessment}</p>
                  </div>

                  <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--rule)' }}>
                    <h3 className="label mb-3">Reflection Query</h3>
                    <p className="font-display italic text-[22px] leading-snug" style={{ color: 'var(--ink)' }}>"{dynamicData.reflection_q}"</p>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full italic" style={{ color: 'var(--ink2)' }}>
                  No analysis data available.
                </div>
              )}
            </div>
          )}

          {activeTab === 'PROTOCOL' && (
            <div className="animate-fade-in">
              <div className="flex justify-between items-baseline mb-4">
                <h3 className="label">Optimal Pathway</h3>
                <span className="label !text-[10px]">CONFIDENCE: 94%</span>
              </div>

              <ol>
                {dynamicData?.action_plan.map((step, idx) => (
                  <li key={idx} className="grid grid-cols-[40px_1fr] gap-2 py-4" style={{ borderTop: '1px solid var(--rule)' }}>
                    <span className="font-display text-2xl font-semibold leading-none" style={{ color: 'var(--seal)' }}>
                      {['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'][idx] ?? idx + 1}.
                    </span>
                    <div>
                      <h4 className="label mb-1">
                        Sequence 0{idx + 1}
                      </h4>
                      <p className="text-[15px] leading-relaxed" style={{ color: 'var(--ink)' }}>
                        {step}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {activeTab === 'COMMS' && (
            <div className="animate-fade-in h-full flex flex-col">
              <div className="flex-1 overflow-y-auto space-y-5 pr-2">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: 'var(--ink2)' }}>
                    <span className="material-symbols-outlined text-4xl">forum</span>
                    <p className="italic">Start a conversation with {counselor.name}...</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] text-[14.5px] leading-normal ${
                          msg.sender === 'user'
                            ? 'italic animate-slide-in-right'
                            : 'animate-slide-in-left'
                        }`}
                        style={{ color: 'var(--ink)' }}
                      >
                        <div className="label !text-[10.5px] mb-1">{msg.sender === 'user' ? 'You' : counselor.name}</div>
                        <ReactMarkdown
                          components={{
                            p: ({children}) => <p className="mb-1 last:mb-0">{children}</p>,
                            strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                            em: ({children}) => <em className="italic">{children}</em>,
                            ul: ({children}) => <ul className="list-disc list-inside mb-1">{children}</ul>,
                            ol: ({children}) => <ol className="list-decimal list-inside mb-1">{children}</ol>,
                            li: ({children}) => <li className="ml-1">{children}</li>
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                        {msg.recalled && msg.recalled.length > 0 && (
                          <details className="mt-2 pt-1.5 text-xs" style={{ color: 'var(--ink2)', borderTop: '1px solid var(--rule)' }}>
                            <summary className="cursor-pointer select-none">Recalled from earlier ({msg.recalled.length})</summary>
                            <ul className="mt-1 space-y-1">
                              {msg.recalled.map((r, i) => (
                                <li key={i}>
                                  <span className="font-semibold">
                                    {r.channel === 'chat' ? `Chat with ${r.counselorId}` : r.channel === 'debate' ? 'Debate' : 'Added context'}:
                                  </span>{' '}
                                  "{r.text}"
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {isTyping && (
                   <p className="italic text-[13.5px]" style={{ color: 'var(--ink2)' }}>
                     {counselor.name} is writing…
                   </p>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--ink)' }}>
                <div className="relative">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${counselor.name}...`}
                    className="w-full bg-transparent py-2 pr-10 italic focus:outline-none placeholder:text-[var(--ink2)]"
                    style={{ color: 'var(--ink)' }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isTyping}
                    className={`absolute right-0 top-1/2 -translate-y-1/2 p-1.5 transition-opacity ${inputValue.trim() ? 'opacity-100' : 'opacity-50'}`}
                    style={{ color: 'var(--seal)' }}
                  >
                    <span className="material-symbols-outlined text-lg">send</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Action (Only show on INSIGHT and PROTOCOL tabs) */}
        {activeTab !== 'COMMS' && (
          <div
            className="p-4"
            style={{ borderTop: '1px solid var(--rule)' }}
          >
            <button
              onClick={() => setActiveTab('COMMS')}
              className="btn-seal w-full flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">forum</span>
              INITIATE DIALOGUE
            </button>
          </div>
        )}

      </div>
    </>
  );
};

export default CounselorDossier;
