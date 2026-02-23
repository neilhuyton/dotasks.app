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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task",
          filter: `listId=eq.${listId}`,
        },
        async () => {
          console.log(`Realtime change detected for tasks in list ${listId}`);

          // Invalidate & refetch the specific task list query
          const taskQueryKey = [["task", "getByList"], { type: "query", input: { listId } }];
          queryClient.invalidateQueries({ queryKey: taskQueryKey, exact: true });
          await queryClient.refetchQueries({
            queryKey: taskQueryKey,
            exact: true,
            type: "all",
          });

          // Also invalidate broader task queries as fallback
          queryClient.invalidateQueries({ queryKey: ["task"] });

          // Optional: refresh list overview if task changes affect list metadata
          const listPath = ["list", "getAll"];
          queryClient.invalidateQueries({ queryKey: listPath, exact: false });
          await queryClient.refetchQueries({
            queryKey: listPath,
            exact: false,
            type: "all",
          });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`Realtime subscribed to tasks for list ${listId}`);
        }
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