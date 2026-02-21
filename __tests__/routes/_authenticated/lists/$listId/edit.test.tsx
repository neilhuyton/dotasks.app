// __tests__/routes/_authenticated/lists/$listId/edit.test.tsx

import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { trpc } from "@/trpc";
import { httpLink } from "@trpc/client";
import { server } from "../../../../../__mocks__/server";
import { routeTree } from "@/routeTree.gen";
import { useAuthStore } from "@/store/authStore";
import { trpcMsw } from "../../../../../__mocks__/trpcMsw";
import { TRPCError } from "@trpc/server";

import {
  resetMockLists,
  prepareDetailPageTestList,
  listGetAllHandler,
  listGetOneSuccessHandler,
  getMockLists,
  listUpdateHandler,
  delayedListUpdateHandler,
} from "../../../../../__mocks__/handlers/lists";
import { suppressActWarnings } from "../../../../act-suppress";

suppressActWarnings();

describe("Edit List Page (/_authenticated/lists/$listId/edit)", () => {
  let queryClient: QueryClient;
  const user = userEvent.setup();

  const TEST_LIST_ID = "list-abc-123";
  const ORIGINAL_TITLE = "My Important Projects";

  let history: ReturnType<typeof createMemoryHistory>;

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

  beforeEach(() => {
    useAuthStore.setState({
      isLoggedIn: true,
      userId: "test-user-123",
      accessToken: "mock-token",
      refreshToken: "mock-refresh",
    });

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: 0 },
        mutations: { retry: false },
      },
    });

    server.resetHandlers();
    resetMockLists();
    prepareDetailPageTestList();

    server.use(listGetAllHandler);
    server.use(listGetOneSuccessHandler);

    // Prevent MSW warnings for unrelated queries (e.g. tasks in layout)
    server.use(trpcMsw.task.getByList.query(() => []));

    // Use the exported mutating handler for update (this is what fixes unhandled POST)
    server.use(listUpdateHandler);

    history = createMemoryHistory({
      initialEntries: [`/lists/${TEST_LIST_ID}/edit`],
    });
  });

  afterEach(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    server.resetHandlers();
    useAuthStore.setState({
      isLoggedIn: false,
      userId: null,
      accessToken: null,
      refreshToken: null,
    });
  });

  afterAll(() => server.close());

  const renderEditListPage = async () => {
    const router = createRouter({ routeTree, history });
    const navigateSpy = vi.spyOn(router, "navigate");

    render(
      <trpc.Provider
        client={trpc.createClient({
          links: [httpLink({ url: "http://localhost:8888/trpc" })],
        })}
        queryClient={queryClient}
      >
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </trpc.Provider>,
    );

    await screen.findByText("Edit List");
    await screen.findByDisplayValue(ORIGINAL_TITLE);

    return { navigateSpy };
  };

  it("renders page title, description, inputs and buttons", async () => {
    await renderEditListPage();

    expect(screen.getByText("Edit List")).toBeInTheDocument();

    expect(screen.getByLabelText(/List name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Work, Groceries, Ideas...")).toBeInTheDocument();

    expect(screen.getByLabelText(/Description \(optional\)/i)).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Cancel and return to lists" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Save Changes/i }),
    ).toBeInTheDocument();
  });

  it("disables Save Changes button when title is empty or whitespace", async () => {
    await renderEditListPage();

    const saveButton = screen.getByRole("button", { name: /Save Changes/i });
    expect(saveButton).not.toBeDisabled();

    const titleInput = screen.getByLabelText(/List name/i);

    await user.clear(titleInput);
    expect(saveButton).toBeDisabled();

    await user.type(titleInput, "   ");
    expect(saveButton).toBeDisabled();

    await user.clear(titleInput);
    await user.type(titleInput, "Valid updated name");
    expect(saveButton).not.toBeDisabled();
  });

  it("shows loading state during list update", async () => {
    server.use(delayedListUpdateHandler);

    await renderEditListPage();

    const titleInput = screen.getByLabelText(/List name/i);
    await user.type(titleInput, " Weekend Update");

    const form = screen.getByTestId("edit-list-form");
    fireEvent.submit(form);

    await screen.findByText("Saving...", {}, { timeout: 2000 });
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("updates list with optimistic update and navigates on success", async () => {
    const { navigateSpy } = await renderEditListPage();

    const titleInput = screen.getByLabelText(/List name/i);
    const descInput = screen.getByLabelText(/Description/i);

    await user.clear(titleInput);
    await user.type(titleInput, "Updated Project List");

    await user.clear(descInput);
    await user.type(descInput, "New description here");

    const form = screen.getByTestId("edit-list-form");
    fireEvent.submit(form);

    await waitFor(
      () => {
        expect(navigateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ to: "/lists", replace: true }),
        );
      },
      { timeout: 5000 },
    );

    const updatedLists = getMockLists();
    const updated = updatedLists.find((l) => l.id === TEST_LIST_ID);
    expect(updated?.title).toBe("Updated Project List");
    expect(updated?.description).toBe("New description here");
  });

  it("rolls back optimistic update on update error", async () => {
    server.use(
      trpcMsw.list.update.mutation(() => {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Update failed",
        });
      }),
    );

    const { navigateSpy } = await renderEditListPage();

    await user.clear(screen.getByLabelText(/List name/i));
    await user.type(screen.getByLabelText(/List name/i), "Will fail");

    const form = screen.getByTestId("edit-list-form");
    fireEvent.submit(form);

    await waitFor(
      () => {
        const lists = getMockLists();
        const updated = lists.find((l) => l.id === TEST_LIST_ID);
        expect(updated?.title).toBe(ORIGINAL_TITLE);
      },
      { timeout: 5000 },
    );

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("navigates back to /lists on Cancel button click", async () => {
    const { navigateSpy } = await renderEditListPage();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ to: "/lists", replace: true }),
    );
  });

  it("navigates back to /lists on Close (X) button click", async () => {
    const { navigateSpy } = await renderEditListPage();
    await user.click(
      screen.getByRole("button", { name: "Cancel and return to lists" }),
    );
    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ to: "/lists", replace: true }),
    );
  });

  it.skip("does not submit when title is empty (prevents mutation)", async () => {
    const { navigateSpy } = await renderEditListPage();

    const titleInput = screen.getByLabelText(/List name/i);
    await user.clear(titleInput);

    const saveButton = screen.getByRole("button", { name: /Save Changes/i });
    expect(saveButton).toBeDisabled();

    const form = screen.getByTestId("edit-list-form");
    fireEvent.submit(form);

    await waitFor(
      () => {
        const lists = getMockLists();
        const updated = lists.find((l) => l.id === TEST_LIST_ID);
        expect(updated?.title).toBe(ORIGINAL_TITLE);
      },
      { timeout: 1500 },
    );

    expect(navigateSpy).not.toHaveBeenCalled();
  });
});