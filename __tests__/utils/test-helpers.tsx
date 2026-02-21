// __tests__/utils/test-helpers.tsx

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpLink } from "@trpc/client";
import { trpc } from "@/trpc"; // adjust path if needed
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { fireEvent } from "@testing-library/react";

// ────────────────────────────────────────────────
// Render wrapper
// ────────────────────────────────────────────────

interface RenderOptions {
  initialPath: string;
  routeTree: Parameters<typeof createRouter>[0]["routeTree"];
}

export function renderWithTrpcRouter({
  initialPath,
  routeTree,
}: RenderOptions) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  const trpcClient = trpc.createClient({
    links: [httpLink({ url: "http://localhost:8888/trpc" })],
  });

  const history = createMemoryHistory({ initialEntries: [initialPath] });

  const router = createRouter({
    routeTree,
    history,
    context: { queryClient, trpcClient },
    defaultPreload: "intent",
  });

  render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </trpc.Provider>,
  );

  return { history, router, queryClient, trpcClient };
}

// ────────────────────────────────────────────────
// Message assertions
// ────────────────────────────────────────────────

export async function expectSuccessMessage(
  testId: string,
  text: string | RegExp,
  className: string = "text-green-500",
  timeout: number = 5000,
): Promise<void> {
  const message = await waitFor(() => screen.getByTestId(testId), { timeout });
  expect(message).toBeInTheDocument();
  expect(message).toHaveTextContent(text);
  expect(message).toHaveClass(className);
}

export async function expectErrorMessage(
  testId: string,
  text: string | RegExp,
  className: string = "text-red-500",
  timeout: number = 5000,
): Promise<void> {
  const message = await waitFor(() => screen.getByTestId(testId), { timeout });
  expect(message).toBeInTheDocument();
  expect(message).toHaveTextContent(text);
  expect(message).toHaveClass(className);
}

// ────────────────────────────────────────────────
// Form helpers
// ────────────────────────────────────────────────

interface FillAndSubmitOptions {
  emailTestId?: string;
  passwordTestId?: string;
  formTestId: string;
  email?: string;
  password?: string;
}

export async function fillAndSubmitForm({
  emailTestId,
  passwordTestId,
  formTestId,
  email = "",
  password = "",
}: FillAndSubmitOptions): Promise<void> {
  if (email && emailTestId) {
    const input = screen.getByTestId(emailTestId);
    await userEvent.clear(input);
    await userEvent.type(input, email);
  }

  if (password && passwordTestId) {
    const input = screen.getByTestId(passwordTestId);
    await userEvent.clear(input);
    await userEvent.type(input, password);
  }

  const form = screen.getByTestId(formTestId);
  fireEvent.submit(form);
}
