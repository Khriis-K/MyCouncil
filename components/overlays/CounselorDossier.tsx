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
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
        onClick={handleClose}
      />

      {/* Panel */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full max-w-[450px] h-full bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>
        
        {/* Header */}
        <div className="h-20 border-b border-slate-700 bg-slate-900/95 backdrop-blur flex items-center px-6 gap-4">
          <div className={`w-12 h-12 rounded ${colors.bg} border ${colors.border} flex items-center justify-center text-2xl shadow-[0_0_10px_rgba(0,0,0,0.3)]`}>
            <span className="material-symbols-outlined">{counselor.icon}</span>
          </div>
          <div className="flex-1">
            <h2 className="text-white font-bold text-lg leading-none">{counselor.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-mono ${colors.text} uppercase tracking-wider`}>{counselor.role}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
          </div>
          <button onClick={handleClose} className="text-slate-500 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-800/50">
          {(['INSIGHT', 'PROTOCOL', 'COMMS'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-xs font-mono font-bold transition-colors ${
                activeTab === tab 
                  ? `${colors.tabActive} border-b-2` 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50 scrollbar-hide">
          
          {activeTab === 'INSIGHT' && (
            <div className="animate-fade-in">
              {dynamicData ? (
                <>
                  <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <h3 className="text-xs font-mono text-slate-500 mb-2 uppercase">Impression</h3>
                    <p className="text-white font-medium italic">"{dynamicData.impression}"</p>
                  </div>

                  <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed">
                    <p>{dynamicData.assessment}</p>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-800">
                    <h3 className="text-xs font-mono text-slate-500 mb-4 uppercase">Reflection Query</h3>
                    <div className={`border-l-2 ${colors.border} pl-4 py-1`}>
                      <p className={`${colors.text} italic`}>"{dynamicData.reflection_q}"</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">
                  No analysis data available.
                </div>
              )}
            </div>
          )}

          {activeTab === 'PROTOCOL' && (
            <div className="animate-fade-in space-y-6">
              <h3 className="text-xs font-mono text-slate-500 uppercase">Action Plan</h3>
              {dynamicData?.action_plan.map((step, idx) => (
                <div key={idx} className="flex gap-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors group">
                  <div className={`w-6 h-6 rounded-full ${colors.bg} flex items-center justify-center ${colors.text} text-xs font-bold mt-0.5 group-hover:scale-110 transition-transform`}>
                    {idx + 1}
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'COMMS' && (
            <div className="animate-fade-in h-full flex flex-col">
              <div className="flex-1 space-y-4">
                <div className="flex justify-end">
                  <div className="bg-slate-800 text-slate-300 rounded-lg rounded-br-none p-3 max-w-[85%] text-sm border border-slate-700">
                    Can you explain more about that last point?
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className={`${colors.bg} border ${colors.border} text-slate-200 rounded-lg rounded-bl-none p-3 max-w-[85%] text-sm`}>
                    Certainly. The key is to separate the emotional narrative from the strategic reality.
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder={`Message ${counselor.name}...`}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 text-sm text-white focus:outline-none focus:border-slate-500 transition-colors"
                  />
                  <button className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-slate-700 ${colors.text}`}>
                    <span className="material-symbols-outlined text-lg">send</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Action (Only show on INSIGHT and PROTOCOL tabs) */}
        {activeTab !== 'COMMS' && (
          <div className="p-4 border-t border-slate-700 bg-slate-900">
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
