// src/components/RealtimeListeners.tsx

import { getQueryKey } from "@trpc/react-query";
import { trpc } from "@/trpc";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";

export function RealtimeListeners() {
  useSupabaseRealtime({
    table: "todolist",
    queryKeys: getQueryKey(trpc.list.getAll, undefined, "query")[0] as string[],
    event: "*",
  });

  return null;
}
