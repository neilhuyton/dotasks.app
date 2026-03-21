import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/trpc";
import { useRealtimeSubscription } from "@steel-cut/steel-lib";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/trpc";

type RouterOutput = inferRouterOutputs<AppRouter>;
type Task = RouterOutput["task"]["getByList"][number];

export function useTaskRealtime() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  const channelName = userId ? `task:user:${userId}` : "task:placeholder";
  const filter = userId ? `userId=eq.${userId}` : undefined;
  const enabled = !!userId;

  useRealtimeSubscription({
    supabase,
    subscribeToAuthChange: (cb) =>
      useAuthStore.subscribe((state) => cb(state.session)),
    channelName,
    table: "task",
    event: "*",
    filter,
    enabled,
    onPayload: (payload) => {
      let listId: string | undefined;

      if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
        listId = (payload.new as Task | undefined)?.listId;
      } else if (payload.eventType === "DELETE") {
        listId = (payload.old as Task | undefined)?.listId;
      }

      if (listId) {
        queryClient.invalidateQueries({
          queryKey: trpc.task.getByList.queryKey({ listId }),
        });
      }

      queryClient.invalidateQueries({
        queryKey: trpc.list.getAll.queryKey(),
      });
    },
  });
}
