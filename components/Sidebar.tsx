
import React, { useState } from 'react';
import { MBTI_TYPES } from '../constants';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  dilemma: string;
  setDilemma: (val: string) => void;
  selectedMBTI: string | null;
  onOpenMBTI: () => void;
  onSelectMBTI: (val: string) => void;
  onSummon: () => void;
  isGenerating?: boolean;
  isMBTIOverlayOpen?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  toggleSidebar,
  dilemma,
  setDilemma,
  selectedMBTI,
  onOpenMBTI,
  onSelectMBTI,
  onSummon,
  isGenerating = false,
  isMBTIOverlayOpen = false
}) => {
  const [councilSize, setCouncilSize] = useState<number>(4);

  const getMBTIDisplay = () => {
    if (!selectedMBTI || selectedMBTI === 'BALANCED') return 'Balanced (Default)';
    const type = MBTI_TYPES.find(t => t.code === selectedMBTI);
    return type ? `${type.code} - ${type.name}` : selectedMBTI;
  };

  const handleCognitiveStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'TRIGGER') {
      onOpenMBTI();
    } else {
      onSelectMBTI(val);
    }
  };

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-[60] bg-slate-900/90 backdrop-blur-xl border-r border-slate-800 transition-all duration-300 ease-in-out flex flex-col ${isOpen ? 'w-[360px] translate-x-0' : 'w-[360px] -translate-x-full'
          }`}
      >
        <div className="p-6 space-y-8 flex-grow overflow-y-auto scrollbar-hide">
          <header>
            <h1 className="text-2xl font-bold text-white tracking-tight">MyCouncil</h1>
          </header>

          <div className="space-y-6">
            {/* Dilemma Input */}
            <div>
              <label htmlFor="dilemma" className="block text-sm font-medium text-slate-300 mb-2">
                What's on your mind? <span className="text-slate-500">(Your Dilemma)</span>
              </label>
              <textarea
                id="dilemma"
                rows={5}
                className="w-full rounded-lg bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-primary focus:border-primary resize-none p-3 text-sm"
                placeholder="I've been offered a new job in a different city. It's a great career opportunity but..."
                value={dilemma}
                onChange={(e) => setDilemma(e.target.value)}
                disabled={isGenerating}
              />
            </div>

            {/* Focus Dropdown */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Reflection Focus</label>
              <div className="relative">
                <select className="w-full rounded-lg bg-slate-800 border-slate-700 text-slate-200 focus:ring-primary focus:border-primary appearance-none p-3 text-sm">
                  <option>Decision-Making</option>
                  <option>Emotional Processing</option>
                  <option>Creative Problem Solving</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-3 text-slate-500 pointer-events-none text-sm">
                  expand_more
                </span>
              </div>
            </div>

            {/* Cognitive Style Dropdown */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Your Cognitive Style</label>
              <div className="relative">
                <select
                  value={isMBTIOverlayOpen ? 'TRIGGER' : (selectedMBTI === 'BALANCED' ? 'BALANCED' : (selectedMBTI || 'BALANCED'))}
                  onChange={handleCognitiveStyleChange}
                  className={`w-full appearance-none rounded-lg bg-slate-800 border-slate-700 text-slate-200 focus:ring-primary focus:border-primary p-3 text-sm transition-colors ${selectedMBTI && selectedMBTI !== 'BALANCED' ? 'border-diplomat' : ''}`}
                >
                  <option value="BALANCED">Balanced (Default)</option>
                  {selectedMBTI && selectedMBTI !== 'BALANCED' && (
                    <option value={selectedMBTI}>{getMBTIDisplay()}</option>
                  )}
                  <option value="TRIGGER">Select MBTI Type...</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-3 text-slate-500 pointer-events-none text-sm">
                  expand_more
                </span>
              </div>
            </div>

            {/* Council Size Linear Scale */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-slate-300">
                  Council Size
                </label>
                <span className="text-xs font-bold text-primary bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">
                  {councilSize} Counselors
                </span>
              </div>

              <div className="relative h-12 flex items-center select-none">
                {/* Track Lines */}
                <div className="absolute left-0 right-0 h-1 bg-slate-700 rounded-full z-0"></div>
                <div
                  className="absolute left-0 h-1 bg-primary rounded-full z-0 transition-all duration-300 ease-out"
                  style={{ width: `${((councilSize - 3) / 5) * 100}%` }}
                ></div>

                {/* Steps */}
                <div className="relative w-full flex justify-between z-10 px-[2px]">
                  {[3, 4, 5, 6, 7, 8].map((size) => (
                    <button
                      key={size}
                      onClick={() => setCouncilSize(size)}
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 border-2 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-slate-900
                        ${size === councilSize
                          ? 'bg-primary border-primary text-white scale-110 shadow-[0_0_10px_rgba(79,70,229,0.5)]'
                          : size < councilSize
                            ? 'bg-slate-800 border-primary text-primary hover:bg-slate-700'
                            : 'bg-slate-900 border-slate-600 text-slate-500 hover:border-slate-400 hover:text-slate-400'
                        }
                      `}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-500 font-medium px-1">
                <span>Min</span>
                <span>Max</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summon Button */}
        <div className="p-6 border-t border-slate-800">
          <button
            onClick={onSummon}
            disabled={isGenerating}
            className={`w-full font-semibold py-3 px-4 rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all duration-300 ease-in-out flex items-center justify-center ${isGenerating
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-primary hover:bg-indigo-500 text-white'
              }`}
          >
            {isGenerating ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-2"></span>
                Consulting...
              </>
            ) : (
              'Summon the Council'
            )}
          </button>
        </div>
      </aside>

      {/* Sidebar Toggle Handle */}
      <div
        className={`fixed top-1/2 -translate-y-1/2 z-[55] transition-all duration-300 ${isOpen ? 'left-[360px]' : 'left-0'
          }`}
      >
        <button
          onClick={toggleSidebar}
          className="h-16 w-6 bg-slate-800/80 backdrop-blur-sm border-y border-r border-slate-700 rounded-r-lg flex items-center justify-center text-slate-400 hover:text-white hover:shadow-[0_0_12px_rgba(79,70,229,0.5)] transition-all"
        >
          <span className="material-symbols-outlined text-xl">
            {isOpen ? 'chevron_left' : 'chevron_right'}
          </span>
        </button>
      </div>
    </>
  );
};

export default Sidebar;
