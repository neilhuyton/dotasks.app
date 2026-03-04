// src/shared/hooks/useTaskRealtime.ts

import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/trpc";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

interface TaskRealtimeProps {
  listId: string | null | undefined;
}

export function useTaskRealtime({ listId }: TaskRealtimeProps) {
  const queryClient = useQueryClient();

  useRealtimeSubscription({
    channelName: listId ? `tasks-for-list:${listId}` : "noop-task-subscription",
    table: "task",
    event: "*",
    enabled: !!listId,
    onPayload: () => {
      if (!listId) return;

      queryClient.invalidateQueries({
        queryKey: trpc.list.getOne.queryKey({ id: listId }),
        refetchType: "active",
      });

      queryClient.invalidateQueries({
        queryKey: trpc.task.getByList.queryKey({ listId }),
        refetchType: "active",
      });

      queryClient.invalidateQueries({
        queryKey: trpc.list.getAll.queryKey(),
        refetchType: "active",
      });
    },
    autoResubscribe: true,
  });

  return null;
}