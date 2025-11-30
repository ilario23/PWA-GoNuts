import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { db } from "../lib/db";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import i18n from "@/i18n";

/**
 * Storage keys for offline-first auth persistence
 */
const CACHED_USER_KEY = "expense_tracker_cached_user";
const SESSION_EXPIRED_COUNTDOWN_MS = 5000; // 5 seconds before auto-logout

/**
 * Get cached user from localStorage for offline-first support
 */
function getCachedUser(): User | null {
  try {
    const cached = localStorage.getItem(CACHED_USER_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Validate basic user structure
      if (parsed && parsed.id && parsed.email) {
        return parsed as User;
      }
    }
  } catch (e) {
    console.warn("[Auth] Failed to parse cached user:", e);
  }
  return null;
}

/**
 * Save user to localStorage for offline-first support
 */
function setCachedUser(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CACHED_USER_KEY);
    }
  } catch (e) {
    console.warn("[Auth] Failed to cache user:", e);
  }
}

/**
 * Handle session expiration with elegant toast countdown
 */
function handleSessionExpired(signOutFn: () => Promise<any>): void {
  const t = i18n.t;
  let countdown = 5;
  let dismissed = false;

  // Show toast with action to cancel logout
  const toastId = toast.warning(
    `${t("session_expired") || "Session Expired"} - ${t("logging_out_in") || "Logging out in"} ${countdown}s`,
    {
      description:
        t("session_expired_description") ||
        "Your session has expired. You will be logged out automatically.",
      duration: SESSION_EXPIRED_COUNTDOWN_MS,
      action: {
        label: t("cancel") || "Cancel",
        onClick: () => {
          dismissed = true;
          console.log("[Auth] User cancelled auto-logout");
        },
      },
    }
  );

  // Update countdown every second
  const countdownInterval = setInterval(() => {
    countdown--;
    if (countdown > 0 && !dismissed) {
      toast.warning(
        `${t("session_expired") || "Session Expired"} - ${t("logging_out_in") || "Logging out in"} ${countdown}s`,
        {
          id: toastId,
          description:
            t("session_expired_description") ||
            "Your session has expired. You will be logged out automatically.",
          duration: 1000,
          action: {
            label: t("cancel") || "Cancel",
            onClick: () => {
              dismissed = true;
            },
          },
        }
      );
    }
  }, 1000);

  // Auto-logout after countdown
  setTimeout(() => {
    clearInterval(countdownInterval);
    if (!dismissed) {
      console.log("[Auth] Auto-logout after session expiration");
      toast.dismiss(toastId);
      signOutFn();
    }
  }, SESSION_EXPIRED_COUNTDOWN_MS);
}

/**
 * Hook for managing user authentication state via Supabase Auth.
 *
 * OFFLINE-FIRST BEHAVIOR:
 * - Immediately returns cached user if available (no network needed)
 * - Falls back to cached user if network is unavailable or times out
 * - Updates cache when user state changes
 *
 * @returns Object containing:
 *   - `user`: Current authenticated user or null
 *   - `loading`: Whether initial auth check is in progress
 *   - `isOffline`: Whether the auth check used offline cache
 *   - `signOut`: Function to sign out and clear local data
 *
 * @example
 * ```tsx
 * const { user, loading, isOffline, signOut } = useAuth();
 *
 * if (loading) return <Spinner />;
 * if (!user) return <LoginPage />;
 *
 * return (
 *   <div>
 *     Welcome, {user.email}
 *     {isOffline && <Badge>Offline</Badge>}
 *     <button onClick={signOut}>Sign Out</button>
 *   </div>
 * );
 * ```
 */
export function useAuth() {
  // Initialize with cached user for instant offline support
  const [user, setUser] = useState<User | null>(() => getCachedUser());
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const updateUser = useCallback((newUser: User | null, offline = false) => {
    setUser(newUser);
    setIsOffline(offline);
    setCachedUser(newUser);
    setLoading(false);
  }, []);

  useEffect(() => {
    let isSubscribed = true;

    const initAuth = async () => {
      const cachedUser = getCachedUser();

      // If we're offline, use cached user immediately
      if (!navigator.onLine) {
        console.log("[Auth] Offline at boot, using cached user");
        if (isSubscribed) {
          updateUser(cachedUser, true);
        }
        return;
      }

      // ====================================================================
      // CACHE-FIRST STRATEGY
      // ====================================================================
      // 1. Show cached user IMMEDIATELY (instant app startup)
      console.log("[Auth] Online - using cached user for instant rendering");
      if (isSubscribed && cachedUser) {
        updateUser(cachedUser, false);
      }

      // 2. Validate session in BACKGROUND (non-blocking)
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!isSubscribed) return;

        if (error) {
          console.warn("[Auth] Session validation error:", error.message);
          // If we had a cached user but session is invalid, handle expiration
          if (cachedUser) {
            handleSessionExpired(signOut);
          } else {
            updateUser(null, false);
          }
          return;
        }

        // Session valid
        if (session?.user) {
          // Update with fresh session data
          if (session.user.id !== cachedUser?.id) {
            console.log("[Auth] Session user different from cache, updating");
            updateUser(session.user, false);
          }
        } else {
          // No session but we had cached user - session expired
          if (cachedUser) {
            console.log("[Auth] Session expired");
            handleSessionExpired(signOut);
          } else {
            updateUser(null, false);
          }
        }
      } catch (error) {
        console.warn("[Auth] Network error during session validation:", error);
        // Keep cached user on network error
        if (isSubscribed && cachedUser) {
          updateUser(cachedUser, true);
        }
      }
    };

    initAuth();

    // Listen for changes on auth state (sign in, sign out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isSubscribed) return;

      updateUser(session?.user ?? null, false);

      // Clear local cache on sign out
      if (event === "SIGNED_OUT") {
        await db.clearLocalCache();
      }
    });

    // Listen for online/offline changes
    const handleOnline = () => {
      console.log("[Auth] Back online, refreshing session...");
      supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          if (isSubscribed) {
            updateUser(session?.user ?? null, false);
          }
        })
        .catch(() => {
          // Keep current state if refresh fails
        });
    };

    const handleOffline = () => {
      console.log("[Auth] Gone offline");
      if (isSubscribed) {
        setIsOffline(true);
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [updateUser]);

  const signOut = async () => {
    // Clear cached user
    setCachedUser(null);
    // Clear local cache before signing out
    await db.clearLocalCache();
    return supabase.auth.signOut();
  };

  return { user, loading, isOffline, signOut };
}
