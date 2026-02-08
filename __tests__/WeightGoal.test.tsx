// __tests__/WeightGoal.test.tsx
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "../src/trpc";
import { server } from "../__mocks__/server";
import "@testing-library/jest-dom";
import { act } from "react";

import WeightGoal from "../src/components/WeightGoal";
import {
  weightGetCurrentGoalHandler,
  weightSetGoalHandler,
  weightUpdateGoalHandler,
} from "../__mocks__/handlers";
import { useAuthStore } from "../src/store/authStore";
import { generateToken } from "./utils/token";

// Mock GoalList component
vi.mock("../src/components/GoalList", () => ({
  default: () => <div data-testid="goal-list">Mocked GoalList</div>,
}));

describe("WeightGoal Component", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const trpcClient = trpc.createClient({
    links: [
      httpBatchLink({
        url: "/trpc",
        fetch: async (url, options) => {
          const headers = {
            "content-type": "application/json",
            ...(useAuthStore.getState().token
              ? { Authorization: `Bearer ${useAuthStore.getState().token}` }
              : {}),
          };
          const body =
            options?.body ||
            JSON.stringify([
              { id: 0, method: "query", path: "weight.getCurrentGoal" },
            ]);
          const response = await fetch(url, {
            ...options,
            headers,
            method: "POST",
            body,
          });
          return response;
        },
      }),
    ],
  });

  const setup = async (userId = "test-user-id") => {
    useAuthStore.setState({
      isLoggedIn: true,
      userId,
      token: generateToken(userId),
      refreshToken: "valid-refresh-token",
      login: vi.fn(),
      logout: vi.fn(),
    });

    await act(async () => {
      render(
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <WeightGoal />
          </QueryClientProvider>
        </trpc.Provider>,
      );
    });
  };

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "warn" });
  });

  beforeEach(() => {
    server.use(
      weightGetCurrentGoalHandler,
      weightSetGoalHandler,
      weightUpdateGoalHandler,
    );
  });

  afterEach(() => {
    server.resetHandlers();
    queryClient.clear();
    vi.clearAllMocks();
    document.body.innerHTML = "";
    useAuthStore.setState({
      isLoggedIn: false,
      userId: null,
      token: null,
      refreshToken: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
  });

  afterAll(() => {
    server.close();
  });

  it("renders WeightGoal with correct content", async () => {
    await setup();

    await waitFor(
      () => {
        expect(
          screen.queryByTestId("weight-goal-loading"),
        ).not.toBeInTheDocument();
        expect(
          screen.getByRole("heading", { name: "Your Goals" }),
        ).toBeInTheDocument();
        expect(screen.getByText(/Current Goal.*65 kg/i)).toBeInTheDocument();
        expect(screen.getByTestId("goal-weight-input")).toBeInTheDocument();
        expect(screen.getByTestId("submit-button")).toBeInTheDocument();
        expect(screen.getByTestId("goal-list")).toBeInTheDocument();
        expect(screen.queryByTestId("error-message")).not.toBeInTheDocument();
      },
      { timeout: 500 },
    );
  });

  it("allows user to update a weight goal when logged in", async () => {
    await setup();

    await waitFor(
      () => {
        expect(
          screen.queryByTestId("weight-goal-loading"),
        ).not.toBeInTheDocument();
        expect(screen.getByText(/Current Goal.*65 kg/i)).toBeInTheDocument();
        expect(screen.getByTestId("goal-weight-input")).toBeInTheDocument();
        expect(screen.getByTestId("submit-button")).toBeInTheDocument();
      },
      { timeout: 500 },
    );

    await act(async () => {
      const input = screen.getByTestId("goal-weight-input");
      const form = input.closest("form")!;
      fireEvent.change(input, { target: { value: "60" } });
      expect(input).toHaveValue(60); // FIXED: number 60 for type="number" input

      await form.dispatchEvent(new Event("submit", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(
      () => {
        expect(screen.getByTestId("goal-message")).toHaveTextContent(
          "Goal updated successfully!",
        );
      },
      { timeout: 500 },
    );
  });
});
