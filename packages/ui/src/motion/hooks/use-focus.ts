'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface FocusState {
  isFocused: boolean;
}

/**
 * Tracks focus state on an element.
 * Returns handlers to spread on the target element.
 *
 * @example
 * const { isFocused, ...focusHandlers } = useFocus();
 * <Input {...focusHandlers} className={isFocused ? 'ring-2 ring-brand' : ''} />
 */
export function useFocus(onFocus?: (focused: boolean) => void): FocusState & {
  onFocus: () => void;
  onBlur: () => void;
} {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus?.(true);
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onFocus?.(false);
  }, [onFocus]);

  return {
    isFocused,
    onFocus: handleFocus,
    onBlur: handleBlur,
  };
}
