import React from 'react';
import { Counselor, CouncilResponse } from '../../types';

interface InsightBarProps {
  counselor: Counselor;
  dynamicData?: CouncilResponse['counselors'][0];
  onViewFull: () => void;
  onClose: () => void;
  isExiting?: boolean; // For slide-out animation
}

const InsightBar: React.FC<InsightBarProps> = ({ counselor, dynamicData, onViewFull, onClose, isExiting = false }) => {
  const colorAccents: Record<string, string> = {
    blue: 'border-blue-500/30',
    green: 'border-green-500/30',
    yellow: 'border-yellow-500/30',
    purple: 'border-purple-500/30',
  };

  const bgAccents: Record<string, string> = {
    blue: 'rgba(59, 130, 246, 0.1)',
    green: 'rgba(16, 185, 129, 0.1)',
    yellow: 'rgba(234, 179, 8, 0.1)',
    purple: 'rgba(168, 85, 247, 0.1)',
  };

  const textColors: Record<string, string> = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    purple: 'text-purple-400',
  };

  const buttonColors: Record<string, string> = {
    blue: 'bg-blue-600 hover:bg-blue-500 text-white',
    green: 'bg-green-600 hover:bg-green-500 text-white',
    yellow: 'bg-yellow-600 hover:bg-yellow-500 text-white',
    purple: 'bg-purple-600 hover:bg-purple-500 text-white',
  };

  // Use the dedicated impression field from the counselor's response
  const impression = dynamicData?.impression || "Click to view full assessment";

  return (
    <div 
      data-insight-bar
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-5xl px-8 transition-all duration-300 ${
        isExiting ? 'animate-slide-out-left' : 'animate-slide-in-from-right'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className={`flex items-center gap-4 px-6 py-4 rounded-full border backdrop-blur-md shadow-2xl ${colorAccents[counselor.color]}`}
        style={{ backgroundColor: bgAccents[counselor.color] || 'var(--bg-glass)' }}
      >
        {/* Icon */}
        <div 
          className={`flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 border ${colorAccents[counselor.color]}`}
          style={{ backgroundColor: bgAccents[counselor.color] }}
        >
          <span className={`material-symbols-outlined text-xl ${textColors[counselor.color]}`}>
            {counselor.icon}
          </span>
        </div>

        {/* Counselor Name & Impression */}
        <div className="flex-grow">
          <p className="text-sm leading-relaxed">
            <span className={`font-bold ${textColors[counselor.color]}`}>{counselor.name}: </span>
            <span style={{ color: 'var(--text-secondary)' }}>{impression}</span>
          </p>
        </div>

        {/* View Full Button */}
        <button
          onClick={onViewFull}
          className={`flex-shrink-0 px-5 py-2 rounded-full font-semibold text-xs transition-all ${buttonColors[counselor.color]}`}
        >
          View Full Analysis
        </button>
      </div>
    </div>
  );
};

export default InsightBar;
