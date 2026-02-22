// __tests__/routes/_authenticated/lists/$listId/edit.test.tsx

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { server } from "../../../../../__mocks__/server";
import { renderWithTrpcRouter } from "../../../../utils/test-helpers";

import {
  resetMockLists,
  prepareDetailPageTestList,
  listGetAllHandler,
  listGetOneSuccessHandler,
  getMockLists,
  listUpdateHandler,
  delayedListUpdateHandler,
} from "../../../../../__mocks__/handlers/lists";

import { routeTree } from "@/routeTree.gen";
import { useAuthStore } from "@/store/authStore";
import { suppressActWarnings } from "../../../../act-suppress";
import { trpcMsw } from "../../../../../__mocks__/trpcMsw";
import { TRPCError } from "@trpc/server";

suppressActWarnings();

describe("Edit List Page (/_authenticated/lists/$listId/edit)", () => {
  const TEST_LIST_ID = "list-abc-123";
  const ORIGINAL_TITLE = "My Important Projects";

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

  beforeEach(() => {
    useAuthStore.setState({
      isLoggedIn: true,
      userId: "test-user-123",
      accessToken: "mock-token",
      refreshToken: "mock-refresh",
    });

    server.resetHandlers();
    resetMockLists();
    prepareDetailPageTestList();

    server.use(listGetAllHandler);
    server.use(listGetOneSuccessHandler);
    server.use(listUpdateHandler);

    // Prevent MSW warnings for unrelated queries (e.g. tasks)
    server.use(trpcMsw.task.getByList.query(() => []));
  });

  afterEach(async () => {
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
    const { history } = renderWithTrpcRouter({
      initialPath: `/lists/${TEST_LIST_ID}/edit`,
      routeTree,
    });

    // Wait for page to load
    await screen.findByText("Edit List");
    await screen.findByDisplayValue(ORIGINAL_TITLE);

    return { history };
  };

  it("renders page title, description, inputs and buttons", async () => {
    await renderEditListPage();

    expect(screen.getByText("Edit List")).toBeInTheDocument();

    expect(screen.getByLabelText(/List name/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Work, Groceries, Ideas..."),
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/Description \(optional\)/i),
    ).toBeInTheDocument();

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

    await userEvent.clear(titleInput);
    expect(saveButton).toBeDisabled();

    await userEvent.type(titleInput, "   ");
    expect(saveButton).toBeDisabled();

    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Valid updated name");
    expect(saveButton).not.toBeDisabled();
  });

  it("shows loading state during list update", async () => {
    server.use(delayedListUpdateHandler);

    await renderEditListPage();

    const titleInput = screen.getByLabelText(/List name/i);
    await userEvent.type(titleInput, " Weekend Update");

    const form = screen.getByTestId("edit-list-form");
    fireEvent.submit(form);

    await screen.findByText("Saving...", {}, { timeout: 2000 });
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("updates list with optimistic update and navigates on success", async () => {
    const { history } = await renderEditListPage();

    const titleInput = screen.getByLabelText(/List name/i);
    const descInput = screen.getByLabelText(/Description/i);

    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Updated Project List");

    await userEvent.clear(descInput);
    await userEvent.type(descInput, "New description here");

    const form = screen.getByTestId("edit-list-form");
    fireEvent.submit(form);

    await waitFor(
      () => {
        expect(history.location.pathname).toBe("/lists");
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

    const { history } = await renderEditListPage();

    await userEvent.clear(screen.getByLabelText(/List name/i));
    await userEvent.type(screen.getByLabelText(/List name/i), "Will fail");

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

    expect(history.location.pathname).not.toBe("/lists");
  });

  it("navigates back to /lists on Cancel button click", async () => {
    const { history } = await renderEditListPage();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(history.location.pathname).toBe("/lists");
  });

  it("navigates back to /lists on Close (X) button click", async () => {
    const { history } = await renderEditListPage();

    await userEvent.click(
      screen.getByRole("button", { name: "Cancel and return to lists" }),
    );

    expect(history.location.pathname).toBe("/lists");
  });

  it.skip("does not submit when title is empty (prevents mutation)", async () => {
    const { history } = await renderEditListPage();

    const titleInput = screen.getByLabelText(/List name/i);
    await userEvent.clear(titleInput);

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

    expect(history.location.pathname).not.toBe("/lists");
  });
});
