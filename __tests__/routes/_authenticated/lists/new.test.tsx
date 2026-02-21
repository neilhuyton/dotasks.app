// __tests__/routes/_authenticated/lists/new.test.tsx

import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { server } from "../../../../__mocks__/server";
import { trpcMsw } from "../../../../__mocks__/trpcMsw";
import { TRPCError } from "@trpc/server";

import { renderWithTrpcRouter } from "../../../utils/test-helpers";

import {
  listCreateHandler,
  delayedListCreateHandler,
  resetMockLists,
  getMockLists,
  listGetAllHandler,
} from "../../../../__mocks__/handlers/lists";
import { routeTree } from "@/routeTree.gen";
import { useAuthStore } from "@/store/authStore";
import { suppressActWarnings } from "../../../act-suppress";

suppressActWarnings();

describe("Create New List Page (/_authenticated/lists/new)", () => {
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

    server.use(listGetAllHandler);
    server.use(listCreateHandler);
  });

  afterEach(() => {
    server.resetHandlers();
    useAuthStore.setState({
      isLoggedIn: false,
      userId: null,
      accessToken: null,
      refreshToken: null,
    });
  });

  afterAll(() => server.close());

  async function renderNewListPage(initialPath = "/lists/new") {
    const result = renderWithTrpcRouter({
      initialPath,
      routeTree,
    });

    await screen.findByText("Create New List", {}, { timeout: 5000 });

    return result;
  }

  async function fillForm(title: string, description = "") {
    const titleInput = await screen.findByLabelText(/List name/i);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, title);

    if (description) {
      const descInput = await screen.findByLabelText(/Description/i);
      await userEvent.clear(descInput);
      await userEvent.type(descInput, description);
    }
  }

  async function getCreateButton() {
    return await screen.findByRole("button", { name: /^Create List$/i });
  }

  it("renders title, inputs and buttons", async () => {
    await renderNewListPage();

    await screen.findByLabelText(/List name/i);
    await screen.findByPlaceholderText("Work, Groceries, Ideas...");

    await screen.findByLabelText(/Description \(optional\)/i);

    await screen.findByRole("button", { name: "Cancel" });
    await screen.findByRole("button", { name: "Cancel and return to lists" });
    await getCreateButton();
  });

  it("disables Create button when title is empty or whitespace only", async () => {
    await renderNewListPage();

    const createBtn = await getCreateButton();
    expect(createBtn).toBeDisabled();

    const titleInput = await screen.findByLabelText(/List name/i);

    await userEvent.type(titleInput, "   ");
    expect(createBtn).toBeDisabled();

    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "My List");
    expect(createBtn).not.toBeDisabled();
  });

  it("shows loading state during creation", async () => {
    server.use(delayedListCreateHandler);

    await renderNewListPage();

    await fillForm("Weekend Plans");
    const form = await screen.findByTestId("create-list-form");
    fireEvent.submit(form);

    await screen.findByText("Creating...");
    expect(
      await screen.findByRole("button", { name: "Cancel" }),
    ).toBeDisabled();
  });

  it("creates list, optimistically updates, and navigates on success", async () => {
    const initialCount = getMockLists().length;
    const { history } = await renderNewListPage();

    await fillForm("Travel Bucket List", "Places I want to visit");
    const form = await screen.findByTestId("create-list-form");
    fireEvent.submit(form);

    await waitFor(() => expect(history.location.pathname).toBe("/lists"), {
      timeout: 4000,
    });

    expect(getMockLists().length).toBeGreaterThan(initialCount);
    expect(getMockLists().some((l) => l.title === "Travel Bucket List")).toBe(
      true,
    );
  });

  it("rolls back optimistic update on creation failure", async () => {
    server.use(
      trpcMsw.list.create.mutation(() => {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Creation failed",
        });
      }),
    );

    const initialCount = getMockLists().length;
    await renderNewListPage();

    await fillForm("Bad List");
    const form = await screen.findByTestId("create-list-form");
    fireEvent.submit(form);

    await waitFor(() => expect(getMockLists()).toHaveLength(initialCount), {
      timeout: 4000,
    });
  });

  it("navigates back to /lists on Cancel text button click", async () => {
    const { history } = await renderNewListPage();

    await userEvent.click(
      await screen.findByRole("button", { name: "Cancel" }),
    );

    await waitFor(() => expect(history.location.pathname).toBe("/lists"), {
      timeout: 2000,
    });
  });
});
