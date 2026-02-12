// __tests__/WeightList.test.tsx

import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpLink } from "@trpc/client";
import { trpc } from "../src/trpc";
import { server } from "../__mocks__/server";
import "@testing-library/jest-dom";

import WeightList from "../src/components/WeightList";
import {
  weightGetWeightsHandler,
  weightDeleteHandler,
} from "../__mocks__/handlers/weight";
import { resetWeights } from "../__mocks__/handlers/weightsData";
import { useAuthStore } from "../src/store/authStore";
import { generateToken } from "./utils/token";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Trash2: () => <div data-testid="trash-icon" />,
}));

describe("WeightList", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  const trpcClient = trpc.createClient({
    links: [httpLink({ url: "/trpc" })],
  });

  const renderWeightList = async (userId = "test-user-id") => {
    useAuthStore.setState({
      isLoggedIn: true,
      userId,
      accessToken: generateToken(userId),
      refreshToken: "valid-refresh-token",
    });

    render(
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <WeightList />
        </QueryClientProvider>
      </trpc.Provider>,
    );
  };

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "warn" });
  });

  beforeEach(() => {
     vi.spyOn(window, "confirm").mockReturnValue(true);
    server.use(weightGetWeightsHandler, weightDeleteHandler);
    queryClient.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
    queryClient.clear();
    useAuthStore.setState({
      isLoggedIn: false,
      userId: null,
      accessToken: null,
      refreshToken: null,
    });
    resetWeights();
  });

  afterAll(() => {
    server.close();
  });

  it("displays weight measurements in a table", async () => {
    await renderWeightList();

    await waitFor(
      () => {
        expect(
          screen.queryByTestId("weight-list-loading"),
        ).not.toBeInTheDocument();
        expect(screen.getByRole("table")).toBeInTheDocument();
        expect(screen.getByText("Weight (kg)")).toBeInTheDocument();
        expect(screen.getByText("Date")).toBeInTheDocument();
        expect(screen.getByText("70")).toBeInTheDocument();
        expect(screen.getByText("69.9")).toBeInTheDocument();
        expect(screen.queryByTestId("error-message")).not.toBeInTheDocument();
      },
      { timeout: 4000 },
    );
  });

  it("deletes a weight measurement when delete button is clicked", async () => {
    const user = userEvent.setup();

    await renderWeightList();

    // Wait for initial successful load with both entries visible
    await waitFor(
      () => {
        expect(screen.queryByTestId("weight-list-loading")).not.toBeInTheDocument();
        expect(screen.getByText("70")).toBeInTheDocument();
        expect(screen.getByText("69.9")).toBeInTheDocument();
        expect(screen.queryByTestId("error-message")).not.toBeInTheDocument();
      },
      { timeout: 4000 },
    );

    // Find and click the delete button for the 01/10/2023 entry (70 kg)
    const deleteButton = screen.getByRole("button", {
      name: /Delete weight measurement from 01\/10\/2023/i,
    });

    await user.click(deleteButton);

    // Wait until the UI reflects the deletion
    await waitFor(
      () => {
        expect(screen.queryByText("70")).not.toBeInTheDocument();
        expect(screen.getByText("69.9")).toBeInTheDocument();
        expect(screen.queryByTestId("weight-list-loading")).not.toBeInTheDocument();
        expect(screen.queryByTestId("error-message")).not.toBeInTheDocument();
      },
      { timeout: 4000 },
    );

    // Optional: verify only one data row remains (header + 1 row)
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });
});