/**
 * User Role Hook
 * ==============
 *
 * React hook to get current user's role information from JWT token.
 * Used for conditional UI rendering and client-side validation.
 * 
 * ✅ ENTERPRISE: Uses fetchWithAuth for automatic token refresh
 * ✅ PERFORMANCE: Implements caching to reduce API calls and latency
 * ✅ UX: Minimizes loading states and visual flicker
 */

import { useState, useEffect } from "react";
import { IS_DEV } from "@/lib/utils";
import { fetchWithAuth } from "@/lib/auth/fetchWithAuth";

export type UserRole = "ADMIN" | "admin" | "USER" | "user" | null;

interface UseUserRoleResult {
  userRole: UserRole;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

// ✅ PERFORMANCE: Global cache to prevent multiple API calls
let cachedUserRole: UserRole | undefined = undefined;
let cachedIsAdmin: boolean | undefined = undefined;
let cacheTimestamp: number | undefined = undefined;
let ongoingRequest: Promise<{ role: UserRole; isAdmin: boolean }> | null = null;

// Cache duration: 5 minutes (adjust as needed)
const CACHE_DURATION = 5 * 60 * 1000;

// ✅ PERFORMANCE: Check if cache is still valid
function isCacheValid(): boolean {
  return (
    cachedUserRole !== undefined &&
    cacheTimestamp !== undefined &&
    Date.now() - cacheTimestamp < CACHE_DURATION
  );
}

// ✅ ENTERPRISE: Fetch user role with proper authentication and caching
async function fetchUserRoleData(): Promise<{ role: UserRole; isAdmin: boolean }> {
  // Return cached data if valid
  if (isCacheValid()) {
    return { role: cachedUserRole!, isAdmin: cachedIsAdmin! };
  }

  // Return ongoing request if one exists
  if (ongoingRequest) {
    return ongoingRequest;
  }

  // Create new request
  ongoingRequest = (async () => {
    try {
      if (IS_DEV) {
        console.log("[useUserRole] Fetching user role with fetchWithAuth...");
      }

      // ✅ ENTERPRISE: Use fetchWithAuth instead of raw fetch
      const response = await fetchWithAuth("/api/auth/user-info", {
        method: "GET",
        correlationId: `user-role-${Date.now()}`,
        enableRefresh: true, // Allow token refresh if needed
        maxRetries: 1, // Quick retry for user info
        throwOnSessionExpiry: false, // Don't throw on session expiry
        onSessionExpired: () => {
          // Handle session expiry gracefully
          if (IS_DEV) {
            console.log("[useUserRole] Session expired while fetching user role");
          }
          // Clear cache on session expiry
          cachedUserRole = null;
          cachedIsAdmin = false;
          cacheTimestamp = Date.now();
        },
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // Handle auth errors gracefully
        if (response.status === 401) {
          // User not authenticated - set as non-admin
          const result = { role: null as UserRole, isAdmin: false };
          
          // Cache the result to prevent repeated failed requests
          cachedUserRole = null;
          cachedIsAdmin = false;
          cacheTimestamp = Date.now();
          
          if (IS_DEV) {
            console.log("[useUserRole] User not authenticated, setting as non-admin");
          }
          
          return result;
        }
        
        throw new Error(`Failed to fetch user role: ${response.status}`);
      }

      const data = await response.json();
      const role = data.role || null;
      const isAdmin = role === "ADMIN" || role === "admin";

      // ✅ PERFORMANCE: Cache the results
      cachedUserRole = role;
      cachedIsAdmin = isAdmin;
      cacheTimestamp = Date.now();

      if (IS_DEV) {
        console.log("[useUserRole] User role cached:", { role, isAdmin });
      }

      return { role, isAdmin };
      
    } catch (err) {
      if (IS_DEV) {
        console.error("[useUserRole] Error fetching user role:", err);
      }
      
      // On error, cache as non-admin to prevent repeated failures
      cachedUserRole = null;
      cachedIsAdmin = false;
      cacheTimestamp = Date.now();
      
      throw err;
    } finally {
      // Clear ongoing request
      ongoingRequest = null;
    }
  })();

  return ongoingRequest;
}

export function useUserRole(): UseUserRoleResult {
  const [userRole, setUserRole] = useState<UserRole>(
    // ✅ PERFORMANCE: Initialize with cached value if available and valid
    isCacheValid() ? cachedUserRole! : null
  );
  const [isLoading, setIsLoading] = useState(!isCacheValid()); // ✅ UX: Don't show loading if cached
  const [error, setError] = useState<string | null>(null);

  const isAdmin = userRole === "ADMIN" || userRole === "admin";

  useEffect(() => {
    const loadUserRole = async () => {
      // ✅ PERFORMANCE: Skip loading if we have valid cache
      if (isCacheValid()) {
        setUserRole(cachedUserRole!);
        setIsLoading(false);
        return;
      }

      try {
        setError(null);
        
        const { role, isAdmin: adminStatus } = await fetchUserRoleData();
        
        setUserRole(role);
        setIsLoading(false);

        if (IS_DEV) {
          console.log("[useUserRole] Role loaded from cache/API:", { role, isAdmin: adminStatus });
        }
        
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch user role";
        setError(errorMessage);
        setUserRole(null);
        setIsLoading(false);

        if (IS_DEV) {
          console.error("[useUserRole] Error loading user role:", err);
        }
      }
    };

    loadUserRole();
  }, []);

  return {
    userRole,
    isAdmin,
    isLoading,
    error,
  };
}

// ✅ PERFORMANCE: Export cache management functions for advanced usage
export const userRoleCache = {
  /**
   * Clear the user role cache (useful after login/logout)
   */
  clear: () => {
    cachedUserRole = undefined;
    cachedIsAdmin = undefined;
    cacheTimestamp = undefined;
    ongoingRequest = null;
    
    if (IS_DEV) {
      console.log("[useUserRole] Cache cleared");
    }
  },
  
  /**
   * Get current cache status
   */
  getStatus: () => ({
    cached: cachedUserRole !== undefined,
    valid: isCacheValid(),
    role: cachedUserRole,
    isAdmin: cachedIsAdmin,
    timestamp: cacheTimestamp,
  }),
  
  /**
   * Pre-warm the cache (useful after login)
   */
  preload: async () => {
    try {
      await fetchUserRoleData();
      if (IS_DEV) {
        console.log("[useUserRole] Cache preloaded successfully");
      }
    } catch (err) {
      if (IS_DEV) {
        console.error("[useUserRole] Cache preload failed:", err);
      }
    }
  },
};
