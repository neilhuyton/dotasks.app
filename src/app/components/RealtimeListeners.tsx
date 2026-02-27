// src/app/components/RealtimeListeners.tsx

import { useSupabaseRealtime } from "@/shared/hooks/useSupabaseRealtime";
import { trpc } from "@/trpc";

export function RealtimeListeners() {
  const fullQueryKey = trpc.list.getAll.queryKey();

  const pathKey = fullQueryKey[0] as string[];

  useSupabaseRealtime({
    table: "todolist",
    queryKeys: pathKey,
    event: "*",
  });

  return null;
}
