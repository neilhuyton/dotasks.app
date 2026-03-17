import { useListRealtime } from "@/hooks/useListRealtime";
import { useTaskRealtime } from "@/hooks/useTaskRealtime";

export function RealtimeListeners() {
  useListRealtime();
  useTaskRealtime();

  return null;
}
