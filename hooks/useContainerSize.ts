import { useState, useEffect, useRef, RefObject } from 'react';

export interface ContainerSize {
  width: number;
  height: number;
  isConstrained: boolean;  // True when legend should be an overlay
  isLandscape: boolean;
  isMobile: boolean;       // <= 430px
  isTablet: boolean;       // 431px - 1279px
  isDesktop: boolean;      // >= 1280px
}

const CONSTRAINED_WIDTH = 900;
const CONSTRAINED_HEIGHT = 600;
const MOBILE_MAX = 430;
const TABLET_MAX = 1279;
const THROTTLE_MS = 100;

/**
 * Hook that observes container size and returns responsive breakpoint info.
 * Uses ResizeObserver with throttling for performance.
 */
export function useContainerSize<T extends HTMLElement>(): [RefObject<T>, ContainerSize] {
  const containerRef = useRef<T>(null);
  const [size, setSize] = useState<ContainerSize>({
    width: 0,
    height: 0,
    isConstrained: true,
    isLandscape: false,
    isMobile: true,
    isTablet: false,
    isDesktop: false,
  });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    let lastUpdate = 0;
    let pendingFrame: number | null = null;

    const updateSize = (width: number, height: number) => {
      setSize({
        width,
        height,
        isConstrained: width < CONSTRAINED_WIDTH || height < CONSTRAINED_HEIGHT,
        isLandscape: width > height,
        isMobile: width <= MOBILE_MAX,
        isTablet: width > MOBILE_MAX && width <= TABLET_MAX,
        isDesktop: width > TABLET_MAX,
      });
    };

    const handleResize = (entries: ResizeObserverEntry[]) => {
      const now = Date.now();
      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;

      // Throttle updates
      if (now - lastUpdate >= THROTTLE_MS) {
        lastUpdate = now;
        if (pendingFrame) cancelAnimationFrame(pendingFrame);
        pendingFrame = requestAnimationFrame(() => {
          updateSize(width, height);
        });
      }
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(element);

    // Initial size
    const rect = element.getBoundingClientRect();
    updateSize(rect.width, rect.height);

    return () => {
      observer.disconnect();
      if (pendingFrame) cancelAnimationFrame(pendingFrame);
    };
  }, []);

  return [containerRef, size];
}

/**
 * Calculate responsive layout values based on container size.
 * All values in pixels. Uses minDimension to ensure sphere fits in both dimensions.
 */
export function calculateLayoutValues(containerSize: ContainerSize) {
  const { width, height, isMobile, isTablet, isDesktop } = containerSize;
  
  // Use minimum dimension for all calculations to ensure sphere fits
  const minDimension = Math.min(width, height);
  
  // Node size: scales with screen, larger on desktop
  // Mobile: 60-80px, Tablet: 80-100px, Desktop: 100-140px
  const nodeSize = isMobile 
    ? Math.max(60, Math.min(80, minDimension * 0.12))
    : isTablet
      ? Math.max(80, Math.min(100, minDimension * 0.12))
      : Math.max(100, Math.min(140, minDimension * 0.14));
  
  // Center dilemma: larger on desktop for readability
  // Mobile: 140-180px, Tablet: 180-220px, Desktop: 200-280px
  const centerSize = isMobile
    ? Math.max(140, Math.min(180, minDimension * 0.25))
    : isTablet
      ? Math.max(180, Math.min(220, minDimension * 0.26))
      : Math.max(200, Math.min(280, minDimension * 0.30));
  
  // Calculate safe orbit radius in pixels
  // Must clear center + have room for nodes + padding
  const minRadius = (centerSize / 2) + (nodeSize / 2) + 30; // 30px gap from center
  const maxRadius = (minDimension / 2) - (nodeSize / 2) - 24; // 24px edge padding
  
  // Target radius: scales based on screen size
  const targetRadius = minDimension * (isMobile ? 0.34 : isTablet ? 0.36 : 0.38);
  const orbitRadius = Math.max(minRadius, Math.min(maxRadius, targetRadius));

  return {
    nodeSize,
    centerSize,
    orbitRadius,       // In pixels - use this for positioning
    minDimension,      // Export for centering calculations
    width,             // Container width
    height,            // Container height
    // Font sizes - much larger for readability
    nodeFontSize: isMobile ? 11 : isTablet ? 12 : 14,
    centerFontSize: isMobile ? 14 : isTablet ? 18 : 22,
    centerLabelSize: isMobile ? 10 : isTablet ? 11 : 13,
    // Icon sizes - larger for visibility
    nodeIconSize: isMobile ? 22 : isTablet ? 28 : 34,
    centerIconSize: isMobile ? 18 : isTablet ? 22 : 26,
  };
}
