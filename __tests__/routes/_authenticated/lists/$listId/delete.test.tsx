// __tests__/routes/_authenticated/lists/$listId/delete.test.tsx

import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  vi,
} from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { server } from "../../../../../__mocks__/server";
import { renderWithProviders } from "../../../../utils/test-helpers";

import {
  resetMockLists,
  prepareDetailPageTestList,
  listGetAllHandler,
  listGetOneDetailPagePreset,
  getMockLists,
  listDeleteHandler,
} from "../../../../../__mocks__/handlers/lists";

import { trpcMsw } from "../../../../../__mocks__/trpcMsw";
import { TRPCError } from "@trpc/server";
import { useAuthStore } from "@/shared/store/authStore";

describe("Delete List Confirmation Page (/_authenticated/lists/$listId/delete)", () => {
  const TEST_LIST_ID = "list-abc-123";
  const LIST_TITLE = "My Important Projects";

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "bypass" }); // ← Silences all unmatched warnings (including Supabase)

    server.use(
      http.get("https://*.supabase.co/realtime/v1/websocket", () => {
        return new HttpResponse(null, { status: 400 });
      }),
    );
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
      listDeleteHandler,
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
    vi.restoreAllMocks();
  });

  async function renderDeletePage(
    listId = TEST_LIST_ID,
    options: { waitForContent?: boolean } = { waitForContent: true },
  ) {
    const result = renderWithProviders({
      initialEntries: [`/lists/${listId}/delete`],
    });

    if (options.waitForContent) {
      await screen.findByRole("heading", {
        name: new RegExp(`Delete "${LIST_TITLE}"`, "i"),
      }, { timeout: 5000 });
    }

    return result;
  }

  it("renders confirmation heading, warning text and action buttons", async () => {
    await renderDeletePage();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: new RegExp(`Delete "${LIST_TITLE}"`, "i"),
      }),
    ).toBeInTheDocument();

    expect(screen.getByText(/This action cannot be undone/i)).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel and return to lists/i })).toBeInTheDocument();
    expect(screen.getByTestId("delete-confirm-button")).toBeInTheDocument();
  });


  it("rolls back optimistic delete when mutation fails", async () => {
    server.use(
      trpcMsw.list.delete.mutation(() => {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete list",
        });
      }),
    );

    await renderDeletePage();

    const initialCount = getMockLists().length;

    const form = screen.getByTestId("delete-confirm-form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(getMockLists()).toHaveLength(initialCount);
      expect(getMockLists().some((l) => l.id === TEST_LIST_ID)).toBe(true);
    }, { timeout: 8000 });

    expect(screen.getByTestId("delete-confirm-button")).toBeInTheDocument();
  });

  it("navigates back to list detail when clicking Cancel button", async () => {
    const { router } = await renderDeletePage();

    const navigateSpy = vi.spyOn(router, "navigate");

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/lists/$listId",
        params: { listId: TEST_LIST_ID },
        replace: true,
      }),
    );
  });

  it("navigates back to list detail when clicking back arrow icon", async () => {
    const { router } = await renderDeletePage();

    const navigateSpy = vi.spyOn(router, "navigate");

    await userEvent.click(screen.getByRole("button", { name: /Cancel and return to lists/i }));

    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/lists/$listId",
        params: { listId: TEST_LIST_ID },
        replace: true,
      }),
    );
  });
});