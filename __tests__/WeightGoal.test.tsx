// __tests__/WeightGoal.test.tsx
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpLink } from "@trpc/client";
import { trpc } from "../src/trpc";
import { server } from "../__mocks__/server";
import "@testing-library/jest-dom";

import WeightGoal from "../src/components/WeightGoal";
import {
  weightGetCurrentGoalHandler,
  weightSetGoalHandler,
  weightUpdateGoalHandler,
  resetMockGoal,
} from "../__mocks__/handlers/weight";
import { useAuthStore } from "../src/store/authStore";
import { generateToken } from "./utils/token";

vi.mock("../src/components/GoalList", () => ({
  default: () => <div data-testid="goal-list">Mocked GoalList</div>,
}));

describe("WeightGoal", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  const trpcClient = trpc.createClient({
    links: [httpLink({ url: "/trpc" })],
  });

  const renderWeightGoal = (userId = "test-user-id") => {
    useAuthStore.setState({
      isLoggedIn: true,
      userId,
      token: generateToken(userId),
    });

    return render(
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <WeightGoal />
        </QueryClientProvider>
      </trpc.Provider>
    );
  };

  beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
  afterAll(() => server.close());

  beforeEach(() => {
    resetMockGoal();
    server.use(
      weightGetCurrentGoalHandler,
      weightSetGoalHandler,
      weightUpdateGoalHandler,
    );
    queryClient.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    useAuthStore.setState({
      isLoggedIn: false,
      userId: null,
      token: null,
      refreshToken: null,
    });
    server.resetHandlers();
  });

  it("renders loading state then shows current goal and form", async () => {
    await act(async () => {
      renderWeightGoal();
    });

    await waitFor(
      () => {
        expect(screen.queryByTestId("weight-goal-loading")).not.toBeInTheDocument();
        expect(screen.getByRole("heading", { name: /Your Goals/i })).toBeInTheDocument();
        expect(screen.getByTestId("current-goal-display")).toHaveTextContent("65 kg");
        expect(screen.getByTestId("goal-weight-input")).toBeInTheDocument();
        expect(screen.getByTestId("submit-button")).toBeInTheDocument();
        expect(screen.getByTestId("goal-list")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("submits new weight goal, shows success message and updates displayed goal", async () => {
    const user = userEvent.setup();

    await act(async () => {
      renderWeightGoal();
    });

    await waitFor(
      () => {
        expect(screen.getByTestId("goal-weight-input")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const input = screen.getByTestId("goal-weight-input");
    const form = input.closest("form") as HTMLFormElement;

    if (!form) throw new Error("Form not found");

    await act(async () => {
      await user.clear(input);
      await user.type(input, "60");
    });

    await act(async () => {
      const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvent);
    });

    await waitFor(
      () => {
        const message = screen.getByTestId("goal-message");
        expect(message).toHaveTextContent("Goal updated successfully!");
        expect(message).not.toHaveTextContent("Failed");
      },
      { timeout: 5000 }
    );

    await act(async () => {
      queryClient.invalidateQueries({ queryKey: ["weight", "getCurrentGoal"] });
    });

    await waitFor(
      () => {
        expect(screen.getByTestId("current-goal-display")).toHaveTextContent("60 kg");
      },
      { timeout: 8000, interval: 200 }
    );
  });
});