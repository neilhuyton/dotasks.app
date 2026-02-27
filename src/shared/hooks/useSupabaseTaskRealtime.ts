// src/shared/hooks/useSupabaseTaskRealtime.ts

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/shared/lib/supabase";
import { useAuthStore } from "@/shared/store/authStore";

export function useSupabaseTaskRealtime({
  listId,
}: {
  listId: string | null | undefined;
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
    if (!accessToken || !listId) return;

    supabase.realtime.setAuth(accessToken);

    const channelName = `realtime-tasks:${listId}`;

    channelRef.current = supabase
      .channel(channelName)
      // INSERT & UPDATE – filtered by listId for efficiency
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "task",
          filter: `listId=eq.${listId}`,
        },
        () => {
          invalidateAndRefetch();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "task",
          filter: `listId=eq.${listId}`,
        },
        () => {
          invalidateAndRefetch();
        },
      )
      // DELETE – no filter (required for DELETE events), check manually
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "task",
        },
        (payload) => {
          const deletedTaskId = payload.old?.id;
          if (deletedTaskId) {
            invalidateAndRefetch();
          }
        },
      )
      .subscribe();
  };

  const invalidateAndRefetch = async () => {
    if (!listId) return;

    const taskQueryKey = [
      ["task", "getByList"],
      { type: "query", input: { listId } },
    ];

    // Mark as stale
    queryClient.invalidateQueries({ queryKey: taskQueryKey, exact: true });

    // Refetch only if the query is currently active (user is viewing this list)
    await queryClient.refetchQueries({
      queryKey: taskQueryKey,
      exact: true,
      type: "active",
    });

    // Also keep the list overview somewhat fresh
    queryClient.invalidateQueries({
      queryKey: ["list", "getAll"],
      exact: false,
    });
  };

  useEffect(() => {
    let retryInterval: NodeJS.Timeout | null = null;

    const trySubscribe = () => {
      const token = useAuthStore.getState().accessToken;
      if (token && listId) {
        subscribe();
        if (retryInterval) {
          clearInterval(retryInterval);
          retryInterval = null;
        }
      }
    };

    trySubscribe();

    // Retry subscription if auth or listId isn't ready yet
    if (!useAuthStore.getState().accessToken || !listId) {
      retryInterval = setInterval(trySubscribe, 300);
    }

    // React to auth state changes
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.accessToken && listId) {
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
  }, [listId, queryClient]);

  return null;
}
