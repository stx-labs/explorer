import '@testing-library/jest-dom';
import structuredClone from '@ungap/structured-clone';

global.structuredClone = structuredClone;

// Chakra `useBreakpointValue` / `useMediaQuery` (jsdom has no `matchMedia`)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query) => ({
    matches: true,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }),
});
