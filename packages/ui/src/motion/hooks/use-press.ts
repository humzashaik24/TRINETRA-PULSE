'use client';

import { useCallback, useState } from 'react';

interface PressState {
  isPressed: boolean;
}

/**
 * Tracks press (active) state on an element.
 * Returns handlers to spread on the target element.
 *
 * @example
 * const { isPressed, ...pressHandlers } = usePress();
 * <button {...pressHandlers} className={isPressed ? 'scale-95' : ''}>
 *   Click me
 * </button>
 */
export function usePress(onPress?: (pressed: boolean) => void): PressState & {
  onMouseDown: () => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onTouchStart: () => void;
  onTouchEnd: () => void;
} {
  const [isPressed, setIsPressed] = useState(false);

  const handleDown = useCallback(() => {
    setIsPressed(true);
    onPress?.(true);
  }, [onPress]);

  const handleUp = useCallback(() => {
    setIsPressed(false);
    onPress?.(false);
  }, [onPress]);

  return {
    isPressed,
    onMouseDown: handleDown,
    onMouseUp: handleUp,
    onMouseLeave: handleUp,
    onTouchStart: handleDown,
    onTouchEnd: handleUp,
  };
}
