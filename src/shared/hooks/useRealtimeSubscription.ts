// src/shared/hooks/useRealtimeSubscription.ts

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/shared/store/authStore";
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

    const removeResult = supabase.removeChannel(channel);

    if (removeResult && typeof removeResult.then === "function") {
      removeResult.finally(() => {
        retryCountRef.current = 0;
        setIsUnsubscribing(false);
      });
    } else {
      retryCountRef.current = 0;
      setIsUnsubscribing(false);
    }
  }, [isUnsubscribing]);

  const calculateDelay = (attempt: number) =>
    Math.min(
      RETRY.BASE_DELAY_MS * Math.pow(RETRY.BACKOFF_FACTOR, attempt),
      RETRY.MAX_DELAY_MS,
    );

  const subscribe = useCallback(async () => {
    if (!enabled || isUnsubscribing || channelRef.current) return;

    // Force refresh token in case of expiration / race in prod
    const {
      data: { session },
      error: refreshError,
    } = await supabase.auth.refreshSession();
    if (refreshError || !session?.access_token) {
      console.warn(
        "[Realtime] Token refresh failed or no token:",
        refreshError?.message,
      );
      return;
    }

    const accessToken = session.access_token;
    supabase.realtime.setAuth(accessToken);

    console.log(
      "[Realtime] Subscribing to",
      channelName,
      "- token refreshed & set",
    );

    const changesFilter: RealtimePostgresChangesFilter<PostgresChangesEvent> = {
      event,
      schema: "public",
      table,
      ...(filter ? { filter } : {}),
    };

    channelRef.current = supabase
      .channel(channelName)
      .on<T>("postgres_changes", changesFilter, (payload) => {
        console.log("[Realtime] PAYLOAD received on", channelName, payload);
        onPayloadRef.current(payload);
      })
      .subscribe((status, err) => {
        console.log(
          `[Realtime ${channelName}] status:`,
          status,
          err ? err.message : "",
        );

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

    const timer = setTimeout(() => {
      if (mountedRef.current) subscribe();
    }, 0);

    const unsubscribeAuth = useAuthStore.subscribe((state) => {
      if (state.session?.access_token && enabled && mountedRef.current) {
        subscribe();
      } else {
        cleanupChannel();
      }
    });

    return () => {
      clearTimeout(timer);
      unsubscribeAuth();
      cleanupChannel();
    };
  }, [channelName, table, event, filter, enabled, subscribe, cleanupChannel]);

  return { cleanup: cleanupChannel };
}
