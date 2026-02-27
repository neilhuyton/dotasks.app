// src/shared/hooks/useSupabaseRealtime.ts

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/shared/lib/supabase";
import { useAuthStore } from "@/shared/store/authStore";

export function useSupabaseRealtime({
  table,
  queryKeys,
  event = "*",
  filter,
}: {
  table: string;
  queryKeys: string[] | string[][];
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
  filter?: string;
}) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const cleanupChannel = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  const subscribe = () => {
    cleanupChannel();

    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) return;

    supabase.realtime.setAuth(accessToken);

    const channelName = `realtime-changes:${table}`;

    channelRef.current = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event,
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        },
        async () => {
          // Invalidate & force refetch the list (tRPC path prefix)
          const listPath = ["list", "getAll"];
          queryClient.invalidateQueries({ queryKey: listPath, exact: false });
          await queryClient.refetchQueries({
            queryKey: listPath,
            exact: false,
            type: "all",
          });

          // Also try the full tRPC query key shape (more precise)
          const fullTrpcKey = [["list", "getAll"], { type: "query" }];
          await queryClient.refetchQueries({
            queryKey: fullTrpcKey,
            exact: true,
            type: "all",
          });

          // Handle any specific/detail keys passed to the hook
          const specificKeys = Array.isArray(queryKeys[0])
            ? (queryKeys as string[][])
            : [queryKeys as string[]];

          for (const key of specificKeys) {
            queryClient.invalidateQueries({ queryKey: key, exact: true });
            await queryClient.refetchQueries({
              queryKey: key,
              exact: true,
              type: "all",
            });
          }
        },
      )
      .subscribe();
  };

  useEffect(() => {
    let retryInterval: NodeJS.Timeout | null = null;

    const trySubscribe = () => {
      const token = useAuthStore.getState().accessToken;
      if (token) {
        subscribe();
        if (retryInterval) {
          clearInterval(retryInterval);
          retryInterval = null;
        }
      }
    };

    trySubscribe();

    if (!useAuthStore.getState().accessToken) {
      retryInterval = setInterval(trySubscribe, 300);
    }

    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.accessToken) {
        subscribe();
      } else {
        cleanupChannel();
      }
    });

    return () => {
      if (retryInterval) clearInterval(retryInterval);
      cleanupChannel();
      unsubscribe();
    };
  }, [table, JSON.stringify(queryKeys), event, filter, queryClient]);

  return null;
}
