import { useEffect, useRef } from 'react';

// Calls onEscape when Escape is pressed anywhere on the page, for as long as the caller is mounted.
// Holds the latest handler in a ref, so callers can pass an inline function without re-binding the listener.
export function useEscapeKey(onEscape: () => void) {
  const handlerRef = useRef(onEscape);
  handlerRef.current = onEscape;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handlerRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}
