// __tests__/utils/renderWithProviders.tsx

import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "../../src/trpc";
import { createTestQueryClient, createTestTrpcClient } from "./trpc";
import { act } from "react";
import type { ReactNode } from "react";

type RenderWithTRPCOptions = RenderOptions & {
  trpcClient?: ReturnType<typeof createTestTrpcClient>;
  queryClient?: QueryClient;
};

export async function renderWithProviders(
  ui: ReactNode,
  options: RenderWithTRPCOptions = {},
) {
  const {
    trpcClient = createTestTrpcClient(),
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = options;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );

  let rendered;
  await act(async () => {
    rendered = render(ui, { wrapper, ...renderOptions });
  });

  // @ts-expect-error - rendered is definitely assigned after act
  return { ...rendered, queryClient, trpcClient };
}
