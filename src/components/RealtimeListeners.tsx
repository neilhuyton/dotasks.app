// src/app/components/RealtimeListeners.tsx

import { useListRealtime } from "@/hooks/useListRealtime";

export function RealtimeListeners() {
  useListRealtime({ table: "todolist" });

  return null;
}