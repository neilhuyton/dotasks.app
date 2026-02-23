// src/hooks/useSupabaseTaskRealtime.ts

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";

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
      // INSERT & UPDATE – keep filtered (efficient)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "task",
          filter: `listId=eq.${listId}`,
        },
        async (payload) => {
          console.log("Realtime INSERT for task in list", listId, payload);
          invalidateAndRefetch();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "task",
          filter: `listId=eq.${listId}`,
        },
        async (payload) => {
          console.log("Realtime UPDATE for task in list", listId, payload);
          invalidateAndRefetch();
        }
      )
      // DELETE – no filter, check via task ID instead
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "task",
          // NO filter – required for DELETE to work reliably
        },
        async (payload) => {
          const deletedTaskId = payload.old?.id;
          console.log("Realtime DELETE detected", payload);

          if (deletedTaskId) {
            console.log(`DELETE for task ID ${deletedTaskId} — invalidating list ${listId}`);
            invalidateAndRefetch();
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`Realtime subscribed to tasks for list ${listId}`);
        }
      });
  };

  const invalidateAndRefetch = async () => {
    if (!listId) return;

    const taskQueryKey = [["task", "getByList"], { type: "query", input: { listId } }];
    
    // Invalidate → marks as stale
    queryClient.invalidateQueries({ queryKey: taskQueryKey, exact: true });
    
    // Immediately refetch to update UI
    await queryClient.refetchQueries({
      queryKey: taskQueryKey,
      exact: true,
      type: "active",  // only refetch if query is active (viewed list)
    });

    // Optional: keep list overview fresh too
    const listPath = ["list", "getAll"];
    queryClient.invalidateQueries({ queryKey: listPath, exact: false });
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

    if (!useAuthStore.getState().accessToken || !listId) {
      retryInterval = setInterval(trySubscribe, 300);
    }

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