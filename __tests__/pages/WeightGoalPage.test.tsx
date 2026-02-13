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

  it("renders current goal card", async () => {
    renderPage();

    const weightDisplay = await waitFor(
      () => screen.getByTestId("current-goal-weight"),
      { timeout: 5000, interval: 200 },
    );

    expect(weightDisplay).toBeInTheDocument();
    expect(weightDisplay).toHaveTextContent("65"); // or /65/
    expect(weightDisplay).toHaveClass("text-6xl");

    expect(screen.getByText("Current Goal")).toBeInTheDocument();
    expect(screen.getByText(/Set on/i)).toBeInTheDocument();

    // ── Updated / more flexible assertions ────────────────────────────────
    // Now that we prefer local cache, status can be " • local" or " • synced"
    // We just want to confirm *some* status suffix is present
    const statusElement = screen.getByText(/Set on/i);
    const statusText = statusElement.textContent || "";

    expect(statusText).toMatch(/Set on/);
    expect(statusText).toMatch(/01\/10\/2023/); // or whatever mock date is
    expect(statusText).toMatch(/(• local|• cached|• synced)/); // any valid suffix

    // History button still there
    expect(
      screen.getByRole("button", { name: /View Goal History/i }),
    ).toBeInTheDocument();

    expect(screen.queryByText("No goal set yet")).not.toBeInTheDocument();
  });

  it("allows inline editing of current goal and updates display on save", async () => {
    const user = userEvent.setup();
    renderPage();

    // 1. Initial state
    const initialWeightEl = await waitFor(
      () => screen.getByTestId("current-goal-weight"),
      { timeout: 5000 },
    );
    expect(initialWeightEl).toHaveTextContent("65");

    // 2. Enter edit mode by clicking the weight display
    await user.click(initialWeightEl);

    // 3. Wait for input to appear and have correct initial value
    const input = await waitFor(() => screen.getByDisplayValue("65"), {
      timeout: 3000,
    });

    // 4. Change value and save
    await user.clear(input);
    await user.type(input, "59.5");
    await user.keyboard("[Enter]");

    // 5. Wait for display to update to new value (optimistic or final)
    await waitFor(
      () => {
        expect(screen.getByTestId("current-goal-weight")).toHaveTextContent(
          "59.5",
        );
      },
      { timeout: 5000 },
    );

    // 6. Editing mode should be gone
    await waitFor(
      () => {
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // 7. Status should be final (not "Saving...")
    const statusEl = await waitFor(() => screen.getByText(/Set on/i), {
      timeout: 5000,
    });

    const statusText = statusEl.textContent || "";
    expect(statusText).not.toContain("Saving new goal...");
    expect(statusText).toMatch(/Set on/);
    expect(statusText).toMatch(/13\/02\/2026/); // current mock date
    expect(statusText).toMatch(/• local/); // expected in this setup

    // Optional bonus: confirm no error state or revert
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });
});
