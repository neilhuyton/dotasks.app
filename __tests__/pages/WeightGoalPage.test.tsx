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
    resetMockGoal();
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
    const { container } = renderPage();

    await waitFor(
      () =>
        expect(
          container.querySelector(".animate-spin"),
        ).not.toBeInTheDocument(),
      { timeout: 4000 },
    );

    expect(
      screen.getByRole("heading", { name: "Weight Goals" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Current Goal")).toBeInTheDocument();

    const weightDisplay = screen.getByTestId("current-goal-weight");
    expect(weightDisplay).toHaveTextContent(/65\s*kg/);
    expect(weightDisplay).toHaveClass("text-6xl");

    expect(screen.getByText(/Set on/i)).toBeInTheDocument();
    expect(screen.getByText(/synced/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /View Goal History/i }),
    ).toBeInTheDocument();
  });

  it("opens modal when clicking current goal card, allows setting new goal, shows success and updates display", async () => {
    const user = userEvent.setup();

    renderPage();

    await waitFor(
      () => {
        const weightDisplay = screen.getByTestId("current-goal-weight");
        expect(weightDisplay).toBeInTheDocument();
        expect(weightDisplay).toHaveTextContent(/65\s*kg/);
      },
      { timeout: 10000 },
    );

    await user.click(
      screen.getByRole("button", { name: /Set or update your weight goal/i }),
    );

    await waitFor(
      () => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(
          screen.getByText(/Update Goal|Set New Goal/i),
        ).toBeInTheDocument();
        expect(screen.getByLabelText("Goal Weight (kg)")).toBeInTheDocument();
        expect(screen.getByTestId("current-goal-weight")).toHaveTextContent(
          /65\s*kg/,
        );
      },
      { timeout: 10000 },
    );

    await new Promise((r) => setTimeout(r, 600));

    const input = screen.getByLabelText("Goal Weight (kg)");
    await user.clear(input);
    await user.type(input, "59.5");

    // Find the form via the input (reliable, no role needed)
    const formElement = input.closest("form");
    if (!formElement) {
      throw new Error("Could not find <form> element");
    }

    // Dispatch native submit event
    const submitEvent = new Event("submit", {
      bubbles: true,
      cancelable: true,
    });

    formElement.dispatchEvent(submitEvent);

    // Wait for success indicators
    await waitFor(
      () => {
        const msg = screen.queryByTestId("form-message");
        const weight = screen.getByTestId("current-goal-weight");

        const hasSuccess =
          msg?.textContent?.toLowerCase().includes("success") ?? false;
        const weightUpdated = weight.textContent?.includes("59.5") ?? false;

        expect(hasSuccess || weightUpdated).toBe(true);
      },
      { timeout: 12000, interval: 300 },
    );

    // Close modal if still open
    const dialog = screen.queryByRole("dialog");
    if (dialog) {
      const closeButton =
        screen.queryByRole("button", { name: /close/i }) ||
        screen.queryByLabelText(/close/i);
      if (closeButton) await user.click(closeButton);
    }

    // Final check
    expect(screen.getByTestId("current-goal-weight")).toHaveTextContent(
      /59\.5\s*kg/,
    );
  });
});
