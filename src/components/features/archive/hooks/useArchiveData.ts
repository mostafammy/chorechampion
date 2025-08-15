"use client";

/**
 * ✅ ENTERPRISE ARCHIVE DATA HOOK
 *
 * Central data management hook for the Archive domain.
 * Implements dependency injection, memoization, and error handling.
 *
 * @module useArchiveData
 * @version 1.0.0
 * @author Principal Engineering Team
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAppContext } from "@/context/app-provider";
import type {
  UseArchiveDataReturn,
  ArchiveStats,
  ArchiveMemberPerformance,
  ArchiveTableRow,
} from "../types";
import type { ArchivedTask, Member } from "@/types";

/**
 * ✅ SOLID PRINCIPLES: Single Responsibility
 * This hook is solely responsible for archive data management
 */
export function useArchiveData(): UseArchiveDataReturn {
  // ✅ DEPENDENCY INJECTION: Get data from context (can be mocked for testing)
  const { archivedTasks, members } = useAppContext();

  // ✅ STATE MANAGEMENT: Local state for hook-specific concerns
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ PERFORMANCE: Memoized statistics calculation
  const stats = useMemo((): ArchiveStats => {
    try {
      if (!archivedTasks.length) {
        return {
          totalTasks: 0,
          totalScore: 0,
          uniqueMembers: 0,
          weeklyTasks: 0,
          monthlyTasks: 0,
          averageTasksPerMember: 0,
          lastUpdatedDate: new Date().toISOString(),
          topPerformer: null,
        };
      }

      const totalTasks = archivedTasks.length;
      const totalScore = archivedTasks.reduce(
        (sum, task) => sum + task.score,
        0
      );
      const uniqueMembers = new Set(
        archivedTasks.map((task) => task.assigneeId)
      ).size;

      // Calculate date-based statistics
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const weeklyTasks = archivedTasks.filter((task) => {
        const completedDate = new Date(task.completedDate);
        return completedDate >= lastWeek;
      }).length;

      const monthlyTasks = archivedTasks.filter((task) => {
        const completedDate = new Date(task.completedDate);
        return completedDate >= lastMonth;
      }).length;

      // Find the most recent task completion date
      const mostRecentTask = archivedTasks.reduce((latest, current) => {
        const currentDate = new Date(current.completedDate);
        const latestDate = new Date(latest?.completedDate || 0);
        return currentDate > latestDate ? current : latest;
      }, archivedTasks[0]);

      const lastUpdatedDate = mostRecentTask?.completedDate
        ? new Date(mostRecentTask.completedDate).toISOString()
        : new Date().toISOString();

      // Calculate top performer
      const memberPerformance = members.map((member) => {
        const memberTasks = archivedTasks.filter(
          (task) => task.assigneeId === member.id
        );
        const taskCount = memberTasks.length;
        const totalMemberScore = memberTasks.reduce(
          (sum, task) => sum + task.score,
          0
        );

        // Calculate recent activity
        const recentTasks = memberTasks.filter((task) => {
          const completedDate = new Date(task.completedDate);
          return completedDate >= lastWeek;
        });

        const lastTaskDate =
          memberTasks.length > 0
            ? memberTasks.reduce((latest, current) => {
                const currentDate = new Date(current.completedDate);
                const latestDate = new Date(latest.completedDate);
                return currentDate > latestDate ? current : latest;
              }).completedDate
            : new Date();

        return {
          id: member.id,
          name: member.name,
          avatar: member.avatar,
          taskCount,
          totalScore: totalMemberScore,
          averageScore:
            taskCount > 0 ? Math.round(totalMemberScore / taskCount) : 0,
          completionRate:
            taskCount > 0 ? Math.round((taskCount / totalTasks) * 100) : 0,
          recentActivity: {
            lastTask: new Date(lastTaskDate).toISOString(),
            streak: recentTasks.length,
            efficiency:
              recentTasks.length >= 3
                ? "high"
                : recentTasks.length >= 1
                ? "medium"
                : ("low" as const),
          },
        } satisfies ArchiveMemberPerformance;
      });

      const topPerformer = memberPerformance.reduce(
        (top, current) => (current.taskCount > top.taskCount ? current : top),
        memberPerformance[0] || null
      );

      return {
        totalTasks,
        totalScore,
        uniqueMembers,
        weeklyTasks,
        monthlyTasks,
        averageTasksPerMember:
          uniqueMembers > 0 ? Math.round(totalTasks / uniqueMembers) : 0,
        lastUpdatedDate,
        topPerformer,
      };
    } catch (err) {
      console.error("[useArchiveData] Error calculating stats:", err);
      setError("Failed to calculate archive statistics");
      return {
        totalTasks: 0,
        totalScore: 0,
        uniqueMembers: 0,
        weeklyTasks: 0,
        monthlyTasks: 0,
        averageTasksPerMember: 0,
        lastUpdatedDate: new Date().toISOString(),
        topPerformer: null,
      };
    }
  }, [archivedTasks, members]);

  // ✅ PERFORMANCE: Memoized members with tasks data
  const membersWithTasks = useMemo((): ArchiveTableRow[] => {
    try {
      return members
        .map((member) => {
          const memberTasks = archivedTasks.filter(
            (task) => task.assigneeId === member.id
          );
          const taskCount = memberTasks.length;
          const totalScore = memberTasks.reduce(
            (sum, task) => sum + task.score,
            0
          );

          // Calculate recent activity
          const now = new Date();
          const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const recentTasks = memberTasks.filter((task) => {
            const completedDate = new Date(task.completedDate);
            return completedDate >= lastWeek;
          });

          const lastTaskDate =
            memberTasks.length > 0
              ? memberTasks.reduce((latest, current) => {
                  const currentDate = new Date(current.completedDate);
                  const latestDate = new Date(latest.completedDate);
                  return currentDate > latestDate ? current : latest;
                }).completedDate
              : new Date();

          const memberPerformance: ArchiveMemberPerformance = {
            id: member.id,
            name: member.name,
            avatar: member.avatar,
            taskCount,
            totalScore,
            averageScore:
              taskCount > 0 ? Math.round(totalScore / taskCount) : 0,
            completionRate:
              stats.totalTasks > 0
                ? Math.round((taskCount / stats.totalTasks) * 100)
                : 0,
            recentActivity: {
              lastTask: new Date(lastTaskDate).toISOString(),
              streak: recentTasks.length,
              efficiency:
                recentTasks.length >= 3
                  ? "high"
                  : recentTasks.length >= 1
                  ? "medium"
                  : "low",
            },
          };

          return {
            id: member.id,
            member: memberPerformance,
            tasks: memberTasks,
            isExpanded: false,
          } satisfies ArchiveTableRow;
        })
        .filter((row) => row.tasks.length > 0); // Only show members with archived tasks
    } catch (err) {
      console.error(
        "[useArchiveData] Error processing members with tasks:",
        err
      );
      setError("Failed to process member task data");
      return [];
    }
  }, [members, archivedTasks, stats.totalTasks]);

  // ✅ SOLID PRINCIPLES: Open/Closed - Extensible refetch function
  const refetch = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // In a real application, this would trigger data refetch from API
      // For now, we just simulate a loading state since data comes from context
      await new Promise((resolve) => setTimeout(resolve, 500));

      console.log("[useArchiveData] Data refreshed successfully");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      console.error("[useArchiveData] Error refreshing data:", err);
      setError(`Failed to refresh archive data: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ✅ ERROR HANDLING: Clear errors when data changes
  useEffect(() => {
    if (error && (archivedTasks.length > 0 || members.length > 0)) {
      setError(null);
    }
  }, [archivedTasks.length, members.length, error]);

  // ✅ DEBUGGING: Development logging
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[useArchiveData] Data updated:", {
        archivedTasksCount: archivedTasks.length,
        membersCount: members.length,
        statsCalculated: !!stats,
        error,
      });
    }
  }, [archivedTasks.length, members.length, stats, error]);

  return {
    archivedTasks,
    members,
    stats,
    membersWithTasks,
    isLoading,
    error,
    refetch,
  };
}

export default useArchiveData;
