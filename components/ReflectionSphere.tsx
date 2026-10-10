import React from 'react';
import { Counselor, TensionPair, CouncilResponse, ReflectionFocus } from '../types';
import { REFLECTION_FOCUS_OPTIONS } from '../constants';
import { useContainerSize, calculateLayoutValues } from '../hooks/useContainerSize';
import { groupColor } from '../utils/groupColor';

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

const tensionColor = (type: TensionPair['type']) => type === 'conflict' ? 'var(--seal)' : 'var(--brass)';

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
  
  // Animation Phase State Management
  // hidden: everything invisible (start of refinement/summon)
  // center-fade-in: center node fading in (0 -> 100 opacity)
  // spheres-expand: counselors moving from center to orbit
  // stable: animation complete, normal interaction
  // spheres-collapse: counselors moving from orbit to center (refining)
  // center-pulse: center node visible but pulsing with loading text (refining)
  const [animationPhase, setAnimationPhase] = React.useState<'hidden' | 'center-fade-in' | 'spheres-expand' | 'stable' | 'spheres-collapse' | 'center-pulse'>(
    isInitialRender ? 'hidden' : 'stable'
  );

  // Use container-aware sizing hook
  const [containerRef, containerSize] = useContainerSize<HTMLDivElement>();
  const layout = calculateLayoutValues(containerSize);
  
  // Derived flags for convenience
  const { isConstrained, isLandscape, isMobile, isTablet } = containerSize;

  // Orchestrate the animation sequence when isInitialRender changes
  React.useEffect(() => {
    if (isInitialRender) {
      // Start hidden
      setAnimationPhase('hidden');
      
      // Phase 1: Center Fade In (Starts almost immediately)
      const t1 = setTimeout(() => {
        setAnimationPhase('center-fade-in');
      }, 100);
      
      // Phase 2: Spheres Expand (Starts after center is fully visible - 2000ms fade)
      const t2 = setTimeout(() => {
        setAnimationPhase('spheres-expand');
      }, 2100);
      
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else if (isRefining) {
      // REFINEMENT EXIT SEQUENCE
      
      // Phase 1: Spheres Collapse (Starts immediately)
      setAnimationPhase('spheres-collapse');

      // Calculate total time for all spheres to collapse
      // (N-1 * interval) + duration
      const collapseTime = ((counselors.length - 1) * 1000) + 1500;

      // Phase 2: Center Pulse (Starts after spheres are gone)
      // Instead of fading out, we switch to "Council in Discussion"
      const t1 = setTimeout(() => {
        setAnimationPhase('center-pulse');
      }, collapseTime);

      return () => {
        clearTimeout(t1);
      };
    } else {
      // Ensure we settle in stable state when not rendering/animating
      // Only reset to stable if we are NOT in the middle of an initial render
      if (!isInitialRender) {
         setAnimationPhase('stable');
      }
    }
  }, [isInitialRender, isRefining, counselors.length]);

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
    const centerY = layout.centerY;     // Pixel center Y (adjusted for bottom bar)
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
  const svgCenterY = (layout.centerY / layout.height) * 1000; // Adjusted center for bottom bar

  return (
    <div 
      ref={containerRef}
      className="sphere-container relative w-full h-full flex items-center justify-center"
      style={{ maxWidth: '100%', maxHeight: '100%' }}
    >

      {/* Floating Orb Focus Indicator - hidden on landscape, moves left when debate panel visible */}
      {currentFocusOption && !isLandscape && (
        <div 
          className={`absolute z-20 flex items-center gap-2 px-3 py-2 border ${isMobile ? 'scale-90' : ''}`}
          style={{
            top: '1rem',
            // Move to left side when debate mode is on and we're not constrained (legend is showing on right)
            right: (isDebateMode && !isConstrained) ? 'auto' : '1rem',
            left: (isDebateMode && !isConstrained) ? '1rem' : 'auto',
            backgroundColor: 'var(--paper)',
            borderColor: 'var(--rule)'
          }}
        >
          <span className="material-symbols-outlined text-lg" style={{ color: 'var(--ink2)' }}>visibility</span>
          <div className="flex flex-col">
            <span className="label !text-[var(--ink)]">
              {currentFocusOption.label.split(' ')[0]} Lens
            </span>
            {!isMobile && (
              <span className="text-[12px] italic leading-none mt-0.5" style={{ color: 'var(--ink2)' }}>
                {currentFocusOption.label.split(' ').slice(1).join(' ') || 'Perspective'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Debate Tension Lines Layer with Numbered Markers */}
      {isDebateMode && !isRefining && (
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
                    stroke={tensionColor(pair.type)}
                    strokeWidth={isHovered ? 3 : 1.8}
                    strokeDasharray={isConflict ? undefined : "5 5"}
                    vectorEffect="non-scaling-stroke"
                    className="transition-all duration-300"
                  />
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
            const centerY = layout.centerY;
            
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
                    font-display text-lg font-semibold
                    transition-all duration-200
                    ${isHovered ? 'scale-125' : 'scale-100'}
                  `}
                  style={{
                    backgroundColor: tensionColor(pair.type),
                    color: 'var(--on-seal)',
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
              className="absolute top-4 right-4 w-80 max-w-[35%] p-4 z-30 animate-fade-in"
              style={{
                backgroundColor: 'var(--paper)',
                border: '1px solid var(--rule)'
              }}
            >
            <div className="flex items-center gap-2 mb-4 pb-3 border-b" style={{ borderColor: 'var(--rule)' }}>
              <h3 className="label">
                Tensions
              </h3>
              {/* Legend Key */}
              <div className="ml-auto flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 border-t-2" style={{ borderColor: 'var(--seal)' }}></span>
                  <span style={{ color: 'var(--ink2)' }}>Conflict</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-5 border-t-2 border-dashed" style={{ borderColor: 'var(--brass)' }}></span>
                  <span style={{ color: 'var(--ink2)' }}>Synthesis</span>
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
                      p-3 cursor-pointer transition-all duration-200
                    `}
                    style={{
                      backgroundColor: isHovered ? 'var(--paper2)' : 'transparent',
                      border: `1px solid ${isHovered ? tensionColor(pair.type) : 'transparent'}`,
                    }}
                    onClick={() => onTensionClick(pair)}
                    onMouseEnter={() => setHoveredTensionIdx(idx)}
                    onMouseLeave={() => setHoveredTensionIdx(null)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Numbered Badge */}
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center font-display text-sm font-semibold flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: tensionColor(pair.type), color: 'var(--on-seal)' }}
                      >
                        {idx + 1}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {/* Counselor Names */}
                        <div className="flex items-center gap-2 font-display text-lg font-semibold leading-tight mb-1">
                          <span style={{ color: 'var(--ink)' }}>{c1.name}</span>
                          <span style={{ color: tensionColor(pair.type) }}>↔</span>
                          <span style={{ color: 'var(--ink)' }}>{c2.name}</span>
                        </div>
                        
                        {/* Core Issue */}
                        <p
                          className="text-[13px] italic leading-snug"
                          style={{ color: 'var(--ink2)' }}
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
              className="fixed bottom-24 right-4 z-40 w-12 h-12 rounded-full flex items-center justify-center transition-all"
              style={{
                backgroundColor: 'var(--paper)',
                border: '1px solid var(--rule)'
              }}
            >
              <span className="material-symbols-outlined" style={{ color: 'var(--ink)' }}>
                {isTensionDrawerOpen ? 'close' : 'electric_bolt'}
              </span>
              {/* Badge showing tension count */}
              {!isTensionDrawerOpen && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[11px] font-label font-semibold flex items-center justify-center" style={{ backgroundColor: 'var(--seal)', color: 'var(--on-seal)' }}>
                  {activeTensions.length}
                </span>
              )}
            </button>
          )}

          {/* Constrained: Bottom Drawer */}
          {isConstrained && (
            <div 
              className={`fixed bottom-0 left-0 right-0 z-30 transition-transform duration-300 ${
                isTensionDrawerOpen ? 'translate-y-0' : 'translate-y-full'
              }`}
              style={{
                backgroundColor: 'var(--paper)',
                border: '1px solid var(--rule)',
                borderBottom: 'none',
                maxHeight: isLandscape ? '70vh' : '50vh'
              }}
            >
            {/* Drawer Handle */}
            <div className="flex justify-center py-2">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--rule)' }}></div>
            </div>
            
            {/* Drawer Header */}
            <div className="flex items-center gap-2 px-4 pb-3 border-b" style={{ borderColor: 'var(--rule)' }}>
              <h3 className="label">
                Tensions
              </h3>
              <div className="ml-auto flex items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1">
                  <span className="w-4 border-t-2" style={{ borderColor: 'var(--seal)' }}></span>
                  <span style={{ color: 'var(--ink2)' }}>Conflict</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-4 border-t-2 border-dashed" style={{ borderColor: 'var(--brass)' }}></span>
                  <span style={{ color: 'var(--ink2)' }}>Synthesis</span>
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
                      className="p-3 cursor-pointer active:scale-[0.98] transition-all"
                      style={{
                        backgroundColor: 'var(--paper2)',
                        border: `1px solid ${tensionColor(pair.type)}`,
                      }}
                      onClick={() => {
                        onTensionClick(pair);
                        setIsTensionDrawerOpen(false);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center font-display text-sm font-semibold flex-shrink-0"
                          style={{ backgroundColor: tensionColor(pair.type), color: 'var(--on-seal)' }}
                        >
                          {idx + 1}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 font-display text-lg font-semibold leading-tight mb-1">
                            <span style={{ color: 'var(--ink)' }}>{c1.name}</span>
                            <span style={{ color: tensionColor(pair.type) }}>↔</span>
                            <span style={{ color: 'var(--ink)' }}>{c2.name}</span>
                          </div>
                          <p className="text-[13px] italic leading-snug" style={{ color: 'var(--ink2)' }}>
                            {coreIssue}
                          </p>
                        </div>
                        
                        <span className="material-symbols-outlined text-lg" style={{ color: 'var(--ink2)' }}>
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
              className="fixed inset-0 z-20 bg-[var(--veil)]"
              onClick={() => setIsTensionDrawerOpen(false)}
            />
          )}
        </>
      )}

      {/* Center Dilemma Node - Dynamic container-aware sizing */}
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 transition-all duration-[2000ms] ${
          animationPhase === 'hidden' ? 'opacity-0' : 'opacity-100'
        } ${
          animationPhase === 'center-pulse' ? 'animate-pulse' : ''
        }`}
      >
        <button
          onClick={onCenterClick}
          className="rounded-full border flex flex-col items-center justify-center text-center group transition-all duration-500 cursor-pointer overflow-hidden"
          style={{
            width: `${layout.centerSize}px`,
            height: `${layout.centerSize}px`,
            padding: isMobile ? '0.75rem' : '1rem',
            backgroundColor: 'var(--paper)',
            borderColor: 'var(--ink)'
          }}
        >
          <span 
            className="font-label font-semibold uppercase tracking-[0.14em] mb-1 group-hover:!text-[var(--seal)] transition-colors flex-shrink-0"
            style={{ fontSize: `${layout.centerLabelSize}px`, color: 'var(--ink2)' }}
          >
            {animationPhase === 'center-pulse' ? 'Status' : 'Your Dilemma'}
          </span>
          <p 
            className="font-display italic leading-snug break-words w-full overflow-hidden text-ellipsis transition-opacity duration-500"
            style={{ 
              fontSize: `clamp(12px, ${layout.centerSize * 0.08}px, ${layout.centerFontSize}px)`,
              color: 'var(--ink)',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              maxHeight: `${layout.centerSize * 0.5}px`,
              paddingLeft: '0.5rem',
              paddingRight: '0.5rem',
            }}
          >
            {animationPhase === 'center-pulse' ? "Council in Discussion..." : (dilemmaSummary || "Waiting for input...")}
          </p>
          
          {/* Subtitle: Context Summary */}
          {contextSummary && animationPhase !== 'center-pulse' && (
            <span 
              className="mt-2 italic leading-tight px-3 break-words flex-shrink-0 overflow-hidden text-ellipsis opacity-80"
              style={{ 
                fontSize: `${Math.max(10, layout.centerLabelSize - 1)}px`, 
                color: 'var(--ink)',
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
        const accent = groupColor(counselor.role);

        // Use calculated layout values - offset is exactly half of node size for proper centering
        const nodeSizePx = layout.nodeSize;
        const nodeOffset = nodeSizePx / 2;
        
        // Center of container in pixels
        const centerX = layout.width / 2;
        const centerY = layout.centerY;

        // Wrapper styles for positioning - use pixel values
        let wrapperClass = `absolute z-[100] transition-all flex items-center justify-center`;
        let wrapperStyle: React.CSSProperties = {
          width: `${nodeSizePx}px`,
          height: `${nodeSizePx}px`,
        };

        // Determine visual state based on animation phase
        const isHidden = animationPhase === 'hidden';
        const isCenterFadeIn = animationPhase === 'center-fade-in';
        const isCenterFadeOut = animationPhase === 'center-fade-out';
        const isSpheresExpand = animationPhase === 'spheres-expand';
        const isSpheresCollapse = animationPhase === 'spheres-collapse';
        const isStable = animationPhase === 'stable';

        // Position Logic
        if (isHidden || isCenterFadeIn || animationPhase === 'center-pulse') {
          // Centered and hidden
          wrapperStyle.top = `${centerY - nodeOffset}px`;
          wrapperStyle.left = `${centerX - nodeOffset}px`;
          wrapperStyle.opacity = 0;
          wrapperStyle.transform = 'scale(0.5)';
          wrapperStyle.pointerEvents = 'none';
        } else if (isSpheresExpand) {
          // Moving to orbit (Entrance)
          wrapperStyle.top = `${pos.y - nodeOffset}px`;
          wrapperStyle.left = `${pos.x - nodeOffset}px`;
          wrapperStyle.opacity = 1;
          wrapperStyle.transform = 'scale(1)';
          // Staggered transition for expansion - sequential (one finishes, next starts)
          wrapperStyle.transition = `all 1500ms ease-out`;
          wrapperStyle.transitionDelay = `${idx * 1000}ms`; 
        } else if (isSpheresCollapse) {
          // Moving to center (Exit)
          wrapperStyle.top = `${centerY - nodeOffset}px`;
          wrapperStyle.left = `${centerX - nodeOffset}px`;
          wrapperStyle.opacity = 0;
          wrapperStyle.transform = 'scale(0.5)';
          // Mirror of entrance: same speed, same stagger interval
          wrapperStyle.transition = `all 1500ms ease-in`;
          wrapperStyle.transitionDelay = `${idx * 1000}ms`;
        } else if (isStable) {
          // Stable in orbit (no delay, ready for hover)
          wrapperStyle.top = `${pos.y - nodeOffset}px`;
          wrapperStyle.left = `${pos.x - nodeOffset}px`;
          wrapperStyle.opacity = 1;
          wrapperStyle.transform = 'scale(1)';
          wrapperStyle.transition = 'transform 300ms ease'; // Only animate transform on hover
        }

        // Button styles for appearance
        let buttonClass = `w-full h-full rounded-full border-[1.6px] flex flex-col items-center justify-center transition-transform duration-300`;
        let buttonStyle: React.CSSProperties = {
          borderColor: accent,
          color: accent,
          backgroundColor: 'var(--paper2)',
          padding: isMobile ? '0.25rem' : '0.5rem',
        };

        if (isStable) {
           buttonClass += ' hover:scale-105 active:scale-95';
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
                className="font-display font-semibold text-center leading-tight"
                style={{ fontSize: `${layout.nodeFontSize + 3}px`, color: 'var(--ink)' }}
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