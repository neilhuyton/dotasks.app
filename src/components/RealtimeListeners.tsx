import { useListRealtime } from "@/hooks/list/useListRealtime";
import { useTaskRealtime } from "@/hooks/task/useTaskRealtime";

export function RealtimeListeners() {
  useListRealtime();
  useTaskRealtime();

  return null;
}
