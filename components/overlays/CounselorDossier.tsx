import React, { useState } from 'react';
import { Counselor, CouncilResponse } from '../../types';

interface CounselorDossierProps {
  counselor: Counselor;
  dynamicData?: CouncilResponse['counselors'][0];
  onClose: () => void;
}

type Tab = 'INSIGHT' | 'PROTOCOL' | 'COMMS';

const CounselorDossier: React.FC<CounselorDossierProps> = ({ counselor, dynamicData, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('INSIGHT');
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  // Color mapping for dynamic styling based on counselor color
  const getColorClasses = (color: string) => {
    const map: Record<string, { 
      border: string, 
      text: string, 
      bg: string, 
      shadow: string,
      tabActive: string,
      button: string 
    }> = {
      blue: {
        border: 'border-blue-500',
        text: 'text-blue-400',
        bg: 'bg-blue-900/50',
        shadow: 'shadow-blue-500/20',
        tabActive: 'border-blue-500 text-blue-400 bg-blue-500/10',
        button: 'bg-blue-600 hover:bg-blue-500'
      },
      green: {
        border: 'border-green-500',
        text: 'text-green-400',
        bg: 'bg-green-900/50',
        shadow: 'shadow-green-500/20',
        tabActive: 'border-green-500 text-green-400 bg-green-500/10',
        button: 'bg-green-600 hover:bg-green-500'
      },
      yellow: {
        border: 'border-yellow-500',
        text: 'text-yellow-400',
        bg: 'bg-yellow-900/50',
        shadow: 'shadow-yellow-500/20',
        tabActive: 'border-yellow-500 text-yellow-400 bg-yellow-500/10',
        button: 'bg-yellow-600 hover:bg-yellow-500'
      },
      purple: {
        border: 'border-purple-500',
        text: 'text-purple-400',
        bg: 'bg-purple-900/50',
        shadow: 'shadow-purple-500/20',
        tabActive: 'border-purple-500 text-purple-400 bg-purple-500/10',
        button: 'bg-purple-600 hover:bg-purple-500'
      },
      red: {
        border: 'border-red-500',
        text: 'text-red-400',
        bg: 'bg-red-900/50',
        shadow: 'shadow-red-500/20',
        tabActive: 'border-red-500 text-red-400 bg-red-500/10',
        button: 'bg-red-600 hover:bg-red-500'
      },
    };
    return map[color] || map['purple'];
  };

  const colors = getColorClasses(counselor.color);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 backdrop-blur-sm z-40"
        style={{ backgroundColor: 'var(--overlay-backdrop)' }}
        onClick={handleClose}
      />

      {/* Panel */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-[450px] h-full shadow-2xl flex flex-col ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-primary)'
        }}
      >
        
        {/* Header */}
        <div 
          className="h-20 backdrop-blur flex items-center px-6 gap-4"
          style={{
            backgroundColor: 'var(--bg-glass)',
            borderBottom: '1px solid var(--border-primary)'
          }}
        >
          <div className={`w-12 h-12 rounded ${colors.bg} border ${colors.border} flex items-center justify-center text-2xl shadow-[0_0_10px_rgba(0,0,0,0.3)]`}>
            <span className="material-symbols-outlined">{counselor.icon}</span>
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg leading-none" style={{ color: 'var(--text-primary)' }}>{counselor.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-mono ${colors.text} uppercase tracking-wider`}>{counselor.role}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
          </div>
          <button onClick={handleClose} className="transition-colors" style={{ color: 'var(--text-muted)' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div 
          className="flex"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            borderBottom: '1px solid var(--border-primary)'
          }}
        >
          {(['INSIGHT', 'PROTOCOL', 'COMMS'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-xs font-mono font-bold transition-colors ${
                activeTab === tab 
                  ? `${colors.tabActive} border-b-2` 
                  : ''
              }`}
              style={activeTab !== tab ? { color: 'var(--text-muted)' } : undefined}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide" style={{ backgroundColor: 'var(--bg-primary)' }}>
          
          {activeTab === 'INSIGHT' && (
            <div className="animate-fade-in">
              {dynamicData ? (
                <>
                  <div 
                    className="mb-6 p-4 rounded-lg"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)'
                    }}
                  >
                    <h3 className="text-xs font-mono mb-2 uppercase" style={{ color: 'var(--text-muted)' }}>Impression</h3>
                    <p className="font-medium italic" style={{ color: 'var(--text-primary)' }}>"{dynamicData.impression}"</p>
                  </div>

                  <div className="prose prose-sm max-w-none leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    <p>{dynamicData.assessment}</p>
                  </div>

                  <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border-primary)' }}>
                    <h3 className="text-xs font-mono mb-4 uppercase" style={{ color: 'var(--text-muted)' }}>Reflection Query</h3>
                    <div className={`border-l-2 ${colors.border} pl-4 py-1`}>
                      <p className={`${colors.text} italic`}>"{dynamicData.reflection_q}"</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
                  No analysis data available.
                </div>
              )}
            </div>
          )}

          {activeTab === 'PROTOCOL' && (
            <div className="animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Optimal Pathway</h3>
                <span className={`text-[10px] ${colors.text} font-mono opacity-80`}>CONFIDENCE: 94%</span>
              </div>

              <div className="relative pl-2">
                {/* The Circuit Line */}
                <div className={`absolute left-[11px] top-2 bottom-0 w-0.5 bg-gradient-to-b from-${counselor.color}-500 via-${counselor.color}-500/20 to-transparent opacity-50`}></div>

                {dynamicData?.action_plan.map((step, idx) => (
                  <div key={idx} className="relative flex gap-5 mb-8 group last:mb-0">
                    {/* Node */}
                    <div 
                      className={`relative z-10 flex-shrink-0 w-5 h-5 rounded-full border-2 ${colors.border} shadow-[0_0_10px_currentColor] flex items-center justify-center mt-1 group-hover:scale-110 transition-transform`}
                      style={{ backgroundColor: 'var(--bg-primary)' }}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${colors.bg.replace('bg-', 'bg-').replace('/50', '-400')}`}></div>
                    </div>
                    
                    {/* Card */}
                    <div className="relative pl-2 group-hover:pl-3 transition-all duration-300">
                      <span 
                        className="absolute left-0 top-0 text-4xl font-thin text-transparent bg-clip-text bg-gradient-to-b opacity-20 group-hover:opacity-40 transition-opacity font-mono select-none -translate-x-2 -translate-y-2"
                        style={{ backgroundImage: 'linear-gradient(to bottom, var(--text-muted), transparent)' }}
                      >
                        0{idx + 1}
                      </span>
                      <div 
                        className="p-4 rounded-lg transition-colors"
                        style={{ 
                          borderLeft: '1px solid var(--border-subtle)',
                          backgroundColor: 'var(--bg-glass)'
                        }}
                      >
                        <h4 className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                          Sequence 0{idx + 1}
                        </h4>
                        <p className="text-sm font-light leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                          {step}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'COMMS' && (
            <div className="animate-fade-in h-full flex flex-col">
              <div className="flex-1 space-y-4">
                <div className="flex justify-end">
                  <div 
                    className="rounded-lg rounded-br-none p-3 max-w-[85%] text-sm"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    Can you explain more about that last point?
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className={`${colors.bg} border ${colors.border} rounded-lg rounded-bl-none p-3 max-w-[85%] text-sm`} style={{ color: 'var(--text-secondary)' }}>
                    Certainly. The key is to separate the emotional narrative from the strategic reality.
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-primary)' }}>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder={`Message ${counselor.name}...`}
                    className="w-full rounded-lg py-3 px-4 text-sm focus:outline-none transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <button className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded ${colors.text}`}>
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
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderTop: '1px solid var(--border-primary)'
            }}
          >
            <button 
              onClick={() => setActiveTab('COMMS')}
              className={`w-full py-3 ${colors.button} text-white font-bold rounded flex items-center justify-center gap-2 transition-colors shadow-lg`}
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
