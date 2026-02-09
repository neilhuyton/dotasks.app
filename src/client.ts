// src/client.ts
import { QueryClient } from "@tanstack/react-query";
import { httpLink } from "@trpc/client";
import { redirect } from "@tanstack/react-router";
import { trpc } from "./trpc";
import { useAuthStore } from "./store/authStore";

// Define tRPC response shape
type TRPCResponse = {
  error?: {
    message: string;
    data?: { code: string };
  };
}[];

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: "/trpc",

      fetch: async (url, options) => {
        const { token, refreshToken, userId, login, logout } =
          useAuthStore.getState();

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        // Body handling for single requests (httpLink)
        let body = options?.body;

        // Light safety check in case of unexpected format
        if (typeof body === "string") {
          try {
            const parsed = JSON.parse(body);
            if (parsed && typeof parsed === "object" && "0" in parsed) {
              body = JSON.stringify(parsed["0"]);
            }
          } catch {
            // ignore parse errors
          }
        }

        const fetchOptions = {
          ...options,
          method: "POST",
          headers,
          body,
          signal: options?.signal,
        };

        let response = await fetch(url, fetchOptions);
        let responseData: TRPCResponse = await response.json();

        // Check for unauthorized in response
        const isUnauthorized =
          Array.isArray(responseData) &&
          responseData.some(
            (item) =>
              item.error &&
              (item.error.data?.code === "UNAUTHORIZED" ||
                item.error.message?.includes("Unauthorized") ||
                item.error.message?.includes("expired"))
          );

        if (isUnauthorized && refreshToken && userId) {
          try {
            const refreshResponse = await trpcClient.refreshToken.refresh.mutate({
              refreshToken,
            });

            // Use the actual fields from your response shape
            const newAccessToken = refreshResponse.accessToken;

            // Update store
            login(userId, newAccessToken, refreshResponse.refreshToken);

            // Retry with new access token
            const newHeaders = {
              ...headers,
              Authorization: `Bearer ${newAccessToken}`,
            };

            response = await fetch(url, { ...fetchOptions, headers: newHeaders });
            responseData = await response.json();
          } catch {
            logout();
            throw redirect({ to: "/login" });
          }
        }

        // Final logout check if still unauthorized
        if (isUnauthorized) {
          logout();
          throw redirect({ to: "/login" });
        }

        return new Response(JSON.stringify(responseData), {
          status: response.status,
          headers: response.headers,
        });
      },
    }),
  ],
});