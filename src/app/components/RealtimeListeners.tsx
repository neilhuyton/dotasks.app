// src/app/components/RealtimeListeners.tsx

import { useListRealtime } from "@/shared/hooks/useListRealtime";

export function RealtimeListeners() {
  useListRealtime({ table: "todolist" });

  return null;
}