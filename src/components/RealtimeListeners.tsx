import { useListRealtime } from "@/features/lists/hooks/useListRealtime";
import { useTaskRealtime } from "@/features/tasks/hooks/useTaskRealtime";

export function RealtimeListeners() {
  useListRealtime();
  useTaskRealtime();

  return null;
}
