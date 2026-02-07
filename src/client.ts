// src/client.ts
import { QueryClient } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
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
    httpBatchLink({
      url: "/trpc",
      fetch: async (url, options) => {
        const { token, refreshToken, userId, login, logout } =
          useAuthStore.getState();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        let body: string;
        if (url.toString().includes("batch=1")) {
          try {
            let parsedBody: unknown[] = [];
            if (options?.body && typeof options.body === "string") {
              parsedBody = JSON.parse(options.body);
              if (!Array.isArray(parsedBody)) {
                parsedBody = [parsedBody];
              }
            }
            const correctedBody = parsedBody.map((item) => {
              if (item && typeof item === "object" && "0" in item) {
                return item["0"];
              }
              return item;
            });
            const transformedBody: Record<number, unknown> = {};
            correctedBody.forEach((item, index) => {
              transformedBody[index] = item;
            });
            body = JSON.stringify(transformedBody);
          } catch {
            throw new Error("Invalid request body format");
          }
        } else {
          try {
            let parsedBody: unknown = {};
            if (options?.body && typeof options.body === "string") {
              parsedBody = JSON.parse(options.body);
              if (
                parsedBody &&
                typeof parsedBody === "object" &&
                "0" in parsedBody
              ) {
                parsedBody = parsedBody["0"];
              }
            }
            body = JSON.stringify(parsedBody);
          } catch {
            throw new Error("Invalid request body format");
          }
        }

        const fetchOptions = {
          ...options,
          method: "POST",
          headers,
          body,
          signal: options?.signal,
        };

        const response = await fetch(url, fetchOptions);
        const responseData: TRPCResponse = await response.json();

        // Check for tRPC UNAUTHORIZED errors in the response body
        const isUnauthorized =
          Array.isArray(responseData) &&
          responseData.some(
            (item) =>
              item.error &&
              (item.error.data?.code === "UNAUTHORIZED" ||
                item.error.message.includes("Unauthorized"))
          );

        if (isUnauthorized && refreshToken && userId) {
          try {
            const refreshResponse =
              await trpcClient.refreshToken.refresh.mutate({
                refreshToken,
              });
            login(userId, refreshResponse.token, refreshResponse.refreshToken);
            const newHeaders = {
              ...headers,
              Authorization: `Bearer ${refreshResponse.token}`,
            };
            return await fetch(url, { ...fetchOptions, headers: newHeaders });
          } catch {
            logout();
            throw redirect({ to: "/login" });
          }
        }

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
