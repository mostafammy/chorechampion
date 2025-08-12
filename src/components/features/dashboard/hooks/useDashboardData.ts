/**
 * ✅ ENTERPRISE DASHBOARD DATA HOOK
 *
 * Custom hook that encapsulates dashboard data logic.
 * Follows SOLID principles: Single responsibility, dependency injection.
 *
 * @module useDashboardData
 * @version 1.0.0
 */

import { useMemo, useCallback, useState } from "react";
import { useAppContext } from "@/context/app-provider";
import type {
  DashboardMemberData,
  DashboardStats,
  UseDashboardDataReturn,
} from "../types";

/**
 * ✅ ENTERPRISE HOOK: Dashboard Data Management
 *
 * Encapsulates all dashboard data processing logic.
 * Provides memoized calculations and type-safe operations.
 *
 * @returns Dashboard data with computed statistics
 */
export function useDashboardData(): UseDashboardDataReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { members, activeTasks, archivedTasks, scoreAdjustments } =
    useAppContext();

  // ✅ PERFORMANCE: Memoized member data calculations
  const memberData = useMemo<DashboardMemberData[]>(() => {
    return members.map((member) => {
      const memberActiveTasks = activeTasks.filter(
        (task) => task.assigneeId === member.id
      );
      const memberArchivedTasks = archivedTasks.filter(
        (task) => task.assigneeId === member.id
      );

      const completedScore = memberArchivedTasks.reduce(
        (sum, task) => sum + task.score,
        0
      );
      const adjustmentScore = scoreAdjustments[member.id] || 0;
      const totalScore = completedScore + adjustmentScore;
      const totalPossibleScore = [
        ...memberActiveTasks,
        ...memberArchivedTasks,
      ].reduce((sum, task) => sum + task.score, 0);
      const completionRate =
        totalPossibleScore > 0 ? (totalScore / totalPossibleScore) * 100 : 0;

      return {
        ...member,
        tasks: memberActiveTasks,
        completedScore,
        totalScore,
        totalPossibleScore,
        completionRate,
        taskCounts: {
          daily: memberActiveTasks.filter((t) => t.period === "daily").length,
          weekly: memberActiveTasks.filter((t) => t.period === "weekly").length,
          monthly: memberActiveTasks.filter((t) => t.period === "monthly")
            .length,
        },
      };
    });
  }, [members, activeTasks, archivedTasks, scoreAdjustments]);

  // ✅ PERFORMANCE: Memoized dashboard statistics
  const dashboardStats = useMemo<DashboardStats>(() => {
    const totalMembers = memberData.length;
    const totalActiveTasks = activeTasks.length;
    const totalCompletedTasks = archivedTasks.length;
    const totalPoints = memberData.reduce(
      (sum, member) => sum + member.totalScore,
      0
    );
    const averageCompletion =
      totalMembers > 0
        ? memberData.reduce((sum, member) => sum + member.completionRate, 0) /
          totalMembers
        : 0;
    const topPerformer =
      memberData.length > 0
        ? memberData.reduce((top, member) =>
            member.totalScore > top.totalScore ? member : top
          )
        : null;

    return {
      totalMembers,
      totalActiveTasks,
      totalCompletedTasks,
      totalPoints,
      averageCompletion,
      topPerformer,
    };
  }, [memberData, activeTasks, archivedTasks]);

  // ✅ ENTERPRISE: Refresh function with error handling
  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Dashboard data is derived from context, so refresh happens
      // through context providers. This function is for future API calls.
      await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate async
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      console.error("[useDashboardData] Refresh failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    memberData,
    dashboardStats,
    isLoading,
    error,
    refresh,
  };
}
