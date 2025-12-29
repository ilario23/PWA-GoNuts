import { useEffect, useRef, useCallback, useState } from "react";
import {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { db } from "../lib/db";
import { useAuth } from "./useAuth";
import { handleError } from "@/lib/error-handler";
import { REALTIME_CONFIG, TIMING } from "@/lib/constants";
import { toast } from "sonner";
import i18n from "@/i18n";

// Tables we want to subscribe to
const REALTIME_TABLES = REALTIME_CONFIG.TABLES;

type RealtimeTable = (typeof REALTIME_TABLES)[number];

interface RealtimeEvent {
  table: RealtimeTable;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

// Retry configuration
const MAX_RETRY_ATTEMPTS = REALTIME_CONFIG.MAX_RETRY_ATTEMPTS;
const INITIAL_RETRY_DELAY = REALTIME_CONFIG.INITIAL_RETRY_DELAY;

/**
 * Hook that manages Supabase Realtime subscriptions.
 *
 * Subscribes to changes on all relevant tables and writes
 * incoming data to Dexie (IndexedDB) for local-first reactivity.
 *
 * Uses last-write-wins conflict resolution based on updated_at.
 */
export function useRealtimeSync(enabled: boolean = true) {
  const { user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribeRef = useRef<(() => void) | null>(null);

  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);

  /**
   * Handle incoming Realtime events
   * Uses last-write-wins based on updated_at timestamp
   */
  const handleRealtimeEvent = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (payload: RealtimePostgresChangesPayload<Record<string, any>>) => {
      const { eventType, table } = payload;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newRecord = payload.new as Record<string, any> | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const oldRecord = payload.old as Record<string, any> | null;

      console.log(
        `[Realtime] ${eventType} on ${table}:`,
        newRecord?.id || oldRecord?.id
      );

      // Track last event for debugging
      setLastEvent({
        table: table as RealtimeTable,
        eventType: eventType as "INSERT" | "UPDATE" | "DELETE",
        new: newRecord || {},
        old: oldRecord || {},
      });

      try {
        const dexieTable = db.table(table);

        switch (eventType) {
          case "INSERT":
          case "UPDATE": {
            if (!newRecord?.id) return;

            // Check if we already have this record locally
            const existingRecord = await dexieTable.get(newRecord.id);

            // Last-write-wins: compare updated_at timestamps
            if (existingRecord) {
              const localUpdatedAt = existingRecord.updated_at
                ? new Date(existingRecord.updated_at).getTime()
                : 0;
              const remoteUpdatedAt = newRecord.updated_at
                ? new Date(newRecord.updated_at).getTime()
                : 0;

              // If local is pending sync and has newer timestamp, skip remote update
              if (
                existingRecord.pendingSync === 1 &&
                localUpdatedAt >= remoteUpdatedAt
              ) {
                console.log(
                  `[Realtime] Skipping ${table} ${newRecord.id} - local is newer`
                );
                return;
              }
            }

            // Calculate year_month for transactions if needed
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const recordToSave: Record<string, any> = {
              ...newRecord,
              pendingSync: 0,
            };
            if (table === "transactions" && newRecord.date) {
              recordToSave.year_month = newRecord.date.substring(0, 7);
            }

            // Normalize boolean -> number for 'active' field
            // Supabase stores as boolean, IndexedDB needs number for indexing
            if ("active" in recordToSave) {
              recordToSave.active = recordToSave.active ? 1 : 0;
            }

            await dexieTable.put(recordToSave);
            console.log(`[Realtime] Saved ${table} ${newRecord.id}`);

            // Show toast for new group transactions not created by me
            if (
              table === "transactions" &&
              eventType === "INSERT" &&
              newRecord.group_id &&
              newRecord.user_id !== user?.id
            ) {
              // Check if I am a member of this group
              const membership = await db.group_members
                .where("group_id")
                .equals(newRecord.group_id)
                .and((m) => m.user_id === user?.id && !m.removed_at)
                .first();

              if (membership) {
                // Get group name for toast
                const group = await db.groups.get(newRecord.group_id);
                const groupName = group?.name || "Unknown Group";

                // Get payer name
                let payerName = "Someone";
                if (newRecord.paid_by_member_id) {
                  const member = await db.group_members.get(
                    newRecord.paid_by_member_id
                  );
                  if (member) {
                    if (member.is_guest) {
                      payerName = member.guest_name || "Guest";
                    } else if (member.user_id) {
                      const payerProfile = await db.profiles.get(member.user_id);
                      payerName =
                        payerProfile?.full_name ||
                        payerProfile?.email ||
                        "Someone";
                    }
                  }
                }

                toast.info(
                  i18n.t("new_group_transaction", {
                    defaultValue: "New transaction in {{group}}",
                    group: groupName,
                  }),
                  {
                    description: `${payerName}: ${newRecord.description} (€${newRecord.amount})`,
                    duration: 5000,
                  }
                );
              }
            }

            break;
          }

          case "DELETE": {
            const recordId = oldRecord?.id || newRecord?.id;
            if (!recordId) return;

            // For soft deletes, we mark as deleted_at instead of removing
            const existing = await dexieTable.get(recordId);
            if (existing) {
              await dexieTable.update(recordId, {
                deleted_at: new Date().toISOString(),
                pendingSync: 0,
              });
              console.log(`[Realtime] Soft deleted ${table} ${recordId}`);
            }
            break;
          }
        }
      } catch (error) {
        handleError(
          error,
          "warning",
          {
            source: "useRealtimeSync",
            operation: `handle-${eventType}`,
            meta: { table },
          },
          { showToast: false }
        );
      }
    },
    [user]
  );

  /**
   * Subscribe to Realtime changes for all tables
   * Includes exponential backoff retry logic
   */
  const subscribe = useCallback(() => {
    if (!user || channelRef.current) return;

    console.log("[Realtime] Subscribing to changes...");

    // Create a single channel for all table subscriptions
    const channel = supabase.channel("db-changes", {
      config: {
        broadcast: { self: false },
        presence: { key: user.id },
      },
    });

    // Subscribe to each table
    for (const table of REALTIME_TABLES) {
      channel.on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table,
        },
        handleRealtimeEvent
      );
    }

    // Start the subscription
    channel.subscribe((status) => {
      console.log(`[Realtime] Subscription status: ${status}`);

      if (status === "SUBSCRIBED") {
        setIsConnected(true);
        retryCountRef.current = 0; // Reset retry count on success
        console.log("[Realtime] Successfully subscribed to all tables");
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setIsConnected(false);
        console.error(`[Realtime] ${status} - will retry with backoff`);

        // Exponential backoff retry
        if (retryCountRef.current < MAX_RETRY_ATTEMPTS) {
          const delay =
            INITIAL_RETRY_DELAY * Math.pow(2, retryCountRef.current);
          retryCountRef.current++;
          console.log(
            `[Realtime] Retry ${retryCountRef.current}/${MAX_RETRY_ATTEMPTS} in ${delay}ms`
          );

          retryTimeoutRef.current = setTimeout(async () => {
            await supabase.removeChannel(channel);
            channelRef.current = null;
            if (subscribeRef.current) subscribeRef.current();
          }, delay);
        } else {
          console.error("[Realtime] Max retry attempts reached");
        }
      } else if (status === "CLOSED") {
        setIsConnected(false);
      }
    });

    channelRef.current = channel;
  }, [user, handleRealtimeEvent]);

  // Keep ref updated
  useEffect(() => {
    subscribeRef.current = subscribe;
  }, [subscribe]);





  /**
   * Unsubscribe from Realtime
   */
  const unsubscribe = useCallback(async () => {
    // Clear any pending timeouts
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (channelRef.current) {
      console.log("[Realtime] Unsubscribing...");
      const channel = channelRef.current;
      channelRef.current = null;
      // Use setTimeout to avoid setState in effect warning if unmounting
      setTimeout(() => setIsConnected(false), 0);

      // Use try-catch to handle cases where WebSocket is already closed
      try {
        await supabase.removeChannel(channel);
      } catch (_error) {
        // Ignore errors when WebSocket is already closed
        console.log(
          "[Realtime] Channel already closed or error during cleanup"
        );
      }
    }
  }, []);

  /**
   * Reconnect (unsubscribe + subscribe) with debounce
   */
  const reconnect = useCallback(async () => {
    // Debounce: clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    await unsubscribe();
    retryCountRef.current = 0; // Reset retry count for fresh reconnect

    // Debounced delay before reconnecting
    reconnectTimeoutRef.current = setTimeout(() => {
      subscribe();
    }, TIMING.REALTIME_RECONNECT_DELAY);
  }, [subscribe, unsubscribe]);

  // Subscribe when user logs in, unsubscribe on logout
  useEffect(() => {
    if (user && enabled) {
      subscribe();
    } else {
      unsubscribe();
    }

    return () => {
      unsubscribe();
    };
  }, [user, enabled, subscribe, unsubscribe]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log("[Realtime] Back online, reconnecting...");
      reconnect();
    };

    const handleOffline = () => {
      console.log("[Realtime] Went offline");
      setIsConnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [reconnect]);

  return {
    isConnected,
    lastEvent,
    reconnect,
    unsubscribe,
  };
}
