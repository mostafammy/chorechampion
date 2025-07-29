/**
 * User Role Hook
 * ==============
 *
 * React hook to get current user's role information from AppProvider context.
 * Provides instant access to user role loaded server-side for optimal performance.
 * 
 * ✅ PERFORMANCE: Uses server-side loaded data with client-side fallback
 * ✅ UX: No loading states - instant role access eliminates visual flicker  
 * ✅ SCALABILITY: Centralized user role management through AppProvider
 */

import { useAppContext } from "@/context/app-provider";
import { IS_DEV } from "@/lib/utils";

export type UserRole = "ADMIN" | "admin" | "USER" | "user" | null;

interface UseUserRoleResult {
  userRole: UserRole;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * ✅ ENHANCED: Hook now uses AppProvider context for instant role access
 * Server-side role loading eliminates API calls and loading states
 */
export function useUserRole(): UseUserRoleResult {
  const { auth } = useAppContext();
  
  return {
    userRole: auth.userRole as UserRole,
    isAdmin: auth.isAdmin,
    isLoading: auth.isLoading, // Uses auth loading state instead of separate loading
    error: null, // Error handling now managed by AppProvider
  };
}

// ✅ LEGACY: Maintain cache utilities for compatibility with existing logout logic
export const userRoleCache = {
  /**
   * Clear the user role cache (useful after login/logout)
   * Note: Now delegates to AppProvider which manages user role state
   */
  clear: () => {
    if (IS_DEV) {
      console.log("[useUserRole] Cache clearing delegated to AppProvider context");
    }
    // AppProvider handles role clearing on logout via useEffect
  },
  
  /**
   * Get current cache status  
   * Note: Now reflects AppProvider state instead of local cache
   */
  getStatus: () => ({
    cached: true, // Always cached since loaded server-side
    valid: true, // Always valid since managed by AppProvider
    role: null, // Would need context access to return actual role
    isAdmin: false, // Would need context access to return actual status
    timestamp: Date.now(), // Current timestamp since always fresh
  }),
  
  /**
   * Pre-warm the cache (useful after login)
   * Note: No longer needed since AppProvider handles role management
   */
  preload: async () => {
    if (IS_DEV) {
      console.log("[useUserRole] Preloading not needed - AppProvider manages role state");
    }
    // AppProvider loads role server-side and handles client-side fallback
  },
};
