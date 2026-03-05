// src/trpc.ts

import { createTRPCClient, httpLink } from "@trpc/client";
import type { TRPCLink } from "@trpc/client";
import { TRPCClientError } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import {
  createTRPCContext,
  createTRPCOptionsProxy,
} from "@trpc/tanstack-react-query";
import type { AppRouter } from "../server/trpc";

import { supabase } from "@/lib/supabase";
import { getQueryClient } from "@/queryClient";

const refreshOn401Link = (): TRPCLink<AppRouter> => {
  return () =>
    ({ op, next }) =>
      observable((observer) => {
        const subscription = next(op).subscribe({
          next(result) {
            observer.next(result);
          },
          error(err) {
            if (
              err instanceof TRPCClientError &&
              (err.data?.code === "UNAUTHORIZED" ||
                err.message?.includes("UNAUTHORIZED") ||
                err.data?.httpStatus === 401)
            ) {
              supabase.auth
                .refreshSession()
                .then(({ data, error: refreshError }) => {
                  if (refreshError || !data.session) {
                    observer.error(err);
                    return;
                  }

                  const retrySub = next(op).subscribe({
                    next: (res) => observer.next(res),
                    error: (e) => observer.error(e),
                    complete: () => observer.complete(),
                  });

                  return () => retrySub.unsubscribe();
                })
                .catch(() => {
                  observer.error(err);
                });
            } else {
              observer.error(err);
            }
          },
          complete() {
            observer.complete();
          },
        });

        return () => subscription.unsubscribe();
      });
};

export function createTrpcClient() {
  const isTest = import.meta.env.MODE === "test";
  const baseUrl = isTest ? "http://localhost:8888" : "";

  return createTRPCClient<AppRouter>({
    links: [
      refreshOn401Link(),

      httpLink({
        url: `${baseUrl}/trpc`,

        async headers() {
          const sessionPromise = supabase.auth.getSession();

          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("getSession timeout")), 5000)
          );

          try {
            const result = await Promise.race([sessionPromise, timeoutPromise]);
            const token = result.data?.session?.access_token;
            return token ? { Authorization: `Bearer ${token}` } : {};
          } catch {
            return {};
          }
        },
      }),
    ],
  });
}

export const trpcClient = createTrpcClient();

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient: getQueryClient(),
});

export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();