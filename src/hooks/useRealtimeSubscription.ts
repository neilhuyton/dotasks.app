import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  RealtimePostgresChangesFilter,
} from "@supabase/supabase-js";

type PostgresChangesEvent = "*" | "INSERT" | "UPDATE" | "DELETE";
type TableRow = Record<string, unknown>;

type RealtimeCallback<T extends TableRow = TableRow> = (
  payload: RealtimePostgresChangesPayload<T>,
) => void;

interface RealtimeSubscriptionOptions<T extends TableRow = TableRow> {
  channelName: string;
  table: string;
  event?: PostgresChangesEvent;
  filter?: string;
  onPayload: RealtimeCallback<T>;
  enabled?: boolean;
}

export function useRealtimeSubscription<T extends TableRow = TableRow>({
  channelName,
  table,
  event = "*",
  filter,
  onPayload,
  enabled = true,
}: RealtimeSubscriptionOptions<T>) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onPayloadRef = useRef(onPayload);
  const mountedRef = useRef(true);

  useEffect(() => {
    onPayloadRef.current = onPayload;
  }, [onPayload]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const cleanupChannel = useCallback(() => {
    if (!channelRef.current) return;
    const channel = channelRef.current;
    channelRef.current = null;
    supabase.removeChannel(channel);
  }, []);

  const subscribe = useCallback(async () => {
    if (!enabled || channelRef.current) return;

    const changesFilter: RealtimePostgresChangesFilter<PostgresChangesEvent> = {
      event,
      schema: "public",
      table,
      ...(filter ? { filter } : {}),
    };

    channelRef.current = supabase
      .channel(channelName)
      .on<T>("postgres_changes", changesFilter, (payload) => {
        onPayloadRef.current(payload);
      })
      .subscribe();
  }, [enabled, channelName, table, event, filter]);

  useEffect(() => {
    if (!enabled) {
      cleanupChannel();
      return;
    }

    subscribe();

    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.session?.access_token && enabled && mountedRef.current) {
        subscribe();
      } else {
        cleanupChannel();
      }
    });

    return () => {
      unsubscribe();
      cleanupChannel();
    };
  }, [enabled, subscribe, cleanupChannel]);
}
