import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/trpc";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { useAuthStore } from "@/store/authStore";

export function useTaskRealtime() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  useRealtimeSubscription({
    channelName: userId ? `task:user:${userId}` : "task:placeholder",
    table: "task",
    event: "*",
    filter: userId ? `userId=eq.${userId}` : undefined,
    enabled: !!userId,
    onPayload: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.task.getByList.queryKey(),
        refetchType: "active",
      });

      queryClient.invalidateQueries({
        queryKey: trpc.list.getAll.queryKey(),
        refetchType: "active",
      });

      queryClient.invalidateQueries({
        queryKey: trpc.list.getOne.queryKey(),
        refetchType: "active",
      });
    },
  });
}
