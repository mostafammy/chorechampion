/**
 * ✅ ENTERPRISE DASHBOARD STATS HOOK
 *
 * Specialized hook for dashboard statistics management.
 * Follows single responsibility principle.
 *
 * @module useDashboardStats
 * @version 1.0.0
 */

import { useMemo } from "react";
import { useDashboardData } from "./useDashboardData";
import type { UseDashboardStatsReturn } from "../types";

/**
 * ✅ ENTERPRISE HOOK: Dashboard Statistics
 *
 * Provides dashboard statistics with loading and error states.
 * Delegates data processing to useDashboardData hook.
 *
 * @returns Dashboard statistics with state management
 */
export function useDashboardStats(): UseDashboardStatsReturn {
  const { dashboardStats, isLoading, error } = useDashboardData();

  // ✅ PERFORMANCE: Memoized return object
  const result = useMemo(
    () => ({
      stats: dashboardStats,
      isLoading,
      error,
    }),
    [dashboardStats, isLoading, error]
  );

  return result;
}
