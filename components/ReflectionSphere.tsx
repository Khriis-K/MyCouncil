
import React from 'react';
import { Counselor, TensionPair, CouncilResponse, ReflectionFocus } from '../types';
import { REFLECTION_FOCUS_OPTIONS } from '../constants';

interface ReflectionSphereProps {
  dilemma: string;
  dilemmaSummary: string;
  contextSummary?: string; // AI-generated summary of refinements
  counselors: Counselor[];
  councilData: CouncilResponse | null; // New prop
  isDebateMode: boolean;
  tensionPairs: TensionPair[];
  onCounselorClick: (counselor: Counselor) => void;
  onTensionClick: (pair: TensionPair) => void;
  onCenterClick?: () => void;
  isInitialRender?: boolean; // For initial counselor animation
  isRefining?: boolean; // For refinement loading state
  reflectionFocus?: ReflectionFocus;
}

const ReflectionSphere: React.FC<ReflectionSphereProps> = ({
  dilemma,
  dilemmaSummary,
  contextSummary,
  counselors,
  councilData,
  isDebateMode,
  tensionPairs,
  onCounselorClick,
  onTensionClick,
  onCenterClick,
  isInitialRender = false,
  isRefining = false,
  reflectionFocus
}) => {
  // Use dynamic tensions if available, otherwise fall back to static
  const activeTensions = councilData?.tensions.map(t => ({
    counselor1: t.counselor_ids[0],
    counselor2: t.counselor_ids[1],
    type: t.type
  })) || tensionPairs;
  
  const currentFocusOption = reflectionFocus ? REFLECTION_FOCUS_OPTIONS.find(opt => opt.value === reflectionFocus) : null;
  
  // Calculate evenly-spaced circular positions based on number of counselors
  const calculatePositions = (count: number) => {
    const positions = [];
    const radius = 40; // Distance from center (percentage)
    const centerX = 50;
    const centerY = 50;
    const startAngle = -90; // Start at top (12 o'clock)
    
    for (let i = 0; i < count; i++) {
      const angle = (startAngle + (360 / count) * i) * (Math.PI / 180);
      const left = centerX + radius * Math.cos(angle);
      const top = centerY + radius * Math.sin(angle);
      positions.push({
        top: `${top}%`,
        left: `${left}%`,
        angle: angle // Store angle for animation direction
      });
    }
    return positions;
  };

  const positions = calculatePositions(counselors.length);

  // Helper to get coordinates for SVG lines based on position percentages
  const getCoords = (posIndex: number) => {
    if (posIndex >= positions.length) return { x: 500, y: 500 };
    const pos = positions[posIndex];
    // Position percentages are for the center of the counselor sphere
    const x = parseFloat(pos.left) * 10; // Convert % to 1000 viewBox scale
    const y = parseFloat(pos.top) * 10;
    return { x, y };
  };

  return (
    <div className="relative w-full h-full max-w-5xl max-h-[80vh] aspect-square flex items-center justify-center">

      {/* Reflection Focus Indicator */}
      {currentFocusOption && (
        <div className="absolute top-8 right-8 z-20">
          <div className={`px-4 py-2 rounded-lg border ${currentFocusOption.badgeColor} backdrop-blur-sm flex items-center gap-2 shadow-lg`}>
            <span className="material-symbols-outlined text-sm">visibility</span>
            <span className="text-sm font-medium">{currentFocusOption.label} Lens</span>
          </div>
        </div>
      )}

      {/* Analyzing Heading */}
      {currentFocusOption && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10">
          <p className={`text-sm font-medium ${currentFocusOption.color} opacity-70`}>
            Analyzing through {currentFocusOption.label.toLowerCase()} perspective
          </p>
        </div>
      )}

      {/* Debate Tension Lines Layer */}
      {isDebateMode && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 1000 1000" preserveAspectRatio="none">
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
        <button
          onClick={onCenterClick}
          className="w-64 h-64 rounded-full bg-slate-800/40 backdrop-blur-sm border border-slate-700 flex flex-col items-center justify-center text-center p-5 shadow-[0_0_40px_rgba(79,70,229,0.2)] group hover:bg-slate-800/60 transition-all cursor-pointer"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 group-hover:text-primary transition-colors">Your Dilemma</span>
          <p className="text-lg font-bold text-white leading-tight break-words w-full line-clamp-3 px-2">
            {dilemmaSummary || "Waiting for input..."}
          </p>
          {contextSummary && (
            <span className="text-[10px] text-slate-400 mt-2 italic leading-tight px-3 break-words">
              {contextSummary}
            </span>
          )}
        </button>
      </div>

      {/* Counselors */}
      {counselors.map((counselor, idx) => {
        const pos = positions[idx];
        const colorMap: Record<string, { border: string, text: string, glow: string }> = {
          blue: { border: 'border-blue-500', text: 'text-blue-400', glow: 'rgba(59,130,246,0.4)' },
          green: { border: 'border-green-500', text: 'text-green-400', glow: 'rgba(16,185,129,0.4)' },
          yellow: { border: 'border-yellow-500', text: 'text-yellow-400', glow: 'rgba(234,179,8,0.4)' },
          purple: { border: 'border-purple-500', text: 'text-purple-400', glow: 'rgba(168,85,247,0.4)' },
        };

        const colors = colorMap[counselor.color];

        // Calculate direction vector from center (50%, 50%) to counselor position
        const centerX = 50;
        const centerY = 50;
        const targetX = parseFloat(pos.left);
        const targetY = parseFloat(pos.top);
        const deltaX = targetX - centerX;
        const deltaY = targetY - centerY;
        
        // For transform, we need the opposite direction (toward center = negative of current offset)
        const translateXPercent = -deltaX;
        const translateYPercent = -deltaY;

        // Determine animation and styling based on state
        let baseClass = `absolute w-32 h-32 rounded-full bg-slate-800/80 backdrop-blur-md border flex flex-col items-center justify-center p-2 transition-all duration-300 hover:scale-110 z-[100] ${colors.border} ${colors.text}`;
        let animationStyle: React.CSSProperties = { 
          ['--glow-color' as string]: colors.glow,
        };

        if (isRefining) {
          // STATE 1: REFINING
          // Remove the glow so we can control the transform.
          // Fade out, scale down, and ignore pointer events.
          baseClass += ' pointer-events-none opacity-0 scale-50'; 
          
          // Move to center
          animationStyle.top = 'calc(50% - 4rem)';
          animationStyle.left = 'calc(50% - 4rem)';
          
        } else if (isInitialRender) {
          // STATE 2: ENTERING
          // Use your entry animation
          baseClass += ' animate-slide-from-center';
          
          // Set target position
          animationStyle.top = `calc(${pos.top} - 4rem)`;
          animationStyle.left = `calc(${pos.left} - 4rem)`;
          
        } else {
          // STATE 3: STABLE
          // NOW we add the glow animation and hover effects
          baseClass += ' animate-pulse-glow hover:scale-110';
          
          // Keep at target position
          animationStyle.top = `calc(${pos.top} - 4rem)`;
          animationStyle.left = `calc(${pos.left} - 4rem)`;
        }
        // Note: No else block - counselors should just have the base glow animation when idle

        return (
          <button
            key={counselor.id}
            data-counselor-sphere
            onClick={(e) => {
              e.stopPropagation();
              onCounselorClick(counselor);
            }}
            className={baseClass}
            style={animationStyle}
            disabled={isRefining}
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
