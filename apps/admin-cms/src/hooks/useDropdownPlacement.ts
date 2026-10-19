import { useState, useLayoutEffect, useCallback, useRef, RefObject } from 'react';

export interface DropdownPlacementOptions {
  estimatedHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  margin?: number;
  dependencies?: any[];
}

export interface DropdownPlacementResult {
  openUpward: boolean;
  maxHeight: number;
  updatePosition: () => void;
}

/**
 * Finds the nearest scrollable ancestor element.
 */
export function getScrollParent(node: HTMLElement | null): HTMLElement | null {
  let parent = node?.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const { overflowY } = window.getComputedStyle(parent);
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

/**
 * Calculates available vertical space above and below an element,
 * considering both the viewport boundaries and any scrollable parent container.
 */
export function calculateAvailableSpaces(element: HTMLElement): { spaceBelow: number; spaceAbove: number } {
  if (typeof window === 'undefined') {
    return { spaceBelow: 500, spaceAbove: 500 };
  }

  const rect = element.getBoundingClientRect();

  let spaceBelow = window.innerHeight - rect.bottom;
  let spaceAbove = rect.top;

  const scrollParent = getScrollParent(element);
  if (scrollParent) {
    const parentRect = scrollParent.getBoundingClientRect();
    const parentSpaceBelow = parentRect.bottom - rect.bottom;
    const parentSpaceAbove = rect.top - parentRect.top;

    spaceBelow = Math.min(spaceBelow, parentSpaceBelow);
    spaceAbove = Math.min(spaceAbove, parentSpaceAbove);
  }

  return { spaceBelow, spaceAbove };
}

/**
 * Hook to dynamically calculate whether a dropdown should open upwards or downwards,
 * and calculate maximum height to avoid overflowing parent containers or viewport.
 */
export function useDropdownPlacement(
  triggerRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  options: DropdownPlacementOptions = {}
): DropdownPlacementResult {
  const {
    estimatedHeight = 220,
    minHeight = 120,
    maxHeight: configuredMaxHeight = 220,
    margin = 12,
    dependencies = [],
  } = options;

  const [openUpward, setOpenUpward] = useState(false);
  const [maxHeight, setMaxHeight] = useState(configuredMaxHeight);

  const openUpwardRef = useRef(false);
  const maxHeightRef = useRef(configuredMaxHeight);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const { spaceBelow, spaceAbove } = calculateAvailableSpaces(triggerRef.current);
    const shouldOpenUpward = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    if (shouldOpenUpward !== openUpwardRef.current) {
      openUpwardRef.current = shouldOpenUpward;
      setOpenUpward(shouldOpenUpward);
    }

    const availableSpace = shouldOpenUpward ? spaceAbove : spaceBelow;
    const computedMaxHeight = Math.max(
      minHeight,
      Math.min(configuredMaxHeight, Math.floor(availableSpace - margin))
    );

    if (Math.abs(computedMaxHeight - maxHeightRef.current) > 4) {
      maxHeightRef.current = computedMaxHeight;
      setMaxHeight(computedMaxHeight);
    }
  }, [triggerRef, estimatedHeight, minHeight, configuredMaxHeight, margin]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    updatePosition();

    // Capture: true ensures scroll events from any ancestor scroll container are caught
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition, ...dependencies]);

  return { openUpward, maxHeight, updatePosition };
}
