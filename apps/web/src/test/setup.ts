import '@testing-library/jest-dom';

// jsdom polyfills ----------------------------------------------------------

// jsdom does not implement Blob.text()/File.text(); provide a polyfill backed
// by the internal buffer so uploads of in-memory files can be read in tests.
if (typeof File !== 'undefined' && typeof File.prototype.text !== 'function') {
  Object.defineProperty(File.prototype, 'text', {
    configurable: true,
    value: function text(): Promise<string> {
      const impl = Object.getOwnPropertySymbols(this)
        .map((s) => (this as Record<symbol, unknown>)[s])
        .find((v) => v && typeof v === 'object' && '_buffer' in (v as object)) as
        | { _buffer: Uint8Array }
        | undefined;
      const buf = impl?._buffer;
      return Promise.resolve(buf ? Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength).toString('utf8') : '');
    },
  });
}

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