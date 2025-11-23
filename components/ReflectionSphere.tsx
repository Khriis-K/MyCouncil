
import React from 'react';
import { Counselor, TensionPair, CouncilResponse } from '../types';

interface ReflectionSphereProps {
  dilemma: string;
  dilemmaSummary: string;
  counselors: Counselor[];
  councilData: CouncilResponse | null; // New prop
  isDebateMode: boolean;
  tensionPairs: TensionPair[];
  onCounselorClick: (counselor: Counselor) => void;
  onTensionClick: (pair: TensionPair) => void;
}

const ReflectionSphere: React.FC<ReflectionSphereProps> = ({
  dilemma,
  dilemmaSummary,
  counselors,
  councilData,
  isDebateMode,
  tensionPairs,
  onCounselorClick,
  onTensionClick
}) => {
  // Use dynamic tensions if available, otherwise fall back to static
  const activeTensions = councilData?.tensions.map(t => ({
    counselor1: t.counselor_ids[0],
    counselor2: t.counselor_ids[1],
    type: t.type
  })) || tensionPairs;
  // Define positions for 4 counselors (Top-Left, Top-Right, Bottom-Left, Bottom-Right)
  const positions = [
    { top: '25%', left: '25%' },
    { top: '25%', left: '75%' },
    { top: '75%', left: '25%' },
    { top: '75%', left: '75%' },
  ];

  // Helper to get coordinates for SVG lines based on percentages
  const getCoords = (posIndex: number) => {
    const x = posIndex % 2 === 0 ? 250 : 750; // 25% or 75% mapped to 1000 width
    const y = posIndex < 2 ? 250 : 750;       // 25% or 75% mapped to 1000 height
    return { x, y };
  };

  return (
    <div className="relative w-full h-full max-w-5xl max-h-[80vh] aspect-square flex items-center justify-center">

      {/* Debate Tension Lines Layer */}
      {isDebateMode && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 1000 1000">
          {activeTensions.map((pair, idx) => {
            // Hardcoding mapping for prototype since IDs are fixed
            const idx1 = counselors.findIndex(c => c.id === pair.counselor1);
            const idx2 = counselors.findIndex(c => c.id === pair.counselor2);
            if (idx1 === -1 || idx2 === -1) return null;

            const start = getCoords(idx1);
            const end = getCoords(idx2);

            // Calculate control point for curve
            const cx = 500;
            const cy = 500;

            return (
              <g key={idx} className="pointer-events-auto cursor-pointer group" onClick={() => onTensionClick(pair)}>
                {/* Invisible thick line for easier clicking */}
                <path
                  d={`M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="40"
                />
                {/* Visible styled line */}
                <path
                  d={`M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`}
                  fill="none"
                  stroke={pair.type === 'conflict' ? '#ef4444' : pair.type === 'synthesis' ? '#10b981' : '#facc15'}
                  strokeWidth="3"
                  strokeDasharray={pair.type === 'challenge' ? "12 12" : "0"}
                  className={`transition-all duration-300 ${pair.type === 'conflict' ? 'drop-shadow-[0_0_5px_rgba(239,68,68,0.7)]' : 'drop-shadow-[0_0_5px_rgba(16,185,129,0.7)]'} group-hover:stroke-width-4`}
                />
                {/* Animated Pulse on Line */}
                <circle r="4" fill="white">
                  <animateMotion dur="2s" repeatCount="indefinite" path={`M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`} />
                </circle>
              </g>
            );
          })}
        </svg>
      )}

      {/* Center Dilemma Node */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="w-64 h-64 rounded-full bg-slate-800/40 backdrop-blur-sm border border-slate-700 flex flex-col items-center justify-center text-center p-6 shadow-[0_0_40px_rgba(79,70,229,0.2)] group hover:bg-slate-800/60 transition-all">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 group-hover:text-primary transition-colors">Your Dilemma</span>
          <p className="text-xl font-bold text-white leading-tight break-words w-full line-clamp-4">
            {dilemmaSummary || "Waiting for input..."}
          </p>
        </div>
      </div>

      {/* Counselors */}
      {counselors.map((counselor, idx) => {
        const pos = positions[idx];
        const colorMap: Record<string, string> = {
          blue: 'border-blue-500 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]',
          green: 'border-green-500 text-green-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]',
          yellow: 'border-yellow-500 text-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.3)]',
          purple: 'border-purple-500 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)]',
        };

        return (
          <button
            key={counselor.id}
            onClick={() => onCounselorClick(counselor)}
            className={`absolute w-32 h-32 rounded-full bg-slate-800/80 backdrop-blur-md border flex flex-col items-center justify-center p-2 transition-all duration-300 hover:scale-110 z-20 ${colorMap[counselor.color]}`}
            style={{ top: `calc(${pos.top} - 4rem)`, left: `calc(${pos.left} - 4rem)` }} // Centering based on size
          >
            <span className="material-symbols-outlined text-3xl mb-2">{counselor.icon}</span>
            <span className="text-xs font-medium text-slate-200">{counselor.name}</span>
          </button>
        );
      })}

      {/* Debate Debate Highlights Panel (Fixed position relative to sphere container for prototype) */}
      {isDebateMode && (
        <div className="absolute top-0 right-0 w-72 bg-slate-800/80 backdrop-blur-md border border-slate-700/50 rounded-lg p-4 z-20 animate-fade-in">
          <h3 className="font-semibold text-slate-200 mb-3 text-sm flex items-center">
            <span className="material-symbols-outlined text-lg mr-2 text-yellow-400">bolt</span>
            Debate Highlights
          </h3>
          <ul className="space-y-3">
            {activeTensions.map((pair, idx) => {
              const c1 = counselors.find(c => c.id === pair.counselor1);
              const c2 = counselors.find(c => c.id === pair.counselor2);
              if (!c1 || !c2) return null;

              return (
                <li key={idx} className="text-xs text-slate-400 leading-relaxed">
                  <span className="font-medium text-slate-300 block mb-0.5">
                    {c1.name} vs {c2.name}:
                  </span>
                  {/* Show dynamic core issue if available */}
                  {councilData?.tensions[idx]?.core_issue || (pair.type === 'conflict' ? 'Questioning the long-term career benefits.' : 'Exploring emotional needs in future planning.')}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ReflectionSphere;
