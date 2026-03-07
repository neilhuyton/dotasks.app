// __tests__/setupTests.ts

import { vi, beforeAll, afterEach, afterAll } from "vitest";
import { server } from "../__mocks__/server";
import fetch, { Request } from "node-fetch";
import "@testing-library/jest-dom";
import { http, HttpResponse } from "msw";

class MockResizeObserver implements ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.ResizeObserver = MockResizeObserver;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

Object.defineProperty(global, "fetch", { writable: true, value: fetch });
Object.defineProperty(global, "Request", { writable: false, value: Request });

const storageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", { value: storageMock });
Object.defineProperty(window, "sessionStorage", { value: storageMock });

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  })),
});

vi.mock("@/lib/supabase", () => {
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
    access_token: "mock-access-" + Date.now(),
    refresh_token: "mock-refresh",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: mockUser,
  };

  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    unsubscribe: vi.fn(),
  };

  const mockAuth = {
    getSession: vi
      .fn()
      .mockResolvedValue({ data: { session: mockSession }, error: null }),
    getUser: vi
      .fn()
      .mockResolvedValue({ data: { user: mockUser }, error: null }),
    setSession: vi
      .fn()
      .mockResolvedValue({ data: { session: mockSession }, error: null }),
    refreshSession: vi.fn().mockImplementation(async () => ({
      data: { session: mockSession, user: mockUser },
      error: null,
    })),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    }),
    signUp: vi.fn().mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
    onAuthStateChange: vi.fn((callback) => {
      queueMicrotask(() => callback("SIGNED_IN", mockSession));
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),

    updateUser: vi
      .fn()
      .mockResolvedValue({ data: { user: mockUser }, error: null }),
  };

  return {
    supabase: {
      auth: mockAuth,
      realtime: { setAuth: vi.fn() },
      channel: vi.fn().mockReturnValue(mockChannel),
      removeChannel: vi.fn().mockResolvedValue(undefined), // returns Promise
      removeAllChannels: vi.fn().mockResolvedValue(undefined),
    },
  };
});

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
