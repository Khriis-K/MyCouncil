import React from 'react';

interface BottomBarProps {
  isDebateMode: boolean;
  toggleDebateMode: () => void;
  isDisabled: boolean;
  onRefine: () => void;
}

const BottomBar: React.FC<BottomBarProps> = ({ isDebateMode, toggleDebateMode, isDisabled, onRefine }) => {
  return (
    <footer className={`absolute bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-md border-t border-slate-800 p-4 z-40 transition-opacity duration-300 ${isDisabled ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
      <div className="max-w-screen-2xl mx-auto flex items-center space-x-4">
        
        {/* Context Input */}
        <div className="flex-grow relative">
           <input
            type="text"
            placeholder="Add more context..."
            className="w-full bg-slate-800 border-slate-700 rounded-lg pl-4 pr-4 py-2 text-slate-300 focus:ring-primary focus:border-primary text-sm placeholder-slate-500"
            disabled={isDisabled}
          />
        </div>

        {/* Debate Toggle */}
        <div className="flex items-center space-x-3 px-4 border-r border-slate-700">
          <label htmlFor="debate-mode" className="text-sm font-medium text-slate-300 cursor-pointer select-none">
            Debate Mode
          </label>
          <button
            id="debate-mode"
            onClick={toggleDebateMode}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-900 ${
              isDebateMode ? 'bg-primary' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isDebateMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Action Button */}
        <button 
          onClick={onRefine}
          className="bg-primary hover:bg-indigo-500 text-white font-semibold py-2 px-6 rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all"
        >
          {isDebateMode ? 'Refresh Debate' : 'Refine Perspective'}
        </button>
      </div>
    </footer>
  );
};

export default BottomBar;