import '@testing-library/jest-dom';

// jsdom polyfills ----------------------------------------------------------

if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Reset localStorage between tests.
beforeEach(() => {
  try {
    window.localStorage.clear();
  } catch {
    /* noop */
  }
});