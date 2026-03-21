// __tests__/utils/test-helpers.tsx

import { render, type RenderResult } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
  type Router,
} from "@tanstack/react-router";
import { router as appRouter, type RouterContext } from "@/router";
import { trpcClient, TRPCProvider } from "@/trpc";
import type { QueryClient as QCType } from "@tanstack/react-query";
import { BannerProvider } from "@steel-cut/steel-lib";

// ────────────────────────────────────────────────
// Create a fresh QueryClient for tests (no retries, no stale time)
// ────────────────────────────────────────────────
export function createTestQueryClient(): QCType {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function renderIsolated(ui: React.ReactNode) {
  const queryClient = createTestQueryClient();
  return render(
    <BannerProvider>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
      </TRPCProvider>
    </BannerProvider>,
  );
}

// ────────────────────────────────────────────────
// Type for the router returned by renderWithProviders
// ────────────────────────────────────────────────
type RenderWithProvidersResult = RenderResult & {
  router: Router<typeof appRouter.routeTree>;
};

/**
 * Renders the app with full providers (TRPC + QueryClient + Router)
 * The router will render the component matching the initialEntries path.
 *
 * Note: Do NOT pass a custom ui/component here — let the router handle it.
 *       If you need to test an isolated component, create a separate helper.
 */
export function renderWithProviders({
  initialEntries = ["/"],
  queryClient = createTestQueryClient(),
}: {
  initialEntries?: string[];
  queryClient?: QueryClient;
} = {}): RenderWithProvidersResult {
  const history = createMemoryHistory({ initialEntries });

  const testRouter = createRouter({
    routeTree: appRouter.routeTree,
    history,
    defaultPreload: "intent",
    context: { queryClient } satisfies RouterContext,
  });

  const wrapped = (
    <BannerProvider>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={testRouter} />
        </QueryClientProvider>
      </TRPCProvider>
    </BannerProvider>
  );

  const renderResult = render(wrapped);

  return {
    ...renderResult,
    router: testRouter,
  };
}

/**
 * Convenience helper for rendering the VerifyEmail page with a token
 */
export function renderVerifyEmail(token: string) {
  const url = `/verify-email?token=${encodeURIComponent(token)}`;
  return renderWithProviders({ initialEntries: [url] });
}
