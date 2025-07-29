/**
 * Frontend Authentication Manager
 * ===============================
 *
 * A React hook and utility system for handling token lifecycle
 * without forcing users to re-login every 15 minutes.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { IS_DEV } from "@/lib/utils";

// =====================================================
// TYPES AND INTERFACES
// =====================================================

type AuthStatus = "checking" | "authenticated" | "unauthenticated";
type TokenStatus = "valid" | "needs_refresh" | "logout_required";
type RefreshResult = "success" | "failed" | "logout_required";
type AuthResult = "authenticated" | "logout_required";

interface AuthGuardResult {
  authStatus: AuthStatus;
  isRefreshing: boolean;
  checkAuthentication: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  logout: () => Promise<void>; // ✅ NEW: Manual logout function
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthGuardOptions {
  initialAuthStatus?: AuthStatus; // ✅ NEW: Allow server-side auth status
  skipInitialCheck?: boolean; // ✅ NEW: Skip initial check if server-side data is available
}

// =====================================================
// CORE TOKEN MANAGEMENT UTILITIES
// =====================================================

class TokenManager {
  static refreshInProgress = false;
  static refreshPromise: Promise<RefreshResult> | null = null;
  static lastRefreshAttempt = 0;
  static refreshCooldown = 60000; // 1 minute

  /**
   * Check if we need to refresh the access token
   */
  static async checkTokenStatus(): Promise<TokenStatus> {
    try {
      const response = await fetch("/api/auth/token-status", {
        method: "GET",
        credentials: "include",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.status as TokenStatus;
      }

      // If the API call failed but we might have a refresh token,
      // indicate that we need to refresh instead of immediate logout
      if (response.status === 401) {
        console.log(
          "[TokenManager] No access token found, checking for refresh token..."
        );
        return "needs_refresh";
      }

      return "logout_required";
    } catch (error) {
      console.error("[TokenManager] Error checking token status:", error);
      // On network errors, assume we need refresh rather than logout
      return "needs_refresh";
    }
  }

  /**
   * Attempt to refresh the access token
   */
  static async refreshAccessToken(): Promise<RefreshResult> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshInProgress && this.refreshPromise) {
      return await this.refreshPromise;
    }

    // Respect cooldown period
    const now = Date.now();
    if (now - this.lastRefreshAttempt < this.refreshCooldown) {
      console.log("[TokenManager] Refresh cooldown active");
      return "failed";
    }

    this.refreshInProgress = true;
    this.lastRefreshAttempt = now;

    this.refreshPromise = this._performRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshInProgress = false;
      this.refreshPromise = null;
    }
  }

  private static async _performRefresh(): Promise<RefreshResult> {
    try {
      console.log("[TokenManager] Attempting token refresh...");

      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log("[TokenManager] Token refresh successful");
          return "success";
        }
      }

      // Check if it's a refresh token issue
      if (response.status === 401) {
        console.log("[TokenManager] Refresh token invalid, logout required");
        return "logout_required";
      }

      console.log("[TokenManager] Token refresh failed");
      return "failed";
    } catch (error) {
      console.error("[TokenManager] Refresh error:", error);
      return "failed";
    }
  }

  /**
   * Ensure user has valid authentication
   */
  static async ensureAuthenticated(): Promise<AuthResult> {
    try {
      const status = await this.checkTokenStatus();
      console.log("[TokenManager] Token status check result:", status);

      if (status === "valid") {
        return "authenticated";
      }

      if (status === "needs_refresh") {
        console.log("[TokenManager] Attempting token refresh...");
        const refreshResult = await this.refreshAccessToken();
        console.log("[TokenManager] Refresh result:", refreshResult);

        if (refreshResult === "success") {
          return "authenticated";
        }

        if (refreshResult === "logout_required") {
          return "logout_required";
        }

        // Retry once after brief delay for failed refresh
        console.log("[TokenManager] Refresh failed, retrying after delay...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const retryResult = await this.refreshAccessToken();
        console.log("[TokenManager] Retry refresh result:", retryResult);

        return retryResult === "success" ? "authenticated" : "logout_required";
      }

      return "logout_required";
    } catch (error) {
      console.error("[TokenManager] Authentication check failed:", error);
      return "logout_required";
    }
  }

  /**
   * 🚨 NEW: Centralized logout function
   * Calls logout endpoint and clears authentication state
   */
  static async performLogout(): Promise<void> {
    try {
      console.log("[TokenManager] Performing logout...");

      // Call logout endpoint to clear cookies and blacklist tokens
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        console.log("[TokenManager] Logout endpoint called successfully");
      } else {
        console.warn(
          "[TokenManager] Logout endpoint returned:",
          response.status
        );
      }
    } catch (error) {
      console.error("[TokenManager] Logout endpoint failed:", error);
      // Continue with logout even if endpoint fails
    }

    // Reset internal state
    this.refreshInProgress = false;
    this.refreshPromise = null;
    this.lastRefreshAttempt = 0;

    console.log("[TokenManager] Logout completed - state reset");
  }

  /**
   * 🔄 NEW: Handle logout_required status with actual logout
   */
  static async handleLogoutRequired(): Promise<void> {
    console.log("[TokenManager] Logout required - performing logout...");

    // Call logout endpoint
    await this.performLogout();

    // Redirect to login in browser environment
    if (typeof window !== "undefined") {
      console.log("[TokenManager] Redirecting to login page...");
      window.location.href = "/login?message=session-expired";
    }
  }
}

// =====================================================
// REACT HOOK FOR AUTHENTICATION MANAGEMENT
// =====================================================

export function useAuthenticationGuard(
  options: AuthGuardOptions = {}
): AuthGuardResult {
  const { initialAuthStatus = "checking", skipInitialCheck = false } = options;

  const [authStatus, setAuthStatus] = useState<AuthStatus>(initialAuthStatus);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();
  const backgroundIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Check authentication status
  const checkAuthentication = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      setAuthStatus("checking");
      console.log("[useAuthenticationGuard] Starting authentication check...");

      const result = await TokenManager.ensureAuthenticated();
      console.log("[useAuthenticationGuard] Authentication result:", result);

      if (!mountedRef.current) return;

      if (result === "authenticated") {
        console.log("[useAuthenticationGuard] User authenticated successfully");
        setAuthStatus("authenticated");
      } else {
        console.log(
          "[useAuthenticationGuard] User not authenticated - performing logout"
        );
        setAuthStatus("unauthenticated");

        // ✅ FIXED: Actually perform logout instead of just setting state
        await TokenManager.handleLogoutRequired();
      }
    } catch (error) {
      console.error(
        "[useAuthenticationGuard] Authentication check failed:",
        error
      );
      if (mountedRef.current) {
        setAuthStatus("unauthenticated");
        // Perform logout on error
        await TokenManager.handleLogoutRequired();
      }
    }
  }, []);

  // Manual logout function
  const logout = useCallback(async (): Promise<void> => {
    if (!mountedRef.current) return;

    try {
      console.log("[useAuthenticationGuard] Manual logout initiated");
      setAuthStatus("checking");

      await TokenManager.performLogout();

      if (mountedRef.current) {
        setAuthStatus("unauthenticated");

        // Redirect to login with logout message
        if (typeof window !== "undefined") {
          window.location.href = "/login?message=logged-out";
        }
      }
    } catch (error) {
      console.error("[useAuthenticationGuard] Manual logout failed:", error);

      if (mountedRef.current) {
        // Force logout even on error
        setAuthStatus("unauthenticated");

        if (typeof window !== "undefined") {
          window.location.href = "/login?message=logout-error";
        }
      }
    }
  }, []);

  // Manual refresh function
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (!mountedRef.current) return false;

    try {
      setIsRefreshing(true);
      const result = await TokenManager.refreshAccessToken();

      if (!mountedRef.current) return false;

      if (result === "success") {
        setAuthStatus("authenticated");
        return true;
      } else if (result === "logout_required") {
        setAuthStatus("unauthenticated");
        // ✅ FIXED: Perform actual logout
        await TokenManager.handleLogoutRequired();
        return false;
      } else {
        return false;
      }
    } catch (error) {
      console.error("[useAuthenticationGuard] Manual refresh failed:", error);
      return false;
    } finally {
      if (mountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, []);

  // Start background monitoring
  const startBackgroundMonitoring = useCallback(() => {
    if (backgroundIntervalRef.current) return;

    console.log("[useAuthenticationGuard] Starting background monitoring");

    backgroundIntervalRef.current = setInterval(async () => {
      if (!mountedRef.current) return;

      try {
        const status = await TokenManager.checkTokenStatus();

        if (!mountedRef.current) return;

        if (status === "needs_refresh") {
          console.log(
            "[useAuthenticationGuard] Token needs refresh, refreshing..."
          );
          await refreshToken();
        } else if (status === "logout_required") {
          console.log(
            "[useAuthenticationGuard] Logout required - performing logout"
          );
          setAuthStatus("unauthenticated");
          // ✅ FIXED: Perform actual logout
          await TokenManager.handleLogoutRequired();
        }
      } catch (error) {
        console.error(
          "[useAuthenticationGuard] Background check failed:",
          error
        );
      }
    }, 60000); // Check every minute
  }, [refreshToken]);

  // Stop background monitoring
  const stopBackgroundMonitoring = useCallback(() => {
    if (backgroundIntervalRef.current) {
      clearInterval(backgroundIntervalRef.current);
      backgroundIntervalRef.current = null;
      console.log("[useAuthenticationGuard] Background monitoring stopped");
    }
  }, []);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && authStatus === "authenticated") {
        console.log(
          "[useAuthenticationGuard] Tab became active, checking auth..."
        );
        checkAuthentication();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [authStatus, checkAuthentication]);

  // Handle online/offline
  useEffect(() => {
    const handleOnline = () => {
      if (authStatus === "authenticated") {
        console.log(
          "[useAuthenticationGuard] Network reconnected, checking auth..."
        );
        checkAuthentication();
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [authStatus, checkAuthentication]);

  // Initialize authentication and background monitoring
  useEffect(() => {
    mountedRef.current = true;

    // ✅ OPTIMIZATION: Skip initial check if server-side data is available and valid
    if (!skipInitialCheck) {
      // Initial authentication check
      checkAuthentication();
    } else {
      console.log(
        "[useAuthenticationGuard] Skipping initial check - using server-side authentication state"
      );
    }

    return () => {
      mountedRef.current = false;
      stopBackgroundMonitoring();
    };
  }, [checkAuthentication, stopBackgroundMonitoring, skipInitialCheck]);

  // Start/stop background monitoring based on auth status
  useEffect(() => {
    if (authStatus === "authenticated") {
      startBackgroundMonitoring();
    } else {
      stopBackgroundMonitoring();
    }
  }, [authStatus, startBackgroundMonitoring, stopBackgroundMonitoring]);

  return {
    authStatus,
    isRefreshing,
    checkAuthentication,
    refreshToken,
    logout, // ✅ NEW: Export logout function for manual logout
    isAuthenticated: authStatus === "authenticated",
    isLoading: authStatus === "checking" || isRefreshing,
  };
}

// =====================================================
// API CALL HELPER WITH AUTO-AUTHENTICATION
// =====================================================

export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Ensure authentication before making the call
  const authResult = await TokenManager.ensureAuthenticated();

  if (authResult === "logout_required") {
    throw new Error("Authentication required");
  }

  // Make the API call with your existing fetchWithAuth
  const { fetchWithAuth } = await import("@/lib/auth/fetchWithAuth");

  return fetchWithAuth(url, {
    ...options,
    credentials: "include",
  });
}

// Export the TokenManager for advanced usage
export { TokenManager };
