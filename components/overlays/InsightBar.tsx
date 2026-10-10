import React from 'react';
import { Counselor, CouncilResponse } from '../../types';
import { groupColor } from '../../utils/groupColor';

interface InsightBarProps {
  counselor: Counselor;
  dynamicData?: CouncilResponse['counselors'][0];
  onViewFull: () => void;
  onClose: () => void;
  isExiting?: boolean; // For slide-out animation
}

const InsightBar: React.FC<InsightBarProps> = ({ counselor, dynamicData, onViewFull, onClose, isExiting = false }) => {
  const accent = groupColor(counselor.role);

  // Use the dedicated impression field from the counselor's response
  const impression = dynamicData?.impression || "Click to view full assessment";

  return (
    <div
      data-insight-bar
      className={`fixed bottom-24 md:bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-5xl px-4 md:px-8 transition-all duration-300 ${
        isExiting ? 'animate-slide-out-left' : 'animate-slide-in-from-right'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 px-4 sm:px-6 py-3 sm:py-4 border bg-paper2 border-ink"
      >
        {/* Top row on mobile: Icon, Name, Close */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Icon */}
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 border-[1.6px]"
            style={{ borderColor: accent, color: accent }}
          >
            <span className="material-symbols-outlined text-xl">
              {counselor.icon}
            </span>
          </div>

          {/* Counselor Name (on mobile, shown prominently) */}
          <span className="font-display text-xl font-semibold sm:hidden">{counselor.name}</span>
        </div>

        {/* Counselor Name & Impression */}
        <div className="flex-grow w-full sm:w-auto">
          <p className="leading-snug">
            <span className="font-display text-xl font-semibold hidden sm:inline">{counselor.name}: </span>
            <span className="font-display italic text-lg">{impression}</span>
          </p>
        </div>

        {/* View Full Button */}
        <button
          onClick={onViewFull}
          className="btn-seal flex-shrink-0 w-full sm:w-auto !py-2.5 !px-5 text-center whitespace-nowrap"
        >
          View Full Analysis
        </button>
      </div>
    </div>
  );
};

export default InsightBar;
