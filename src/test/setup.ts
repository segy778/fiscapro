import '@testing-library/jest-dom';

// jsdom ne fournit pas ResizeObserver, utilisé par Recharts (graphiques).
// On le polyfille avec un stub no-op pour que les composants se rendent en test.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
