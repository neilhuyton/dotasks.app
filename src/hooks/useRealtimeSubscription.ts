// src/shared/hooks/useRealtimeSubscription.ts

import { useEffect, useRef, useState, useCallback } from "react";
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
  autoResubscribe?: boolean;
}

const RETRY = {
  MAX_ATTEMPTS: 5,
  BASE_DELAY_MS: 3000,
  MAX_DELAY_MS: 30000,
  BACKOFF_FACTOR: 1.8,
} as const;

export function useRealtimeSubscription<T extends TableRow = TableRow>({
  channelName,
  table,
  event = "*",
  filter,
  onPayload,
  enabled = true,
  autoResubscribe = true,
}: RealtimeSubscriptionOptions<T>) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const retryCountRef = useRef(0);
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
    if (isUnsubscribing || !channelRef.current) return;
    setIsUnsubscribing(true);
    const channel = channelRef.current;
    channelRef.current = null;
    supabase.removeChannel(channel).finally(() => {
      retryCountRef.current = 0;
      setIsUnsubscribing(false);
    });
  }, [isUnsubscribing]);

  const calculateDelay = (attempt: number) =>
    Math.min(
      RETRY.BASE_DELAY_MS * Math.pow(RETRY.BACKOFF_FACTOR, attempt),
      RETRY.MAX_DELAY_MS,
    );

  const subscribe = useCallback(async () => {
    if (!enabled || isUnsubscribing || channelRef.current) return;

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
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          retryCountRef.current = 0;
        }

        if (status === "CLOSED") {
          cleanupChannel();
        }

        if (["CHANNEL_ERROR", "TIMED_OUT"].includes(status)) {
          cleanupChannel();

          if (
            autoResubscribe &&
            retryCountRef.current < RETRY.MAX_ATTEMPTS &&
            !channelRef.current &&
            !isUnsubscribing &&
            enabled &&
            mountedRef.current
          ) {
            retryCountRef.current += 1;
            setTimeout(() => {
              if (
                autoResubscribe &&
                retryCountRef.current <= RETRY.MAX_ATTEMPTS &&
                !channelRef.current &&
                !isUnsubscribing &&
                enabled &&
                mountedRef.current
              ) {
                subscribe();
              }
            }, calculateDelay(retryCountRef.current));
          }
        }
      });
  }, [
    enabled,
    isUnsubscribing,
    channelName,
    table,
    event,
    filter,
    autoResubscribe,
    cleanupChannel,
  ]);

  useEffect(() => {
    if (!enabled) {
      cleanupChannel();
      return;
    }

    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.session?.access_token && enabled && mountedRef.current) {
        subscribe();
      } else {
        cleanupChannel();
      }
    });

    subscribe();

    return () => {
      unsubscribe();
      cleanupChannel();
    };
  }, [enabled, subscribe, cleanupChannel]);

  return { cleanup: cleanupChannel };
}
