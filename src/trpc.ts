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

// ─── Custom link: refresh Supabase session on 401/UNAUTHORIZED and retry ──────

const refreshOn401Link = (): TRPCLink<AppRouter> => {
  // The outer function receives runtime but we don't need it here
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
              console.warn("[tRPC] 401/UNAUTHORIZED → refreshing Supabase session");

              supabase.auth
                .refreshSession()
                .then(({ data, error: refreshError }) => {
                  if (refreshError || !data.session) {
                    console.error("[tRPC] Refresh failed:", refreshError);
                    observer.error(err); // forward original error
                    return;
                  }

                  console.log("[tRPC] Session refreshed → retrying");

                  // Retry the operation (headers fn will pick up fresh token)
                  const retrySub = next(op).subscribe({
                    next: (res) => observer.next(res),
                    error: (e) => observer.error(e),
                    complete: () => observer.complete(),
                  });

                  // Cleanup retry
                  return () => retrySub.unsubscribe();
                })
                .catch((refreshErr) => {
                  console.error("[tRPC] Refresh promise rejected:", refreshErr);
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

        // Cleanup original subscription
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
          const { data: { session }, error } = await supabase.auth.getSession();

          if (error) {
            console.warn("[tRPC headers] getSession failed:", error);
            return {};
          }

          const token = session?.access_token;

          // Optional: debug token expiry (remove/comment in production)
          if (token) {
            try {
              const payload = JSON.parse(atob(token.split(".")[1]));
              const exp = payload.exp as number | undefined;
              if (exp) {
                const expDate = new Date(exp * 1000);
                console.debug(
                  `[tRPC headers] Token expires at: ${expDate.toLocaleString()}`,
                );
              }
            } catch {
              // malformed token – ignore
            }
          }

          return token ? { Authorization: `Bearer ${token}` } : {};
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