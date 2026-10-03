import { useRef, useEffect, useState, useCallback } from 'react';

interface UseChatScrollOptions {
  threadId?: string | null;
  dependencyList?: any[];
  threshold?: number;
}

export function useChatScroll({
  threadId,
  dependencyList = [],
  threshold = 120,
}: UseChatScrollOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const isNearBottomRef = useRef(true);

  // Scroll smoothly or instantly to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
      isNearBottomRef.current = true;
      setShowScrollBottom(false);
    }
  }, []);

  // Listen to user scrolling
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distanceToBottom <= threshold;
    isNearBottomRef.current = nearBottom;
    setShowScrollBottom(!nearBottom);
  }, [threshold]);

  // When active thread changes, instantly jump to bottom
  useEffect(() => {
    if (!threadId) return;
    isNearBottomRef.current = true;
    setShowScrollBottom(false);
    // Request animation frame to ensure DOM elements have measured
    const rafId = requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [threadId]);

  // When messages or pending status updates, scroll if user was already near bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      const timer = setTimeout(() => {
        scrollToBottom(true);
      }, 50);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencyList);

  return {
    containerRef,
    showScrollBottom,
    scrollToBottom,
    handleScroll,
  };
}
