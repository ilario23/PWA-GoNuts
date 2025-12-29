import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Setting } from "../lib/db";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

/**
 * Hook for managing user preferences and application settings.
 *
 * Settings are stored locally per user and include display preferences,
 * currency, language, and behavioral options.
 *
 * Automatically creates default settings for new users on first access.
 *
 * @returns Object containing:
 *   - `settings`: Current user settings or undefined if loading
 *   - `updateSettings`: Partial update function for settings
 *
 * @example
 * ```tsx
 * const { settings, updateSettings } = useSettings();
 *
 * // Change theme
 * await updateSettings({ theme: 'dark' });
 *
 * // Change multiple settings
 * await updateSettings({
 *   language: 'it',
 *   start_of_week: 'sunday'
 * });
 * ```
 */
export function useSettings() {
  const { user } = useAuth();

  const settings = useLiveQuery(
    () => (user ? db.user_settings.get(user.id) : undefined),
    [user]
  );

  React.useEffect(() => {
    if (user && settings === undefined) {
      db.user_settings.get(user.id).then((existing) => {
        if (!existing) {
          db.user_settings.add({
            user_id: user.id,
            currency: "EUR",
            language: "en",
            theme: "light",
            accentColor: "slate",
            start_of_week: "monday",
            default_view: "list",
            include_investments_in_expense_totals: false,
            include_group_expenses: false,
            // Set to epoch 0 so that if remote settings exist, they will always win
            // (remoteTime > localTime) during the initial sync
            updated_at: new Date(0).toISOString(),
          });
        }
      });
    }
  }, [user, settings]);

  const updateSettings = async (updates: Partial<Setting>) => {
    if (!user) return;

    const updatedAt = new Date().toISOString();
    const current = await db.user_settings.get(user.id);

    if (current) {
      await db.user_settings.update(user.id, {
        ...updates,
        updated_at: updatedAt,
      });
    } else {
      await db.user_settings.add({
        user_id: user.id,
        currency: "EUR",
        language: "en",
        theme: "light",
        accentColor: "slate",
        start_of_week: "monday",
        default_view: "list",
        include_investments_in_expense_totals: false,
        include_group_expenses: false,
        ...updates,
        updated_at: updatedAt,
      } as Setting);
    }

    // Sync to Supabase (fire and forget, don't block UI)
    const settingsToSync = await db.user_settings.get(user.id);
    if (settingsToSync) {
      // Map local field names to Supabase column names
       
      const { last_sync_token: _last_sync_token, cached_month: _cached_month, accentColor, ...rest } =
        settingsToSync;
      const supabaseSettings = {
        ...rest,
        accent_color: accentColor,
        updated_at: updatedAt,
      };

      supabase
        .from("user_settings")
        .upsert(supabaseSettings)
        .then(({ error }) => {
          if (error) {
            console.error("[Settings] Failed to sync to Supabase:", error);
          } else {
            console.log("[Settings] Synced to Supabase");
          }
        });
    }
  };

  return {
    settings,
    updateSettings,
  };
}
