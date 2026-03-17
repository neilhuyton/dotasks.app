import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/trpc";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { useAuthStore } from "@/store/authStore";

export function useListRealtime() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  useRealtimeSubscription({
    channelName: userId ? `list:user:${userId}` : "list:placeholder",
    table: "list",
    event: "*",
    filter: userId ? `userId=eq.${userId}` : undefined,
    enabled: !!userId,
    onPayload: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.list.getAll.queryKey(),
        refetchType: "active",
      });
    },
  });
}
