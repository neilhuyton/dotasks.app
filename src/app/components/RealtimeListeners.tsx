// src/app/components/RealtimeListeners.tsx

import { useSupabaseRealtime } from "@/shared/hooks/useSupabaseRealtime";
import { trpc } from "@/trpc";

export function RealtimeListeners() {
  // Get the full structured query key
  const fullQueryKey = trpc.list.getAll.queryKey();  // or .queryKey(undefined)

  // Extract just the path part (array like ['list', 'getAll'])
  // This is safe & typed correctly as string[]
  const pathKey = fullQueryKey[0] as string[];  // or fullQueryKey.path if your version uses that shape

  useSupabaseRealtime({
    table: "todolist",
    queryKeys: pathKey,  // ← pass only the path array
    // If your hook expects string[][] or multiple keys, use: [pathKey]
    event: "*",
  });

  return null;
}