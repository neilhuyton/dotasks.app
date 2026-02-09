// __tests__/setup.ts
import { beforeAll, afterAll, afterEach, vi } from 'vitest'
import { server } from '../__mocks__/server';
import '@testing-library/jest-dom'
import fetch, { Request } from 'node-fetch';

// Optional: Suppress Recharts / other library warnings in tests
vi.spyOn(console, 'warn').mockImplementation(() => {})
vi.spyOn(console, 'error').mockImplementation(() => {})

// MSW server lifecycle – applies to ALL tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

// Global mocks that appear in almost every component test
vi.mock('lucide-react', () => ({
  Trash2: () => <div data-testid="trash-icon" />,
  Loader2: () => <div data-testid="loading-spinner" />,
  ChevronDownIcon: () => <div data-testid="chevron-down-icon" />,
  ChevronUpIcon: () => <div data-testid="chevron-up-icon" />,
  CheckIcon: () => <div data-testid="check-icon" />,
  ScaleIcon: () => <div data-testid="scale-icon" />,
  HomeIcon: () => <div data-testid="home-icon" />,
  LineChartIcon: () => <div data-testid="line-chart-icon" />,
  TargetIcon: () => <div data-testid="target-icon" />,
  // Add any other frequently used icons here
}))

// If you ever add custom jest matchers or other global extensions, put them here


// Polyfill fetch and Request globals
Object.defineProperty(global, 'fetch', {
  writable: true,
  value: fetch,
});

Object.defineProperty(global, 'Request', {
  writable: false,
  value: Request,
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => (store[key] = value),
    removeItem: (key: string) => delete store[key],
    clear: () => (store = {}),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock sessionStorage (optional, include if used in your app)
Object.defineProperty(window, 'sessionStorage', { value: localStorageMock });

// Mock matchMedia
const matchMediaMock = (matchesDark: boolean) =>
  ({
    matches: matchesDark,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  } as MediaQueryList);

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi
    .fn()
    .mockImplementation((query: string) =>
      matchMediaMock(query === '(prefers-color-scheme: dark)')
    ),
});

// Polyfill PointerEvent for jsdom to support @radix-ui/react-select
if (typeof window !== 'undefined') {
  window.PointerEvent = class PointerEvent extends Event {
    public pointerId: number;
    public clientX: number;
    public clientY: number;
    public isPrimary: boolean;
    public pointerType: string;
    public button: number;
    public buttons: number;

    constructor(type: string, init?: PointerEventInit) {
      super(type, init);
      this.pointerId = init?.pointerId ?? 0;
      this.clientX = init?.clientX ?? 0;
      this.clientY = init?.clientY ?? 0;
      this.isPrimary = init?.isPrimary ?? true;
      this.pointerType = init?.pointerType ?? 'mouse';
      this.button = init?.button ?? 0;
      this.buttons = init?.buttons ?? 0;
    }
  } as unknown as typeof PointerEvent;

  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }

  // Polyfill scrollIntoView for jsdom
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
}