// src/client.ts
import { createTRPCClient, httpBatchLink, TRPCClientError } from "@trpc/client";
import { tokenRefreshLink } from "trpc-token-refresh-link";
import type { AppRouter } from "../server/trpc";
import { vanillaTrpc } from "./trpc-vanilla";
import { useAuthStore } from "./store/authStore";
import { queryClient } from "./queryClient";
import { router } from "./router/router";

let activeRefreshPromise: Promise<void> | null = null;

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    tokenRefreshLink({
      tokenRefreshNeeded: () => {
        const { token, refreshToken } = useAuthStore.getState();
        if (!token || !refreshToken) return false;

        const now = Date.now();

        try {
          const [, payloadBase64] = token.split(".");
          const payload = JSON.parse(
            atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/")),
          );
          const exp = payload.exp * 1000;

          return exp - now < 60_000; // refresh if <60s left
        } catch {
          return false;
        }
      },

      fetchAccessToken: async (): Promise<void> => {
        const state = useAuthStore.getState();
        const { refreshToken, userId } = state;

        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        if (!userId) {
          throw new Error("No userId available");
        }

        if (activeRefreshPromise) {
          await activeRefreshPromise;
          return;
        }

        activeRefreshPromise = (async () => {
          try {
            const result = await vanillaTrpc.refreshToken.refresh.mutate({
              refreshToken,
            });

            if (!result.accessToken) {
              throw new Error("Server did not return accessToken");
            }

            const newRefresh = result.refreshToken;

            state.login(userId, result.accessToken, newRefresh ?? refreshToken);
          } catch (err: unknown) {
            const trpcErr = err instanceof TRPCClientError ? err : null;

            const code = trpcErr?.data?.code ?? "UNKNOWN";
            const message = trpcErr?.message ?? "Unknown refresh error";

            console.error("[Refresh FAILED]", {
              code,
              message,
              fullError: err,
            });

            if (code === "UNAUTHORIZED") {
              console.warn(
                "[Refresh] Refresh token invalid/expired → logging out",
              );
              state.logout();
              queryClient.clear();
              queryClient.cancelQueries();
              await router.invalidate();
              router.navigate({ to: "/login", replace: true });
            }

            throw err;
          } finally {
            activeRefreshPromise = null;
          }
        })();

        await activeRefreshPromise;
      },
    }),

    httpBatchLink({
      url: "/trpc",

      headers: () => {
        const { token } = useAuthStore.getState();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});
