// __tests__/routes/_authenticated/lists/$listId/edit.test.tsx

import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { server } from "../../../../../__mocks__/server";
import { renderWithProviders } from "../../../../utils/test-helpers";

import {
  resetMockLists,
  prepareDetailPageTestList,
  listGetAllHandler,
  listGetOneDetailPagePreset,
  getMockLists,
  listUpdateHandler,
  listUpdateDelayedHandler,
} from "../../../../../__mocks__/handlers/lists";

import { trpcMsw } from "../../../../../__mocks__/trpcMsw";
import { TRPCError } from "@trpc/server";
import { useAuthStore } from "@/shared/store/authStore";
import { suppressActWarnings } from "../../../../act-suppress";

suppressActWarnings();

describe("Edit List Page (/_authenticated/lists/$listId/edit)", () => {
  const TEST_LIST_ID = "list-abc-123";
  const ORIGINAL_TITLE = "My Important Projects";

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "warn" });
  });

  afterAll(() => server.close());

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

    server.use(
      listGetOneDetailPagePreset,
      listGetAllHandler,
      listUpdateHandler,
      trpcMsw.task.getByList.query(() => []),
    );
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

  async function renderEditListPage(
    listId = TEST_LIST_ID,
    options: { waitForForm?: boolean } = { waitForForm: true },
  ) {
    server.use(listGetOneDetailPagePreset);

    const result = renderWithProviders({
      initialEntries: [`/lists/${listId}/edit`],
    });

    if (options.waitForForm) {
      await screen.findByText("Edit List", {}, { timeout: 8000 });
      await screen.findByDisplayValue(ORIGINAL_TITLE, {}, { timeout: 5000 });
    }

    return result;
  }

  async function fillForm(title: string, description = "") {
    const titleInput = await screen.findByLabelText(/List name/i);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, title);

    const descInput = screen.getByLabelText(/Description/i);
    await userEvent.clear(descInput);
    if (description) await userEvent.type(descInput, description);
  }

  function getSaveButton() {
    return screen.getByRole("button", { name: /Save Changes|Saving/i });
  }

  it("renders heading, form fields and action buttons", async () => {
    await renderEditListPage();

    expect(
      screen.getByRole("heading", { level: 1, name: /Edit List/i }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/List name/i)).toHaveAttribute(
      "placeholder",
      "Work, Groceries, Ideas...",
    );

    expect(
      screen.getByLabelText(/Description \(optional\)/i),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /Cancel and return to list/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(getSaveButton()).toBeInTheDocument();
  });

  it("disables Save button when title is empty", async () => {
    await renderEditListPage();

    const saveButton = getSaveButton();
    await waitFor(() => expect(saveButton).toBeDisabled(), { timeout: 5000 });

    const titleInput = screen.getByLabelText(/List name/i);

    await userEvent.type(titleInput, "Valid name");
    await waitFor(() => expect(saveButton).not.toBeDisabled(), {
      timeout: 4000,
    });

    await userEvent.clear(titleInput);
    await waitFor(() => expect(saveButton).toBeDisabled(), { timeout: 4000 });
  });

  it("shows loading UI during update mutation", async () => {
    server.use(listUpdateDelayedHandler);

    await renderEditListPage();

    await fillForm("Weekend Update");

    const form = screen.getByTestId("edit-list-form");
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );

    await screen.findByText("Saving...", {}, { timeout: 6000 });

    expect(screen.getByRole("button", { name: /Saving/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("rolls back optimistic update when mutation fails", async () => {
    server.use(
      trpcMsw.list.update.mutation(() => {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update list – server error",
        });
      }),
    );

    await renderEditListPage();

    await fillForm("This will fail");

    const form = screen.getByTestId("edit-list-form");
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );

    await waitFor(
      () => {
        const updated = getMockLists().find((l) => l.id === TEST_LIST_ID);
        expect(updated?.title).toBe(ORIGINAL_TITLE);
      },
      { timeout: 8000 },
    );
  });
});
