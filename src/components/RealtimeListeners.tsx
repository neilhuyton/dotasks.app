// src/components/RealtimeListeners.tsx

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getQueryKey } from "@trpc/react-query";
import { trpc } from "@/trpc";

export function RealtimeListeners() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("todolist-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "todolist",
        },
        () => {
          console.log(
            "✅ Realtime signal received → starting background refetch",
          );

          // This does exactly what you want:
          // - Keeps current data visible
          // - Fetches new data silently in background
          // - Updates cache when done
          // - No spinner, no invalidate, no stale flag
          const listQueryKey = getQueryKey(
            trpc.list.getAll,
            undefined,
            "query",
          );

          queryClient.refetchQueries({
            queryKey: listQueryKey,
            exact: false,
            type: "active",
          });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Realtime listener active for TodoList changes");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return null;
}
