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

// Helper to calculate quadratic bezier point at t (0-1)
const getQuadraticBezierPoint = (
  start: { x: number; y: number },
  control: { x: number; y: number },
  end: { x: number; y: number },
  t: number
) => {
  const x = Math.pow(1 - t, 2) * start.x + 2 * (1 - t) * t * control.x + Math.pow(t, 2) * end.x;
  const y = Math.pow(1 - t, 2) * start.y + 2 * (1 - t) * t * control.y + Math.pow(t, 2) * end.y;
  return { x, y };
};

// Calculate optimal marker position that avoids counselor nodes and center dilemma
const calculateMarkerPosition = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  control: { x: number; y: number },
  counselorPositions: { x: number; y: number }[],
  centerX: number,
  centerY: number
) => {
  const minDistanceFromNode = 90; // Minimum distance from counselor nodes (in viewBox units)
  const minDistanceFromCenter = 220; // Increased to avoid the large center dilemma circle
  
  // Try positions closer to the endpoints first (away from center)
  // Prioritize positions at t=0.25 and t=0.75 which are closer to counselors
  const candidates = [0.25, 0.75, 0.3, 0.7, 0.2, 0.8, 0.35, 0.65];
  
  for (const t of candidates) {
    const point = getQuadraticBezierPoint(start, control, end, t);
    
    // Check distance from center
    const distFromCenter = Math.sqrt(Math.pow(point.x - centerX, 2) + Math.pow(point.y - centerY, 2));
    if (distFromCenter < minDistanceFromCenter) continue;
    
    // Check distance from all counselor positions
    let tooClose = false;
    for (const pos of counselorPositions) {
      const dist = Math.sqrt(Math.pow(point.x - pos.x, 2) + Math.pow(point.y - pos.y, 2));
      if (dist < minDistanceFromNode) {
        tooClose = true;
        break;
      }
    }
    
    if (!tooClose) {
      return { x: point.x, y: point.y, t };
    }
  }
  
  // Fallback: find midpoint and push it radially outward from center
  const midpoint = getQuadraticBezierPoint(start, control, end, 0.5);
  const angleFromCenter = Math.atan2(midpoint.y - centerY, midpoint.x - centerX);
  // Push significantly outward to clear the center circle
  const pushDistance = Math.max(minDistanceFromCenter - Math.sqrt(Math.pow(midpoint.x - centerX, 2) + Math.pow(midpoint.y - centerY, 2)) + 40, 60);
  return {
    x: midpoint.x + Math.cos(angleFromCenter) * pushDistance,
    y: midpoint.y + Math.sin(angleFromCenter) * pushDistance,
    t: 0.5
  };
};

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
  const [hoveredTensionIdx, setHoveredTensionIdx] = React.useState<number | null>(null);

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

      {/* Debate Tension Lines Layer with Numbered Markers */}
      {isDebateMode && (
        <>
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 1000 1000" preserveAspectRatio="none">
            {activeTensions.map((pair, idx) => {
              const idx1 = counselors.findIndex(c => c.id === pair.counselor1);
              const idx2 = counselors.findIndex(c => c.id === pair.counselor2);
              if (idx1 === -1 || idx2 === -1) return null;

              const start = getCoords(idx1);
              const end = getCoords(idx2);
              const cx = 500;
              const cy = 500;
              
              const isHovered = hoveredTensionIdx === idx;
              const isConflict = pair.type === 'conflict';

              return (
                <g 
                  key={idx} 
                  className="pointer-events-auto cursor-pointer group" 
                  onClick={() => onTensionClick(pair)}
                  onMouseEnter={() => setHoveredTensionIdx(idx)}
                  onMouseLeave={() => setHoveredTensionIdx(null)}
                >
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
                    stroke={isConflict ? '#ef4444' : '#10b981'}
                    strokeWidth={isHovered ? 5 : 3}
                    strokeDasharray={pair.type === 'challenge' ? "12 12" : "0"}
                    className="transition-all duration-300"
                    style={{
                      filter: isHovered 
                        ? `drop-shadow(0 0 10px ${isConflict ? 'rgba(239,68,68,0.9)' : 'rgba(16,185,129,0.9)'})` 
                        : `drop-shadow(0 0 5px ${isConflict ? 'rgba(239,68,68,0.5)' : 'rgba(16,185,129,0.5)'})`
                    }}
                  />
                  {/* Animated Pulse on Line */}
                  <circle r="4" fill="white" opacity={isHovered ? 1 : 0.7}>
                    <animateMotion dur="2s" repeatCount="indefinite" path={`M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`} />
                  </circle>
                </g>
              );
            })}
          </svg>

          {/* Small Numbered Markers on Lines */}
          {activeTensions.map((pair, idx) => {
            const idx1 = counselors.findIndex(c => c.id === pair.counselor1);
            const idx2 = counselors.findIndex(c => c.id === pair.counselor2);
            if (idx1 === -1 || idx2 === -1) return null;

            const start = getCoords(idx1);
            const end = getCoords(idx2);
            const control = { x: 500, y: 500 };

            // Get all counselor positions for collision avoidance
            const allCounselorCoords = counselors.map((_, i) => getCoords(i));

            // Calculate optimal marker position
            const markerPos = calculateMarkerPosition(start, end, control, allCounselorCoords, 500, 500);

            // Convert from viewBox coordinates (0-1000) to percentage
            const leftPercent = markerPos.x / 10;
            const topPercent = markerPos.y / 10;

            const isConflict = pair.type === 'conflict';
            const isHovered = hoveredTensionIdx === idx;
            const markerNumber = idx + 1;

            return (
              <div
                key={`marker-${idx}`}
                className="absolute z-10 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                style={{
                  left: `${leftPercent}%`,
                  top: `${topPercent}%`,
                }}
                onClick={() => onTensionClick(pair)}
                onMouseEnter={() => setHoveredTensionIdx(idx)}
                onMouseLeave={() => setHoveredTensionIdx(null)}
              >
                <div 
                  className={`
                    w-7 h-7 rounded-full flex items-center justify-center
                    font-bold text-xs text-white
                    transition-all duration-200 shadow-lg
                    ${isHovered ? 'scale-125' : 'scale-100'}
                  `}
                  style={{
                    backgroundColor: isConflict ? '#ef4444' : '#10b981',
                    boxShadow: isHovered 
                      ? `0 0 16px ${isConflict ? 'rgba(239,68,68,0.8)' : 'rgba(16,185,129,0.8)'}` 
                      : `0 0 8px ${isConflict ? 'rgba(239,68,68,0.5)' : 'rgba(16,185,129,0.5)'}`,
                  }}
                >
                  {markerNumber}
                </div>
              </div>
            );
          })}

          {/* Tension Legend Panel (Fixed to Screen Top Right) */}
          <div 
            className="fixed top-20 right-6 w-72 backdrop-blur-md rounded-xl p-4 z-30 animate-fade-in shadow-xl"
            style={{
              backgroundColor: 'var(--bg-glass)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="material-symbols-outlined text-lg text-yellow-400">electric_bolt</span>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                Tensions
              </h3>
              {/* Legend Key */}
              <div className="ml-auto flex items-center gap-3 text-[10px]">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <span style={{ color: 'var(--text-muted)' }}>Conflict</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <span style={{ color: 'var(--text-muted)' }}>Synthesis</span>
                </div>
              </div>
            </div>
            
            <ul className="space-y-2">
              {activeTensions.map((pair, idx) => {
                const c1 = counselors.find(c => c.id === pair.counselor1);
                const c2 = counselors.find(c => c.id === pair.counselor2);
                if (!c1 || !c2) return null;

                const isConflict = pair.type === 'conflict';
                const isHovered = hoveredTensionIdx === idx;
                const coreIssue = councilData?.tensions[idx]?.core_issue || 
                  (isConflict ? 'Opposing viewpoints' : 'Different priorities');

                return (
                  <li 
                    key={idx} 
                    className={`
                      p-2.5 rounded-lg cursor-pointer transition-all duration-200
                      ${isHovered ? 'scale-[1.02]' : ''}
                    `}
                    style={{
                      backgroundColor: isHovered 
                        ? (isConflict ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)')
                        : 'transparent',
                      border: `1px solid ${isHovered 
                        ? (isConflict ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)')
                        : 'transparent'
                      }`,
                    }}
                    onClick={() => onTensionClick(pair)}
                    onMouseEnter={() => setHoveredTensionIdx(idx)}
                    onMouseLeave={() => setHoveredTensionIdx(null)}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Numbered Badge */}
                      <div 
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: isConflict ? '#ef4444' : '#10b981' }}
                      >
                        {idx + 1}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {/* Counselor Names */}
                        <div className="flex items-center gap-1.5 text-xs font-medium mb-1">
                          <span style={{ color: 'var(--text-secondary)' }}>{c1.name}</span>
                          <span className={isConflict ? 'text-red-400' : 'text-emerald-400'}>↔</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{c2.name}</span>
                        </div>
                        
                        {/* Core Issue */}
                        <p 
                          className="text-[11px] leading-relaxed"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {coreIssue}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      {/* Center Dilemma Node */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <button
          onClick={onCenterClick}
          className="w-64 h-64 rounded-full backdrop-blur-sm border flex flex-col items-center justify-center text-center p-5 group transition-all duration-500 cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-glass)',
            borderColor: currentAtmosphere?.borderColor || 'var(--border-primary)',
            boxShadow: currentAtmosphere ? `0 0 60px ${currentAtmosphere.glow}` : '0 0 40px rgba(79,70,229,0.2)'
          }}
        >
          <span className="text-xs font-semibold uppercase tracking-wider mb-2 group-hover:text-primary transition-colors" style={{ color: 'var(--text-muted)' }}>Your Dilemma</span>
          <p className="text-lg font-bold leading-tight break-words w-full line-clamp-3 px-2" style={{ color: 'var(--text-primary)' }}>
            {dilemmaSummary || "Waiting for input..."}
          </p>
          {contextSummary && (
            <span className="text-[10px] mt-2 italic leading-tight px-3 break-words" style={{ color: 'var(--text-muted)' }}>
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
        let buttonClass = `w-full h-full rounded-full backdrop-blur-md border flex flex-col items-center justify-center p-2 transition-transform duration-300 ${colors.border} ${colors.text}`;
        let buttonStyle: React.CSSProperties = { 
          ['--glow-color' as string]: colors.glow,
          backgroundColor: 'var(--bg-glass)',
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
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{counselor.name}</span>
            </button>
          </div>
        );
      })}

    </div>
  );
};

export default ReflectionSphere;
