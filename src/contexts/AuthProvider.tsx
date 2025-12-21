/**
 * @fileoverview Authentication Provider - Single instance auth state management
 *
 * This provider wraps the entire app and provides authentication state via React Context.
 * It ensures that:
 * - Only ONE instance of the auth listener is created (prevents duplicate listeners)
 * - All components can access auth state without creating multiple subscriptions
 * - Clean separation of concerns (auth logic in one place)
 *
 * @module contexts/AuthProvider
 */

import * as React from "react";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { db } from "@/lib/db";
import { syncManager } from "@/lib/sync";
import { cleanupSoftDeletedRecords } from "@/lib/cleanup";
import { User } from "@supabase/supabase-js";
import { SessionExpiredModal } from "@/components/auth/SessionExpiredModal";

// ============================================================================
// CONSTANTS
// ============================================================================

const CACHED_USER_KEY = "expense_tracker_cached_user";
const PAGE_LOAD_KEY = "expense_tracker_page_loaded"; // Track page reloads

// ============================================================================
// TYPES
// ============================================================================

interface AuthContextValue {
  /** Current authenticated user or null */
  user: User | null;
  /** Whether initial auth check is in progress */
  loading: boolean;
  /** Whether the auth check used offline cache */
  isOffline: boolean;
  /** Sign out and clear local data. Pass { soft: true } to preserve data (e.g. for re-auth) */
  signOut: (options?: { soft?: boolean }) => Promise<void>;
}

// ============================================================================
// CONTEXT
// ============================================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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
 * Check if this is a page reload (not a fresh login)
 */
function isPageReload(): boolean {
  return sessionStorage.getItem(PAGE_LOAD_KEY) === "true";
}

/**
 * Mark that the page has been loaded
 */
function markPageLoaded(): void {
  sessionStorage.setItem(PAGE_LOAD_KEY, "true");
}

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const shouldPreserveDataRef = React.useRef(false);

  const updateUser = useCallback((newUser: User | null, offline = false) => {
    setUser(newUser);
    setIsOffline(offline);
    setCachedUser(newUser);
    setLoading(false);
  }, []);

  const signOut = useCallback(async (options?: { soft?: boolean }) => {
    if (options?.soft) {
      shouldPreserveDataRef.current = true;
    }

    // Clear cached user
    setCachedUser(null);

    // Clear local cache before signing out ONLY if not soft logout
    if (!options?.soft) {
      await db.clearLocalCache();
    }

    // Sign out and discard the return value
    await supabase.auth.signOut();
    setIsSessionExpired(false);
  }, []);

  // Register logout handler with sync manager to handle 403s from sync
  useEffect(() => {
    syncManager.registerLogoutHandler(() => {
      console.log("[AuthProvider] Received logout request from SyncManager (403 Forbidden)");
      setIsSessionExpired(true);
    });
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    let cleanupTimeout: NodeJS.Timeout | null = null;

    const initAuth = async () => {
      const cachedUser = getCachedUser();

      // If we're offline, use cached user immediately
      if (!navigator.onLine) {
        console.log("[AuthProvider] Offline at boot, using cached user");
        if (isSubscribed) {
          updateUser(cachedUser, true);
        }
        return;
      }

      // ====================================================================
      // CACHE-FIRST STRATEGY
      // ====================================================================
      // 1. Show cached user IMMEDIATELY (instant app startup)
      console.log(
        "[AuthProvider] Online - using cached user for instant rendering"
      );
      if (isSubscribed && cachedUser) {
        updateUser(cachedUser, false);
      }

      // Run cleanup in background with a delay to not impact startup performance
      cleanupTimeout = setTimeout(() => {
        cleanupSoftDeletedRecords().catch((e) =>
          console.error("Cleanup failed", e)
        );
      }, 10000);

      // 2. Validate session in BACKGROUND (non-blocking)
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!isSubscribed) return;

        if (error) {
          console.warn(
            "[AuthProvider] Session validation error:",
            error.message
          );

          // Handle 403 Forbidden specifically - immediate logout
          if (error.status === 403) {
            console.error("[AuthProvider] 403 Forbidden during init - session expired");
            setIsSessionExpired(true);
            return;
          }

          // If we had a cached user but session is invalid, handle expiration
          if (cachedUser) {
            console.log("[AuthProvider] Session error with cached user -> expired");
            setIsSessionExpired(true);
          } else {
            updateUser(null, false);
          }
          return;
        }

        // Session valid
        if (session?.user) {
          // Mark that we loaded the page with an existing session
          markPageLoaded();
          // Update with fresh session data
          if (session.user.id !== cachedUser?.id) {
            console.log(
              "[AuthProvider] Session user different from cache, updating"
            );
            updateUser(session.user, false);
          }
        } else {
          // No session but we had cached user - session expired
          if (cachedUser) {
            console.log("[AuthProvider] Session expired (no session, cached user exists)");
            setIsSessionExpired(true);
          } else {
            updateUser(null, false);
          }
        }
      } catch (error) {
        console.warn(
          "[AuthProvider] Network error during session validation:",
          error
        );
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

      console.log(`[AuthProvider] Auth state changed: ${event}`);

      updateUser(session?.user ?? null, false);

      // Clear local cache on sign out IF preservation not requested
      if (event === "SIGNED_OUT") {
        if (shouldPreserveDataRef.current) {
          console.log("[AuthProvider] Soft logout - preserving local data");
          shouldPreserveDataRef.current = false; // Reset flag
        } else {
          console.log("[AuthProvider] Hard logout - clearing local data");
          await db.clearLocalCache();
        }

        // Clear page load flag on sign out so next login triggers full sync
        sessionStorage.removeItem(PAGE_LOAD_KEY);
      }

      // Only trigger full sync on ACTUAL NEW LOGIN
      // Use sessionStorage to detect if this is a page reload vs fresh login
      // sessionStorage persists for the browser tab/window session but clears on tab close
      if (event === "SIGNED_IN") {
        const isReload = isPageReload();

        if (!isReload) {
          console.log(
            "[AuthProvider] Fresh login detected, triggering full sync..."
          );
          markPageLoaded(); // Mark for future reloads in this session
          // Small delay to ensure session is fully established
          setTimeout(() => {
            syncManager.fullSync();
          }, 1000);
        } else {
          console.log(
            "[AuthProvider] Page reload detected, skipping full sync"
          );
        }
      }
    });

    // Listen for online/offline changes
    const handleOnline = () => {
      console.log("[AuthProvider] Back online, refreshing session...");
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
      console.log("[AuthProvider] Gone offline");
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

      if (cleanupTimeout) {
        clearTimeout(cleanupTimeout);
      }
    };
  }, [updateUser, signOut]);

  const value: AuthContextValue = {
    user,
    loading,
    isOffline,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SessionExpiredModal
        open={isSessionExpired}
        onLogin={() => signOut({ soft: true })}
      />
    </AuthContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to access authentication state from anywhere in the app.
 * Must be used within an AuthProvider.
 *
 * @returns Authentication context value
 * @throws Error if used outside AuthProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, loading, signOut } = useAuth();
 *
 *   if (loading) return <Spinner />;
 *   if (!user) return <Login />;
 *
 *   return <div>Welcome, {user.email}</div>;
 * }
 * ```
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
