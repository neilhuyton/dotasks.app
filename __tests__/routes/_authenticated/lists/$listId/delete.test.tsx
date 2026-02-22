// __tests__/routes/_authenticated/lists/$listId/delete.test.tsx

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
  listDeleteHandler,
  delayedListDeleteHandler,
} from "../../../../../__mocks__/handlers/lists";

import { routeTree } from "@/routeTree.gen";
import { useAuthStore } from "@/store/authStore";
import { suppressActWarnings } from "../../../../act-suppress";
import { trpcMsw } from "../../../../../__mocks__/trpcMsw";
import { TRPCError } from "@trpc/server";

suppressActWarnings();

describe("Delete List Confirmation Page (/_authenticated/lists/$listId/delete)", () => {
  const TEST_LIST_ID = "list-abc-123";

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
    prepareDetailPageTestList(); // Ensures the list with id "list-abc-123" exists

    server.use(listGetAllHandler);
    server.use(listGetOneSuccessHandler);
    server.use(listDeleteHandler);

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

  const renderDeletePage = async () => {
    const { history } = renderWithTrpcRouter({
      initialPath: `/lists/${TEST_LIST_ID}/delete`,
      routeTree,
    });

    // Wait for confirmation heading to confirm page loaded
    await screen.findByRole("heading", { name: /Delete/i });

    return { history };
  };

  it("renders confirmation message, list title, and buttons", async () => {
    await renderDeletePage();

    expect(
      screen.getByRole("heading", {
        name: /Delete "My Important Projects"\?/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "This action cannot be undone. All tasks in this list will be permanently deleted.",
      ),
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete List" }),
    ).toBeInTheDocument();
  });

  it("shows loading state during deletion", async () => {
    server.use(delayedListDeleteHandler);

    await renderDeletePage();

    // Submit the form (your delete page uses <form onSubmit={handleSubmit}>)
    fireEvent.submit(
      screen.getByRole("form", { name: /delete list confirmation/i }),
    );

    await screen.findByText("Deleting...", {}, { timeout: 2000 });

    const deleteButton = screen.getByRole("button", { name: "Deleting..." });
    expect(deleteButton).toBeDisabled();

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("deletes list with optimistic update and navigates on success", async () => {
    const initialCount = getMockLists().length;
    const { history } = await renderDeletePage();

    fireEvent.submit(
      screen.getByRole("form", { name: /delete list confirmation/i }),
    );

    await waitFor(
      () => {
        expect(history.location.pathname).toBe("/lists");
      },
      { timeout: 3000 },
    );

    expect(getMockLists().length).toBeLessThan(initialCount);
    expect(getMockLists().some((l) => l.id === TEST_LIST_ID)).toBe(false);
  });

  it("rolls back optimistic update on deletion error", async () => {
    server.use(
      trpcMsw.list.delete.mutation(() => {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Deletion failed",
        });
      }),
    );

    const initialCount = getMockLists().length;
    const { history } = await renderDeletePage();

    fireEvent.submit(
      screen.getByRole("form", { name: /delete list confirmation/i }),
    );

    await waitFor(
      () => {
        expect(getMockLists()).toHaveLength(initialCount);
        expect(getMockLists().some((l) => l.id === TEST_LIST_ID)).toBe(true);
      },
      { timeout: 3000 },
    );

    expect(history.location.pathname).not.toBe("/lists");
  });

  it("navigates back to /lists on Cancel button click", async () => {
    const { history } = await renderDeletePage();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(history.location.pathname).toBe("/lists");
  });

  it("navigates back to /lists on Back (ArrowLeft) button click", async () => {
    const { history } = await renderDeletePage();

    // The back button has aria-label="Back to lists"
    await userEvent.click(
      screen.getByRole("button", { name: "Back to lists" }),
    );

    expect(history.location.pathname).toBe("/lists");
  });
});
