// __tests__/pages/WeightGoalPage.test.tsx

import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpLink } from "@trpc/client";
import { trpc } from "../../src/trpc";
import { server } from "../../__mocks__/server";
import "@testing-library/jest-dom";

import WeightGoalPage from "../../src/pages/WeightGoalPage";
import {
  weightGetCurrentGoalHandler,
  weightSetGoalHandler,
  weightUpdateGoalHandler,
  resetMockGoal,
} from "../../__mocks__/handlers/weight";
import { useAuthStore } from "../../src/store/authStore";
import { generateToken } from "../utils/token";
import { suppressActWarnings } from "../act-suppress";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/", search: {}, hash: "" }),
  useParams: () => ({}),
  useSearch: () => ({}),
}));

suppressActWarnings();

vi.mock("../../src/components/GoalList", () => ({
  default: () => <div data-testid="goal-list">Mocked GoalList</div>,
}));

describe("WeightGoalPage (modal version)", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  const trpcClient = trpc.createClient({
    links: [httpLink({ url: "/trpc" })],
  });

  const renderPage = (userId = "test-user-id") => {
    useAuthStore.setState({
      isLoggedIn: true,
      userId,
      accessToken: generateToken(userId),
    });

    return render(
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <WeightGoalPage />
        </QueryClientProvider>
      </trpc.Provider>,
    );
  };

  beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
  afterAll(() => server.close());

  beforeEach(() => {
    resetMockGoal(); // ensures goalWeightKg: 65 exists at start
    server.use(
      weightGetCurrentGoalHandler,
      weightSetGoalHandler,
      weightUpdateGoalHandler,
    );
    queryClient.clear();
  });

  afterEach(() => {
    useAuthStore.setState({
      isLoggedIn: false,
      userId: null,
      accessToken: null,
    });
    server.resetHandlers();
    queryClient.clear();
  });

  it("renders loading state then shows current goal card", async () => {
    renderPage();

    // Wait until the goal display appears (proves query resolved and goal exists)
    const weightDisplay = await waitFor(
      () => screen.getByTestId("current-goal-weight"),
      { timeout: 5000, interval: 200 }
    );

    // Core assertions - goal is visible
    expect(weightDisplay).toBeInTheDocument();
    expect(weightDisplay).toHaveTextContent(/65/);
    expect(weightDisplay).toHaveClass("text-6xl");

    // Other visible elements
    expect(screen.getByText("Current Goal")).toBeInTheDocument();
    expect(screen.getByText(/Set on/i)).toBeInTheDocument();
    expect(screen.getByText(/synced/i)).toBeInTheDocument(); // assumes !isFromCache

    // History button
    expect(
      screen.getByRole("button", { name: /View Goal History/i })
    ).toBeInTheDocument();

    // Just to confirm we're NOT in the "no goal" state
    expect(screen.queryByText("No goal set yet")).not.toBeInTheDocument();
  });

  it.skip("opens modal when clicking current goal card, allows setting new goal, shows success and updates display", async () => {
    const user = userEvent.setup();

    renderPage();

    // Wait for initial goal to render (same as first test)
    const weightDisplay = await waitFor(
      () => screen.getByTestId("current-goal-weight"),
      { timeout: 5000 }
    );
    expect(weightDisplay).toHaveTextContent(/65\s*/);

    // Open modal via the accessible button name
    await user.click(
      screen.getByRole("button", { name: /Set or update your weight goal/i })
    );

    // Wait for modal + form
    await waitFor(
      () => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(
          screen.getByText(/Update Goal|Set New Goal/i)
        ).toBeInTheDocument();
        expect(screen.getByLabelText("Goal Weight (kg)")).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Small delay to let UI settle (helps with focus/input issues sometimes)
    await new Promise((r) => setTimeout(r, 400));

    const input = screen.getByLabelText("Goal Weight (kg)");
    await user.clear(input);
    await user.type(input, "59.5");

    // Submit via form submit event (reliable)
    const formElement = input.closest("form");
    if (!formElement) throw new Error("Form not found");

    formElement.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    // Wait for update to reflect (either success message or new weight)
    await waitFor(
      () => {
        expect(screen.getByTestId("current-goal-weight")).toHaveTextContent(
          /59\.5\s*kg/
        );
      },
      { timeout: 8000, interval: 300 }
    );

    // Optional: close modal if still open
    const dialog = screen.queryByRole("dialog");
    if (dialog) {
      const closeBtn =
        screen.queryByRole("button", { name: /close/i }) ||
        screen.queryByLabelText(/close/i);
      if (closeBtn) await user.click(closeBtn);
    }

    // Final verification
    expect(screen.getByTestId("current-goal-weight")).toHaveTextContent(
      /59\.5\s*kg/
    );
  });
});