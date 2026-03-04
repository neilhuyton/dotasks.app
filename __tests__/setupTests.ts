// __tests__/setupTests.ts

import { vi, beforeAll, afterEach, afterAll } from "vitest";
import { server } from "../__mocks__/server";
import fetch, { Request } from "node-fetch";
import "@testing-library/jest-dom";
import { http, HttpResponse } from "msw";

// Mock ResizeObserver
class MockResizeObserver implements ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.ResizeObserver = MockResizeObserver;

// Polyfills & globals
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

Object.defineProperty(global, "fetch", {
  writable: true,
  value: fetch,
});

Object.defineProperty(global, "Request", {
  writable: false,
  value: Request,
});

// Mock storage
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

// Mock matchMedia
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

// Mock Supabase – authenticated by default for all tests
vi.mock("@/lib/supabase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase")>();

  const mockUser = {
    id: "test-user-123",
    email: "testuser@example.com",
    role: "authenticated",
    aud: "authenticated",
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: new Date().toISOString(),
  };

  const mockSession = {
    access_token: "mock-jwt-access-token-for-tests-" + Date.now(),
    refresh_token: "mock-refresh-token",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: mockUser,
  };

  const mockAuth = {
    getSession: vi.fn().mockResolvedValue({
      data: { session: mockSession },
      error: null,
    }),
    getUser: vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    }),
    onAuthStateChange: vi.fn().mockImplementation((callback) => {
      queueMicrotask(() => callback("SIGNED_IN", mockSession));
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    }),
    signUp: vi.fn().mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    }),
    resetPasswordForEmail: vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return { data: {}, error: null };
    }),
  };

  return {
    ...actual,
    supabase: {
      ...actual.supabase,
      auth: mockAuth,
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
        unsubscribe: vi.fn(),
      })),
      removeChannel: vi.fn().mockReturnValue(Promise.resolve()),
      removeAllChannels: vi.fn().mockReturnValue(Promise.resolve()),
      realtime: {
        setAuth: vi.fn(),
      },
    },
  };
});

// Mock @supabase/ssr if used
vi.mock("@supabase/ssr", () => {
  const mockUser = { id: "test-user-123", email: "testuser@example.com", role: "authenticated" };
  const mockSession = {
    access_token: "mock-jwt-access-token-for-tests",
    refresh_token: "mock-refresh",
    expires_in: 3600,
    user: mockUser,
  };

  return {
    createBrowserClient: vi.fn(() => ({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        onAuthStateChange: vi.fn((cb) => {
          queueMicrotask(() => cb("SIGNED_IN", mockSession));
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }),
      },
    })),
  };
});

// MSW Setup
beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });

  server.use(
    http.get("https://*.supabase.co/realtime/v1/websocket", () => {
      return new HttpResponse(null, {
        status: 101,
        statusText: "Switching Protocols",
        headers: {
          Upgrade: "websocket",
          Connection: "Upgrade",
          "Sec-WebSocket-Accept": "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=",
        },
      });
    }),
  );
});

afterEach(() => server.resetHandlers());
afterAll(() => server.close());