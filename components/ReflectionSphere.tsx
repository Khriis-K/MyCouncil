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
  const [hoveredCounselorId, setHoveredCounselorId] = React.useState<string | null>(null);

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

  // Ambient atmosphere colors for each lens
  const atmosphereColors: Record<string, { gradient: string, glow: string, borderColor: string }> = {
    'Decision-Making': {
      gradient: 'radial-gradient(ellipse at center, rgba(249, 115, 22, 0.08) 0%, transparent 60%)',
      glow: 'rgba(249, 115, 22, 0.3)',
      borderColor: 'rgba(249, 115, 22, 0.4)'
    },
    'Emotional Processing': {
      gradient: 'radial-gradient(ellipse at center, rgba(236, 72, 153, 0.08) 0%, transparent 60%)',
      glow: 'rgba(236, 72, 153, 0.3)',
      borderColor: 'rgba(236, 72, 153, 0.4)'
    },
    'Creative Problem Solving': {
      gradient: 'radial-gradient(ellipse at center, rgba(6, 182, 212, 0.08) 0%, transparent 60%)',
      glow: 'rgba(6, 182, 212, 0.3)',
      borderColor: 'rgba(6, 182, 212, 0.4)'
    }
  };

  const currentAtmosphere = reflectionFocus ? atmosphereColors[reflectionFocus] : null;

  return (
    <div className="relative w-full h-full max-w-5xl max-h-[80vh] aspect-square flex items-center justify-center">

      {/* Ambient Atmosphere Layer */}
      {currentAtmosphere && (
        <div 
          className="absolute inset-0 pointer-events-none animate-atmosphere-breathe"
          style={{ background: currentAtmosphere.gradient }}
        >
          {/* Secondary atmospheric glow spots */}
          <div 
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(circle at 30% 30%, ${currentAtmosphere.glow.replace('0.3', '0.04')} 0%, transparent 40%),
                radial-gradient(circle at 70% 70%, ${currentAtmosphere.glow.replace('0.3', '0.03')} 0%, transparent 30%)
              `
            }}
          />
        </div>
      )}

      {/* Vignette Overlay (New) */}
      {currentFocusOption && (
        <div className="fixed inset-0 pointer-events-none z-0">
           {/* Vignette Gradient */}
           <div 
             className="absolute inset-0"
             style={{
               background: `radial-gradient(ellipse at center, transparent 40%, ${currentAtmosphere?.glow.replace('0.3', '0.08') || 'rgba(168, 85, 247, 0.08)'} 100%)`
             }}
           />
           {/* Shimmer Border Effect (Simulated with inset shadow for simplicity in React) */}
           <div className="absolute inset-0 border-[3px] border-transparent rounded-none opacity-30"
                style={{
                  boxShadow: `inset 0 0 40px ${currentAtmosphere?.glow.replace('0.3', '0.1') || 'rgba(168, 85, 247, 0.1)'}`
                }}
           />
        </div>
      )}

      {/* Floating Orb Focus Indicator (New) */}
      {currentFocusOption && (
        <div className="absolute top-6 right-6 z-20 flex items-center gap-4 px-5 py-3 rounded-full backdrop-blur-md border border-white/10 shadow-2xl animate-float"
             style={{
               background: currentAtmosphere?.glow.replace('0.3', '0.2') || 'rgba(168, 85, 247, 0.2)',
               borderColor: currentAtmosphere?.borderColor || 'rgba(168, 85, 247, 0.4)'
             }}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner ${currentFocusOption.color.replace('text-', 'bg-').replace('400', '500').replace('500', '600')}`}>
            <span className="material-symbols-outlined text-white text-xl">visibility</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white uppercase tracking-wider">
              {currentFocusOption.label.split(' ')[0]} Lens
            </span>
            <span className={`text-xs font-medium opacity-90 leading-none mt-0.5 ${currentFocusOption.color}`}>
              {currentFocusOption.label.split(' ').slice(1).join(' ') || 'Perspective'}
            </span>
          </div>
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
          className="w-64 h-64 rounded-full bg-slate-800/40 backdrop-blur-sm border flex flex-col items-center justify-center text-center p-5 group hover:bg-slate-800/60 transition-all duration-500 cursor-pointer"
          style={{
            borderColor: currentAtmosphere?.borderColor || 'rgb(51, 65, 85)',
            boxShadow: currentAtmosphere ? `0 0 60px ${currentAtmosphere.glow}` : '0 0 40px rgba(79,70,229,0.2)'
          }}
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
          red: { border: 'border-red-500', text: 'text-red-400', glow: 'rgba(239,68,68,0.4)' },
        };

        const colors = colorMap[counselor.color] || colorMap['purple'];

        // Wrapper styles for positioning
        let wrapperClass = "absolute w-32 h-32 z-[100] transition-all duration-300 flex items-center justify-center";
        let wrapperStyle: React.CSSProperties = {};

        // Button styles for appearance
        let buttonClass = `w-full h-full rounded-full bg-slate-800/80 backdrop-blur-md border flex flex-col items-center justify-center p-2 transition-transform duration-300 ${colors.border} ${colors.text}`;
        let buttonStyle: React.CSSProperties = { 
          ['--glow-color' as string]: colors.glow,
        };

        if (isRefining) {
          // STATE 1: REFINING
          wrapperClass += ' pointer-events-none opacity-0 scale-50'; 
          wrapperStyle.top = 'calc(50% - 4rem)';
          wrapperStyle.left = 'calc(50% - 4rem)';
        } else if (isInitialRender) {
          // STATE 2: ENTERING
          wrapperClass += ' animate-slide-from-center';
          wrapperStyle.top = `calc(${pos.top} - 4rem)`;
          wrapperStyle.left = `calc(${pos.left} - 4rem)`;
        } else {
          // STATE 3: STABLE
          buttonClass += ' animate-pulse-glow hover:scale-110';
          wrapperStyle.top = `calc(${pos.top} - 4rem)`;
          wrapperStyle.left = `calc(${pos.left} - 4rem)`;
        }

        return (
          <div
            key={counselor.id}
            className={wrapperClass}
            style={wrapperStyle}
            onMouseEnter={() => setHoveredCounselorId(counselor.id)}
            onMouseLeave={() => setHoveredCounselorId(null)}
          >
            <button
              data-counselor-sphere
              onClick={(e) => {
                e.stopPropagation();
                onCounselorClick(counselor);
              }}
              className={buttonClass}
              style={buttonStyle}
              disabled={isRefining}
            >
              <span className="material-symbols-outlined text-3xl mb-2">{counselor.icon}</span>
              <span className="text-xs font-medium text-slate-200">{counselor.name}</span>
            </button>
          </div>
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
