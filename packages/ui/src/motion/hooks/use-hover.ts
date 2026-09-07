'use client';

import { useCallback, useRef, useState } from 'react';

interface HoverState {
  isHovered: boolean;
}

/**
 * Tracks hover state on an element.
 * Returns handlers to spread on the target element and the current state.
 *
 * @example
 * const { isHovered, ...hoverHandlers } = useHover();
 * <div {...hoverHandlers}>{isHovered && <Tooltip />}</div>
 */
export function useHover(onHover?: (hovering: boolean) => void): HoverState & {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
} {
  const [isHovered, setIsHovered] = useState(false);

  const handleEnter = useCallback(() => {
    setIsHovered(true);
    onHover?.(true);
  }, [onHover]);

  const handleLeave = useCallback(() => {
    setIsHovered(false);
    onHover?.(false);
  }, [onHover]);

  return {
    isHovered,
    onMouseEnter: handleEnter,
    onMouseLeave: handleLeave,
    onFocus: handleEnter,
    onBlur: handleLeave,
  };
}
