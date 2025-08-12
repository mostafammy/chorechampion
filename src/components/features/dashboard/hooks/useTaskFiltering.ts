/**
 * Production Task Filtering System
 *
 * Enterprise-grade filtering functionality for active tasks only.
 * Provides period-based filtering with performance optimization.
 *
 * Features:
 * - Period-based task filtering (all, daily, weekly, monthly)
 * - Performance-optimized calculations with memoization
 * - Type-safe operations
 * - Memory-efficient implementation
 *
 * @module useTaskFiltering
 * @version 3.0.0 - Production Ready
 */

import { useMemo, useState, useCallback } from "react";
import type { Task } from "@/types";
import type {
  TaskFilter,
  TaskFilterPeriod,
  TaskFilterState,
  TaskFilterOption,
  TaskFilterStats,
} from "../types";

/**
 * ✅ ENTERPRISE: Date Service - Simplified for Task Period Filtering
 *
 * Handles task period filtering based on assigned periods.
 * Simplified since we only filter active tasks by their assigned periods.
 */
class TaskDateService {
  /**
   * Check if a task falls within the specified period filter
   * @param task Task to check
   * @param period Period to filter by
   * @param referenceDate Base date for calculations (not used for active tasks)
   * @returns Whether task matches the period filter
   */
  static isTaskInPeriod(
    task: Task,
    period: TaskFilterPeriod,
    referenceDate: Date = new Date()
  ): boolean {
    if (period === "all") return true;

    // ✅ SIMPLIFIED LOGIC: Match task's assigned period with filter period
    // Since we only show active tasks, we filter by the task's assigned period
    return task.period === period;
  }

  /**
   * Get human-readable period label
   */
  static getPeriodLabel(period: TaskFilterPeriod): string {
    switch (period) {
      case "all":
        return "All Active Tasks";
      case "daily":
        return "Daily Tasks";
      case "weekly":
        return "Weekly Tasks";
      case "monthly":
        return "Monthly Tasks";
      default:
        return "Unknown";
    }
  }
}

/**
 * ✅ ENTERPRISE: Task Filter Calculator - Open/Closed Principle
 *
 * Handles all filtering calculations with extensible design.
 * Can be extended with new filter types without modifying existing code.
 */
class TaskFilterCalculator {
  /**
   * Apply all filters to a task list
   * @param tasks Original task list
   * @param filter Active filter configuration
   * @param referenceDate Date for period calculations
   * @returns Filtered task list
   */
  static applyFilters(
    tasks: Task[],
    filter: TaskFilter,
    referenceDate: Date = new Date()
  ): Task[] {
    if (tasks.length === 0) return tasks;

    return tasks.filter((task) => {
      // Only show active (incomplete) tasks
      if (task.completed) {
        return false;
      }

      // Apply period filter
      if (!TaskDateService.isTaskInPeriod(task, filter.period, referenceDate)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Calculate comprehensive statistics for filtered tasks
   * @param tasks Task list to analyze
   * @param referenceDate Date for calculations
   * @returns Filter statistics by period
   */
  static calculateStats(
    tasks: Task[],
    referenceDate: Date = new Date()
  ): Record<TaskFilterPeriod, TaskFilterStats> {
    const periods: TaskFilterPeriod[] = ["all", "daily", "weekly", "monthly"];

    const stats: Record<TaskFilterPeriod, TaskFilterStats> = {
      all: { total: 0, completed: 0, active: 0, completionRate: 0 },
      daily: { total: 0, completed: 0, active: 0, completionRate: 0 },
      weekly: { total: 0, completed: 0, active: 0, completionRate: 0 },
      monthly: { total: 0, completed: 0, active: 0, completionRate: 0 },
    };

    // Single pass through tasks for efficiency
    tasks.forEach((task) => {
      periods.forEach((period) => {
        if (TaskDateService.isTaskInPeriod(task, period, referenceDate)) {
          stats[period].total++;
          if (task.completed) {
            stats[period].completed++;
          } else {
            stats[period].active++;
          }
        }
      });
    });

    // Calculate completion rates
    periods.forEach((period) => {
      const periodStats = stats[period];
      periodStats.completionRate =
        periodStats.total > 0
          ? (periodStats.completed / periodStats.total) * 100
          : 0;
    });

    return stats;
  }

  /**
   * Generate filter options with availability checking
   * @param stats Filter statistics
   * @param activeFilter Current active filter
   * @returns Available filter options
   */
  static generateFilterOptions(
    stats: Record<TaskFilterPeriod, TaskFilterStats>,
    activeFilter: TaskFilter
  ): TaskFilterOption[] {
    const periods: TaskFilterPeriod[] = ["all", "daily", "weekly", "monthly"];

    return periods.map((period) => ({
      period,
      label: TaskDateService.getPeriodLabel(period),
      count: stats[period].total,
      isActive: activeFilter.period === period,
      disabled: stats[period].total === 0,
    }));
  }
}

/**
 * Production Task Filtering Hook
 *
 * Main hook that orchestrates filtering functionality for active tasks only.
 * Follows enterprise architecture patterns with clean separation of concerns.
 *
 * @param tasks - Array of tasks to filter
 * @param options - Optional configuration
 * @returns Task filtering state and operations
 */
export function useTaskFiltering(
  tasks: Task[],
  options: {
    referenceDate?: Date;
  } = {}
) {
  const { referenceDate = new Date() } = options;

  // ✅ PRODUCTION: Clean state management
  const [activeFilter, setActiveFilter] = useState<TaskFilter>(() => ({
    period: "all" as TaskFilterPeriod,
  }));

  // Performance-optimized memoized filter stats calculation
  const filterStats = useMemo<Record<TaskFilterPeriod, TaskFilterStats>>(() => {
    return TaskFilterCalculator.calculateStats(tasks, referenceDate);
  }, [tasks, referenceDate]);

  // Performance-optimized memoized filtered tasks
  const filteredTasks = useMemo(() => {
    return TaskFilterCalculator.applyFilters(
      tasks,
      activeFilter,
      referenceDate
    );
  }, [tasks, activeFilter, referenceDate]);

  // Performance-optimized memoized filter options
  const availableFilters = useMemo<TaskFilterOption[]>(() => {
    return TaskFilterCalculator.generateFilterOptions(
      filterStats,
      activeFilter
    );
  }, [filterStats, activeFilter]);

  // Actions: Filter update functions
  const updateFilter = useCallback((newFilter: Partial<TaskFilter>) => {
    setActiveFilter((prev) => ({ ...prev, ...newFilter }));
  }, []);

  const setPeriodFilter = useCallback(
    (period: TaskFilterPeriod) => {
      updateFilter({ period });
    },
    [updateFilter]
  );

  const resetFilters = useCallback(() => {
    setActiveFilter({
      period: "all",
    });
  }, []);

  // Utility: Get tasks by period
  const getTasksByPeriod = useCallback(
    (period: TaskFilterPeriod) => {
      if (period === "all") return tasks;
      return tasks.filter((task) =>
        TaskDateService.isTaskInPeriod(task, period, referenceDate)
      );
    },
    [tasks, referenceDate]
  );

  // Utility: Completion trend analysis
  const getCompletionTrend = useCallback(() => {
    const weeklyStats = filterStats.weekly;
    const dailyStats = filterStats.daily;

    return {
      dailyCompletion: dailyStats.completionRate,
      weeklyCompletion: weeklyStats.completionRate,
      trend:
        dailyStats.completionRate >= weeklyStats.completionRate ? "up" : "down",
    };
  }, [filterStats]);

  // Return state and actions
  const filterState: TaskFilterState = {
    activeFilter,
    filteredTasks,
    availableFilters,
    filterStats,
  };

  return {
    filterState,
    actions: {
      updateFilter,
      setPeriodFilter,
      resetFilters,
      getTasksByPeriod,
    },
    utils: {
      hasActiveFilters: activeFilter.period !== "all",
      totalFilteredCount: filteredTasks.length,
      completionRate:
        filteredTasks.length > 0
          ? (filteredTasks.filter((t) => t.completed).length /
              filteredTasks.length) *
            100
          : 0,
      isEmpty: filteredTasks.length === 0,
      hasCompletedTasks: filteredTasks.some((t) => t.completed),
      hasActiveTasks: filteredTasks.some((t) => !t.completed),
      getCompletionTrend,

      // Performance metrics
      performanceMetrics: {
        originalTaskCount: tasks.length,
        filteredTaskCount: filteredTasks.length,
        filterEfficiency:
          tasks.length > 0 ? (filteredTasks.length / tasks.length) * 100 : 0,
      },
    },
  };
}

export type UseTaskFilteringReturn = ReturnType<typeof useTaskFiltering>;
