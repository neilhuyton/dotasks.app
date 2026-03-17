import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { server } from "../../../../__mocks__/server";
import {
  listCreateHandler,
  listCreateDelayedHandler,
  resetMockLists,
  getMockLists,
  listGetAllHandler,
} from "../../../../__mocks__/handlers/lists";

import { renderWithProviders } from "../../../utils/test-helpers";
import { useAuthStore } from "@/store/authStore";
import { suppressActWarnings } from "../../../utils/act-suppress";
import { trpcMsw } from "../../../../__mocks__/trpcMsw";
import { TRPCError } from "@trpc/server";

suppressActWarnings();

describe("Create New List Page (/_authenticated/lists/new)", () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: "bypass" });
  });

  beforeEach(async () => {
    server.resetHandlers();
    resetMockLists();

    server.use(listGetAllHandler, listCreateHandler);

    await useAuthStore.getState().initialize();
  });

  afterEach(async () => {
    server.resetHandlers();
    await useAuthStore.getState().signOut();
  });

  afterAll(() => server.close());

  function renderNewListPage() {
    return renderWithProviders({ initialEntries: ["/lists/new"] });
  }

  async function waitForFormReady() {
    await waitFor(
      () => {
        expect(
          screen.getByRole("heading", { name: /Create New List/i }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText(/List name/i)).toBeInTheDocument();
        expect(screen.getByTestId("create-button")).toBeInTheDocument();
        expect(screen.getByTestId("cancel-button")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  }

  async function fillForm(title: string) {
    await waitForFormReady();

    const titleInput = screen.getByLabelText(/List name/i);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, title);
  }

  it("renders title, inputs and buttons", async () => {
    renderNewListPage();
    await waitForFormReady();

    expect(screen.getByLabelText(/List name/i)).toHaveAttribute(
      "placeholder",
      "Work, Groceries, Ideas...",
    );

    expect(screen.getByTestId("cancel-button")).toBeInTheDocument();
    expect(screen.getByTestId("create-button")).toBeInTheDocument();
  });

  it("disables Create button when title is empty or whitespace only", async () => {
    renderNewListPage();
    await waitForFormReady();

    const createBtn = screen.getByTestId("create-button");
    expect(createBtn).toBeDisabled();

    const titleInput = screen.getByLabelText(/List name/i);

    await userEvent.type(titleInput, "   ");
    await waitFor(() => expect(createBtn).toBeDisabled(), { timeout: 2000 });

    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "My List");
    await waitFor(() => expect(createBtn).not.toBeDisabled(), {
      timeout: 2000,
    });
  });

  it("shows loading state during creation", async () => {
    server.use(listCreateDelayedHandler);

    const { router } = renderNewListPage();
    await waitForFormReady();

    await fillForm("Weekend Plans");

    const form = screen.getByTestId("create-list-form");
    fireEvent.submit(form);

    await waitFor(
      () => {
        expect(screen.getByText("Creating...")).toBeInTheDocument();
      },
      { timeout: 1500 },
    );

    const createButton = screen.getByTestId("create-button");
    expect(createButton).toBeDisabled();
    expect(createButton).toHaveTextContent("Creating...");
    expect(createButton.querySelector("svg.animate-spin")).toBeInTheDocument();

    expect(screen.getByTestId("cancel-button")).toBeDisabled();

    expect(router.state.location.pathname).toBe("/lists/new");
  });

  it("creates list, optimistically updates, and navigates on success", async () => {
    const initialCount = getMockLists().length;
    const { router } = renderNewListPage();
    await waitForFormReady();

    await fillForm("Travel Bucket List");

    const form = screen.getByTestId("create-list-form");
    fireEvent.submit(form);

    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe("/lists");
      },
      { timeout: 3000 },
    );

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
    renderNewListPage();
    await waitForFormReady();

    await fillForm("Bad List");

    const form = screen.getByTestId("create-list-form");
    fireEvent.submit(form);

    await waitFor(
      () => {
        expect(getMockLists()).toHaveLength(initialCount);
      },
      { timeout: 3000 },
    );
  });

  it("navigates back to /lists on Cancel button click", async () => {
    const { router } = renderNewListPage();
    await waitForFormReady();

    await userEvent.click(screen.getByTestId("cancel-button"));

    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe("/lists");
      },
      { timeout: 2000 },
    );
  });
});
