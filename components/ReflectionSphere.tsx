import React from 'react';
import { Counselor, TensionPair, CouncilResponse, ReflectionFocus } from '../types';
import { REFLECTION_FOCUS_OPTIONS } from '../constants';
import { useContainerSize, calculateLayoutValues } from '../hooks/useContainerSize';

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

// Helper to calculate control point for "Orbital Slingshot"
// Pushes the curve outward (away from center) to avoid the central dilemma text
const getSlingshotControlPoint = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  centerX: number,
  centerY: number
) => {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  
  // Vector from center to midpoint
  const vx = midX - centerX;
  const vy = midY - centerY;
  
  // Push OUTWARD by 20% to create a gentle arc away from center
  // This ensures the badge (at peak) is further from the dilemma text
  const factor = 0.2; 
  
  return {
    x: midX + vx * factor,
    y: midY + vy * factor
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
  const [isTensionDrawerOpen, setIsTensionDrawerOpen] = React.useState(false);

  // Use container-aware sizing hook
  const [containerRef, containerSize] = useContainerSize<HTMLDivElement>();
  const layout = calculateLayoutValues(containerSize);
  
  // Derived flags for convenience
  const { isConstrained, isLandscape, isMobile, isTablet } = containerSize;

  // Use dynamic tensions if available, otherwise fall back to static
  const activeTensions = councilData?.tensions.map(t => ({
    counselor1: t.counselor_ids[0],
    counselor2: t.counselor_ids[1],
    type: t.type
  })) || tensionPairs;
  
  const currentFocusOption = reflectionFocus ? REFLECTION_FOCUS_OPTIONS.find(opt => opt.value === reflectionFocus) : null;
  
  // Calculate evenly-spaced circular positions based on number of counselors
  // Uses pixel-based positioning for accurate placement on any aspect ratio
  const calculatePositions = (count: number) => {
    const positions = [];
    // Use pixel radius from layout, centered in the container
    const radius = layout.orbitRadius;
    const centerX = layout.width / 2;   // Pixel center X
    const centerY = layout.height / 2;  // Pixel center Y
    const startAngle = -90; // Start at top (12 o'clock)
    
    for (let i = 0; i < count; i++) {
      const angle = (startAngle + (360 / count) * i) * (Math.PI / 180);
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      positions.push({
        x,  // Pixel position
        y,  // Pixel position
        angle: angle // Store angle for animation direction
      });
    }
    return positions;
  };

  const positions = calculatePositions(counselors.length);

  // Helper to get coordinates for SVG lines based on pixel positions
  // SVG viewBox is 1000x1000 but we scale it to match container aspect ratio
  const getCoords = (posIndex: number) => {
    if (posIndex >= positions.length) return { x: 500, y: 500 };
    const pos = positions[posIndex];
    // Convert pixel positions to viewBox scale (0-1000)
    // Use the same scale for both X and Y to maintain proper positioning
    const x = (pos.x / layout.width) * 1000;
    const y = (pos.y / layout.height) * 1000;
    return { x, y };
  };
  
  // Get center coordinates for SVG
  const svgCenterX = 500;  // Center of 1000x1000 viewBox
  const svgCenterY = 500;

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
    <div 
      ref={containerRef}
      className="sphere-container relative w-full h-full flex items-center justify-center"
      style={{ maxWidth: '100%', maxHeight: '100%' }}
    >

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

      {/* Floating Orb Focus Indicator - hidden on landscape, moves left when debate panel visible */}
      {currentFocusOption && !isLandscape && (
        <div 
          className={`absolute z-20 flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-md border border-white/10 shadow-2xl animate-float ${isMobile ? 'scale-90' : ''}`}
          style={{
            top: '1rem',
            // Move to left side when debate mode is on and we're not constrained (legend is showing on right)
            right: (isDebateMode && !isConstrained) ? 'auto' : '1rem',
            left: (isDebateMode && !isConstrained) ? '1rem' : 'auto',
            background: currentAtmosphere?.glow.replace('0.3', '0.2') || 'rgba(168, 85, 247, 0.2)',
            borderColor: currentAtmosphere?.borderColor || 'rgba(168, 85, 247, 0.4)'
          }}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-inner ${currentFocusOption.color.replace('text-', 'bg-').replace('400', '500').replace('500', '600')}`}>
            <span className="material-symbols-outlined text-white text-lg">visibility</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {currentFocusOption.label.split(' ')[0]} Lens
            </span>
            {!isMobile && (
              <span className={`text-[10px] font-medium opacity-90 leading-none mt-0.5 ${currentFocusOption.color}`}>
                {currentFocusOption.label.split(' ').slice(1).join(' ') || 'Perspective'}
              </span>
            )}
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
              
              // Calculate control point for slingshot curve
              const control = getSlingshotControlPoint(start, end, svgCenterX, svgCenterY);
              
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
                    d={`M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="40"
                  />
                  {/* Visible styled line */}
                  <path
                    d={`M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`}
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
                    <animateMotion dur="2s" repeatCount="indefinite" path={`M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`} />
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

            // Use pixel positions directly from counselor positions
            const pos1 = positions[idx1];
            const pos2 = positions[idx2];
            if (!pos1 || !pos2) return null;
            
            // Calculate the center of the container
            const centerX = layout.width / 2;
            const centerY = layout.height / 2;
            
            // Get the bezier curve control point (slingshot logic)
            const control = getSlingshotControlPoint(pos1, pos2, centerX, centerY);
            
            // Use t=0.5 to place marker at the peak of the curve (furthest from center)
            const t = 0.5;
            const markerPos = getQuadraticBezierPoint(pos1, control, pos2, t);
            
            const markerX = markerPos.x;
            const markerY = markerPos.y;

            const isConflict = pair.type === 'conflict';
            const isHovered = hoveredTensionIdx === idx;
            const markerNumber = idx + 1;

            return (
              <div
                key={`marker-${idx}`}
                className="absolute z-10 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                style={{
                  left: `${markerX}px`,
                  top: `${markerY}px`,
                }}
                onClick={() => onTensionClick(pair)}
                onMouseEnter={() => setHoveredTensionIdx(idx)}
                onMouseLeave={() => setHoveredTensionIdx(null)}
              >
                <div 
                  className={`
                    w-9 h-9 rounded-full flex items-center justify-center
                    font-bold text-sm text-white
                    transition-all duration-200 shadow-lg
                    ${isHovered ? 'scale-125' : 'scale-100'}
                  `}
                  style={{
                    backgroundColor: isConflict ? '#ef4444' : '#10b981',
                    boxShadow: isHovered 
                      ? `0 0 20px ${isConflict ? 'rgba(239,68,68,0.8)' : 'rgba(16,185,129,0.8)'}` 
                      : `0 0 10px ${isConflict ? 'rgba(239,68,68,0.5)' : 'rgba(16,185,129,0.5)'}`,
                  }}
                >
                  {markerNumber}
                </div>
              </div>
            );
          })}

          {/* Tension Legend - Constrained: Bottom Drawer, Unconstrained: Absolute within container */}
          {/* Unconstrained: Panel positioned relative to container, not viewport */}
          {!isConstrained && (
            <div 
              className="absolute top-4 right-4 w-80 max-w-[35%] backdrop-blur-md rounded-xl p-4 z-30 animate-fade-in shadow-xl"
              style={{
                backgroundColor: 'var(--bg-glass)',
                border: '1px solid var(--border-subtle)'
              }}
            >
            <div className="flex items-center gap-2 mb-4 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="material-symbols-outlined text-xl text-yellow-400">electric_bolt</span>
              <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                Tensions
              </h3>
              {/* Legend Key */}
              <div className="ml-auto flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span style={{ color: 'var(--text-muted)' }}>Conflict</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span style={{ color: 'var(--text-muted)' }}>Synthesis</span>
                </div>
              </div>
            </div>
            
            <ul className="space-y-3">
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
                      p-3 rounded-lg cursor-pointer transition-all duration-200
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
                    <div className="flex items-start gap-3">
                      {/* Numbered Badge */}
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: isConflict ? '#ef4444' : '#10b981' }}
                      >
                        {idx + 1}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {/* Counselor Names */}
                        <div className="flex items-center gap-2 text-sm font-medium mb-1">
                          <span style={{ color: 'var(--text-secondary)' }}>{c1.name}</span>
                          <span className={isConflict ? 'text-red-400' : 'text-emerald-400'}>↔</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{c2.name}</span>
                        </div>
                        
                        {/* Core Issue */}
                        <p 
                          className="text-xs leading-relaxed"
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
          )}

          {/* Constrained: Bottom Drawer Toggle Button */}
          {isConstrained && (
            <button
              onClick={() => setIsTensionDrawerOpen(!isTensionDrawerOpen)}
              className="fixed bottom-24 right-4 z-40 w-12 h-12 rounded-full backdrop-blur-md shadow-lg flex items-center justify-center transition-all"
              style={{
                backgroundColor: 'var(--bg-glass)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <span className="material-symbols-outlined text-yellow-400">
                {isTensionDrawerOpen ? 'close' : 'electric_bolt'}
              </span>
              {/* Badge showing tension count */}
              {!isTensionDrawerOpen && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {activeTensions.length}
                </span>
              )}
            </button>
          )}

          {/* Constrained: Bottom Drawer */}
          {isConstrained && (
            <div 
              className={`fixed bottom-0 left-0 right-0 z-30 backdrop-blur-md rounded-t-2xl shadow-2xl transition-transform duration-300 ${
                isTensionDrawerOpen ? 'translate-y-0' : 'translate-y-full'
              }`}
              style={{
                backgroundColor: 'var(--bg-glass)',
                border: '1px solid var(--border-subtle)',
                borderBottom: 'none',
                maxHeight: isLandscape ? '70vh' : '50vh'
              }}
            >
            {/* Drawer Handle */}
            <div className="flex justify-center py-2">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border-secondary)' }}></div>
            </div>
            
            {/* Drawer Header */}
            <div className="flex items-center gap-2 px-4 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="material-symbols-outlined text-lg text-yellow-400">electric_bolt</span>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                Tensions
              </h3>
              <div className="ml-auto flex items-center gap-3 text-[10px]">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span style={{ color: 'var(--text-muted)' }}>Conflict</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span style={{ color: 'var(--text-muted)' }}>Synthesis</span>
                </div>
              </div>
            </div>
            
            {/* Drawer Content */}
            <div className="p-4 overflow-y-auto" style={{ maxHeight: isLandscape ? 'calc(70vh - 60px)' : 'calc(50vh - 60px)' }}>
              <ul className="space-y-2">
                {activeTensions.map((pair, idx) => {
                  const c1 = counselors.find(c => c.id === pair.counselor1);
                  const c2 = counselors.find(c => c.id === pair.counselor2);
                  if (!c1 || !c2) return null;

                  const isConflict = pair.type === 'conflict';
                  const coreIssue = councilData?.tensions[idx]?.core_issue || 
                    (isConflict ? 'Opposing viewpoints' : 'Different priorities');

                  return (
                    <li 
                      key={idx} 
                      className="p-3 rounded-lg cursor-pointer active:scale-[0.98] transition-all"
                      style={{
                        backgroundColor: isConflict ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        border: `1px solid ${isConflict ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                      }}
                      onClick={() => {
                        onTensionClick(pair);
                        setIsTensionDrawerOpen(false);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: isConflict ? '#ef4444' : '#10b981' }}
                        >
                          {idx + 1}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-medium mb-1">
                            <span style={{ color: 'var(--text-secondary)' }}>{c1.name}</span>
                            <span className={isConflict ? 'text-red-400' : 'text-emerald-400'}>↔</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{c2.name}</span>
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                            {coreIssue}
                          </p>
                        </div>
                        
                        <span className="material-symbols-outlined text-lg" style={{ color: 'var(--text-muted)' }}>
                          chevron_right
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          )}

          {/* Drawer Backdrop */}
          {isConstrained && isTensionDrawerOpen && (
            <div 
              className="fixed inset-0 z-20 bg-black/30"
              onClick={() => setIsTensionDrawerOpen(false)}
            />
          )}
        </>
      )}

      {/* Center Dilemma Node - Dynamic container-aware sizing */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <button
          onClick={onCenterClick}
          className="rounded-full backdrop-blur-sm border flex flex-col items-center justify-center text-center group transition-all duration-500 cursor-pointer overflow-hidden"
          style={{
            width: `${layout.centerSize}px`,
            height: `${layout.centerSize}px`,
            padding: isMobile ? '0.75rem' : '1rem',
            backgroundColor: 'var(--bg-glass)',
            borderColor: currentAtmosphere?.borderColor || 'var(--border-primary)',
            boxShadow: currentAtmosphere ? `0 0 60px ${currentAtmosphere.glow}` : '0 0 40px rgba(79,70,229,0.2)'
          }}
        >
          <span 
            className="font-semibold uppercase tracking-wider mb-1 group-hover:text-primary transition-colors flex-shrink-0"
            style={{ fontSize: `${layout.centerLabelSize}px`, color: 'var(--text-muted)' }}
          >
            Your Dilemma
          </span>
          <p 
            className="font-bold leading-snug break-words w-full overflow-hidden text-ellipsis"
            style={{ 
              fontSize: `clamp(12px, ${layout.centerSize * 0.08}px, ${layout.centerFontSize}px)`,
              color: 'var(--text-primary)',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              maxHeight: `${layout.centerSize * 0.5}px`,
              paddingLeft: '0.5rem',
              paddingRight: '0.5rem',
            }}
          >
            {dilemmaSummary || "Waiting for input..."}
          </p>
          {contextSummary && !isLandscape && layout.centerSize > 180 && (
            <span 
              className="mt-1 italic leading-tight px-3 break-words flex-shrink-0 overflow-hidden text-ellipsis"
              style={{ 
                fontSize: `${Math.max(10, layout.centerLabelSize - 2)}px`, 
                color: 'var(--text-muted)',
                maxHeight: `${layout.centerSize * 0.15}px`,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {contextSummary}
            </span>
          )}
        </button>
      </div>

      {/* Counselors - Dynamic container-aware sizing with pixel positioning */}
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

        // Use calculated layout values - offset is exactly half of node size for proper centering
        const nodeSizePx = layout.nodeSize;
        const nodeOffset = nodeSizePx / 2;
        
        // Center of container in pixels
        const centerX = layout.width / 2;
        const centerY = layout.height / 2;

        // Wrapper styles for positioning - use pixel values
        let wrapperClass = `absolute z-[100] transition-all duration-300 flex items-center justify-center`;
        let wrapperStyle: React.CSSProperties = {
          width: `${nodeSizePx}px`,
          height: `${nodeSizePx}px`,
        };

        // Button styles for appearance
        let buttonClass = `w-full h-full rounded-full backdrop-blur-md border flex flex-col items-center justify-center transition-transform duration-300 ${colors.border} ${colors.text}`;
        let buttonStyle: React.CSSProperties = { 
          ['--glow-color' as string]: colors.glow,
          backgroundColor: 'var(--bg-glass)',
          padding: isMobile ? '0.25rem' : '0.5rem',
        };

        if (isRefining) {
          // STATE 1: REFINING - collapse to center
          wrapperClass += ' pointer-events-none opacity-0 scale-50'; 
          wrapperStyle.top = `${centerY - nodeOffset}px`;
          wrapperStyle.left = `${centerX - nodeOffset}px`;
        } else if (isInitialRender) {
          // STATE 2: ENTERING - animate from center
          wrapperClass += ' animate-slide-from-center';
          wrapperStyle.top = `${pos.y - nodeOffset}px`;
          wrapperStyle.left = `${pos.x - nodeOffset}px`;
        } else {
          // STATE 3: STABLE - normal position using pixel coordinates
          buttonClass += ' animate-pulse-glow hover:scale-110 active:scale-95';
          wrapperStyle.top = `${pos.y - nodeOffset}px`;
          wrapperStyle.left = `${pos.x - nodeOffset}px`;
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
              <span 
                className="material-symbols-outlined mb-0.5"
                style={{ fontSize: `${layout.nodeIconSize}px` }}
              >
                {counselor.icon}
              </span>
              <span 
                className="font-medium text-center leading-tight"
                style={{ fontSize: `${layout.nodeFontSize}px`, color: 'var(--text-secondary)' }}
              >
                {counselor.name.replace(/^The /, '')}
              </span>
            </button>
          </div>
        );
      })}

    </div>
  );
};

export default ReflectionSphere;
