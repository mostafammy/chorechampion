/**
 * User Role Hook
 * ==============
 *
 * React hook to get current user's role information from JWT token.
 * Used for conditional UI rendering and client-side validation.
 */

import { useState, useEffect } from "react";
import { IS_DEV } from "@/lib/utils";

export type UserRole = "ADMIN" | "admin" | "USER" | "user" | null;

interface UseUserRoleResult {
  userRole: UserRole;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useUserRole(): UseUserRoleResult {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = userRole === "ADMIN" || userRole === "admin";

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/auth/user-info", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch user role: ${response.status}`);
        }

        const data = await response.json();
        setUserRole(data.role || null);

        if (IS_DEV) {
          console.log("[useUserRole] User role fetched:", data.role);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch user role";
        setError(errorMessage);
        setUserRole(null);

        if (IS_DEV) {
          console.error("[useUserRole] Error fetching user role:", err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  return {
    userRole,
    isAdmin,
    isLoading,
    error,
  };
}
