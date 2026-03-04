// src/shared/hooks/useListRealtime.ts

import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/trpc";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

interface RealtimeHookProps {
  table: string;
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
  filter?: string;
}

export function useListRealtime({
  table,
  event = "*",
  filter,
}: RealtimeHookProps) {
  const queryClient = useQueryClient();

  useRealtimeSubscription({
    channelName: `public:${table}`,
    table,
    event,
    filter,
    enabled: true,
    onPayload: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.list.getAll.queryKey(),
        refetchType: "active",
      });
    },
    autoResubscribe: true,
  });

  return null;
}