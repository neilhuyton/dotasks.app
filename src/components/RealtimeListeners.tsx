import { useListRealtime } from "@/features/lists/useListRealtime";
import { useTaskRealtime } from "@/features/tasks/useTaskRealtime";

export function RealtimeListeners() {
  useListRealtime();
  useTaskRealtime();

  return null;
}
