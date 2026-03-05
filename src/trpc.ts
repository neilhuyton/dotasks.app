// src/trpc.ts

import { createTRPCClient, httpBatchLink, httpLink } from "@trpc/client";
import {
  createTRPCContext,
  createTRPCOptionsProxy,
} from "@trpc/tanstack-react-query";
import type { AppRouter } from "../server/trpc";

import { supabase } from "@/lib/supabase";
import { getQueryClient } from "@/queryClient";
import { useAuthStore } from "@/shared/store/authStore";

export function createTrpcClient() {
  const isTest = import.meta.env.MODE === "test";
  const baseUrl = isTest ? "http://localhost:8888" : "";

  return createTRPCClient<AppRouter>({
    links: [
      isTest
        ? httpLink({
            url: `${baseUrl}/trpc`,
            async headers() {
              const projectRef = new URL(
                import.meta.env.VITE_SUPABASE_URL,
              ).hostname.split(".")[0];
              const storageKey = `sb-${projectRef}-auth-token`;

              let token: string | null = null;

              // 1. Fast synchronous read from localStorage (most reliable path)
              const raw = localStorage.getItem(storageKey);
              if (raw) {
                try {
                  const parsed = JSON.parse(raw);
                  token = parsed?.access_token ?? null;
                  if (token) {
                    console.log(
                      "[tRPC headers] Got token from localStorage (sync)",
                    );
                  }
                } catch (err) {
                  console.warn(
                    "[tRPC headers] localStorage parse failed:",
                    err,
                  );
                }
              }

              // 2. Fallback: async getSession() if storage didn't have it
              if (!token) {
                const {
                  data: { session },
                } = await supabase.auth.getSession();
                token = session?.access_token ?? null;
                if (token) {
                  console.log(
                    "[tRPC headers] Got token from getSession() fallback",
                  );
                }
              }

              // 3. Extra fallback: force refresh if we think user is logged in
              if (!token && useAuthStore.getState().user?.id) {
                console.log(
                  "[tRPC headers] No token → attempting refreshSession",
                );
                const { data } = await supabase.auth.refreshSession();
                token = data.session?.access_token ?? null;
                if (token) {
                  console.log("[tRPC headers] Got token after forced refresh");
                }
              }

              console.log("[tRPC headers] final token present?", !!token);

              return token ? { Authorization: `Bearer ${token}` } : {};
            },
          })
        : httpBatchLink({
            url: `${baseUrl}/trpc`,
            async headers() {
              const projectRef = new URL(
                import.meta.env.VITE_SUPABASE_URL,
              ).hostname.split(".")[0];
              const storageKey = `sb-${projectRef}-auth-token`;

              let token: string | null = null;

              // 1. Fast synchronous read from localStorage (most reliable path)
              const raw = localStorage.getItem(storageKey);
              if (raw) {
                try {
                  const parsed = JSON.parse(raw);
                  token = parsed?.access_token ?? null;
                  if (token) {
                    console.log(
                      "[tRPC headers] Got token from localStorage (sync)",
                    );
                  }
                } catch (err) {
                  console.warn(
                    "[tRPC headers] localStorage parse failed:",
                    err,
                  );
                }
              }

              // 2. Fallback: async getSession() if storage didn't have it
              if (!token) {
                const {
                  data: { session },
                } = await supabase.auth.getSession();
                token = session?.access_token ?? null;
                if (token) {
                  console.log(
                    "[tRPC headers] Got token from getSession() fallback",
                  );
                }
              }

              // 3. Extra fallback: force refresh if we think user is logged in
              if (!token && useAuthStore.getState().user?.id) {
                console.log(
                  "[tRPC headers] No token → attempting refreshSession",
                );
                const { data } = await supabase.auth.refreshSession();
                token = data.session?.access_token ?? null;
                if (token) {
                  console.log("[tRPC headers] Got token after forced refresh");
                }
              }

              console.log("[tRPC headers] final token present?", !!token);

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
