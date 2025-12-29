import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { db } from "../lib/db";
import { User } from "@supabase/supabase-js";

/**
 * Storage keys for offline-first auth persistence
 */
const CACHED_USER_KEY = "expense_tracker_cached_user";
const AUTH_TIMEOUT_MS = 3000; // 3 seconds timeout for auth check

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
    let timeoutId: NodeJS.Timeout;
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

      // Set a timeout to fallback to cached user if network is slow
      timeoutId = setTimeout(() => {
        if (isSubscribed && loading) {
          console.log("[Auth] Auth timeout, using cached user");
          updateUser(cachedUser, true);
        }
      }, AUTH_TIMEOUT_MS);

      try {
        // Try to get session from Supabase
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        clearTimeout(timeoutId);

        if (error) {
          console.warn(
            "[Auth] Session error, using cached user:",
            error.message
          );
          if (isSubscribed) {
            updateUser(cachedUser, true);
          }
          return;
        }

        if (isSubscribed) {
          updateUser(session?.user ?? null, false);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.warn("[Auth] Network error, using cached user:", error);
        if (isSubscribed) {
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
      clearTimeout(timeoutId);
      subscription.unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [updateUser, loading]);

  const signOut = async () => {
    // Clear cached user
    setCachedUser(null);
    // Clear local cache before signing out
    await db.clearLocalCache();
    return supabase.auth.signOut();
  };

  return { user, loading, isOffline, signOut };
}
