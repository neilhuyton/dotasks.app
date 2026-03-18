import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/trpc";
import { useRealtimeSubscription } from "@steel-cut/steel-lib";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";

export function useTaskRealtime() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  const channelName = userId ? `task:user:${userId}` : "task:placeholder";
  const filter = userId ? `userId=eq.${userId}` : undefined;
  const enabled = !!userId;

  useRealtimeSubscription({
    supabase,
    subscribeToAuthChange: (cb) => useAuthStore.subscribe((state) => cb(state.session)),
    channelName,
    table: "task",
    event: "*",
    filter,
    enabled,
    onPayload: () => {
      queryClient.invalidateQueries({ queryKey: trpc.task.getByList.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.list.getAll.queryKey() });
    },
  });
}