// src/hooks/useSupabaseRealtime.ts

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useSupabaseRealtime({
  table, // MUST be lowercase, e.g. 'todolist'
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

  useEffect(() => {
    const channelName = `realtime-changes:${table}`;

    console.log(
      `Attempting to subscribe to table: "${table}" (lowercase required)`,
    );

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event,
          schema: "public",
          table, // lowercase here
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          console.log(
            `🔥 REALTIME EVENT on "${table}":`,
            payload.new || payload.old || payload,
          );
          // Force refetch (better than invalidate with staleTime: Infinity)
          if (Array.isArray(queryKeys[0])) {
            (queryKeys as string[][]).forEach((key) =>
              queryClient.refetchQueries({ queryKey: key, exact: false }),
            );
          } else {
            queryClient.refetchQueries({
              queryKey: queryKeys as string[],
              exact: false,
            });
          }
        },
      )
      .subscribe((status, err) => {
        console.log(`Subscription status for "${table}": ${status}`);
        if (err) console.error("Subscription error:", err.message);
      });

    return () => {
      supabase.removeChannel(channel);
      console.log(`Unsubscribed from "${table}"`);
    };
  }, [table, JSON.stringify(queryKeys), event, filter, queryClient]);
}
