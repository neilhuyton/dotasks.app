// __tests__/setupTests.ts

import { vi, beforeAll, afterEach, afterAll } from "vitest";
import { server } from "../__mocks__/server";
import fetch, { Request } from "node-fetch";
import "@testing-library/jest-dom";
import { http, HttpResponse, ws } from "msw";

// ──────────────────────────────────────────────
// Mock ResizeObserver (important for components using useResizeObserver / ResizeObserver)
// ──────────────────────────────────────────────

class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.ResizeObserver = MockResizeObserver as any;

// ──────────────────────────────────────────────
// Polyfills & globals
// ──────────────────────────────────────────────

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Polyfill fetch / Request for Node environment
Object.defineProperty(global, "fetch", {
  writable: true,
  value: fetch,
});

Object.defineProperty(global, "Request", {
  writable: false,
  value: Request,
});

// Mock localStorage & sessionStorage
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => (store[key] = value),
    removeItem: (key: string) => delete store[key],
    clear: () => (store = {}),
  };
})();

Object.defineProperty(window, "localStorage", { value: storageMock });
Object.defineProperty(window, "sessionStorage", { value: storageMock });

// Mock matchMedia (useful for theme / responsive tests)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query === "(prefers-color-scheme: dark)",
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  })),
});

// Optional: Polyfill PointerEvent if your app or libs rely on it heavily
// Uncomment only if you see PointerEvent-related test failures
/*
if (typeof window !== "undefined" && !window.PointerEvent) {
  class PointerEventPolyfill extends Event {
    pointerId = 1;
    width = 1;
    height = 1;
    pressure = 0.5;
    tiltX = 0;
    tiltY = 0;
    pointerType = "mouse";
    isPrimary = true;

    constructor(type: string, eventInitDict?: PointerEventInit) {
      super(type, eventInitDict);
      Object.assign(this, eventInitDict);
    }
  }
  window.PointerEvent = PointerEventPolyfill as any;
}
*/

// ──────────────────────────────────────────────
// MSW Setup – Supabase Realtime bypass + strict HTTP handling
// ──────────────────────────────────────────────

beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'bypass',
  });

  // Intercept the Supabase realtime WS handshake (HTTP GET upgrade)
  server.use(
    http.get('https://*.supabase.co/realtime/v1/websocket', () => {
      // Return a 101 Switching Protocols response to "accept" the upgrade
      // MSW will not warn about unhandled, and Supabase client proceeds but sees no messages
      return new HttpResponse(null, {
        status: 101,
        statusText: 'Switching Protocols',
        headers: {
          Upgrade: 'websocket',
          Connection: 'Upgrade',
          // Fake Sec-WebSocket-Accept (required for handshake)
          'Sec-WebSocket-Accept': 's3pPLMBiTxaQ9kYGzzhZRbK+xOo=',
        },
      });
    }),
  );
});

afterEach(() => server.resetHandlers());
afterAll(() => server.close());
