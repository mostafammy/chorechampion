"use client";

/**
 * ✅ ENTERPRISE ARCHIVE FILTERING HOOK
 *
 * Advanced filtering and sorting logic for archive data.
 * Implements complex business rules with performance optimization.
 *
 * @module useArchiveFiltering
 * @version 1.0.0
 * @author Principal Engineering Team
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  createDateBoundaries,
  getTimezoneInfo,
  isToday as isTodayTimezone,
  parseTimezoneAwareDate,
} from "@/lib/utils/datetime";
import type {
  ArchiveFilterState,
  ArchiveSortBy,
  ArchiveFilterPeriod,
  ArchiveViewMode,
  ArchiveTableRow,
  UseArchiveFilteringReturn,
} from "../types";

/**
 * Default filter state
 */
const DEFAULT_FILTER: ArchiveFilterState = {
  sortBy: "date",
  filterPeriod: "all",
  viewMode: "table",
  searchQuery: "",
  selectedMember: undefined,
};

/**
 * ✅ ENTERPRISE PATTERN: Advanced filtering with performance optimization
 */
export function useArchiveFiltering(
  data: ArchiveTableRow[],
  initialFilter: Partial<ArchiveFilterState> = {}
): UseArchiveFilteringReturn {
  // ✅ STATE MANAGEMENT: Controlled filter state
  const [filter, setFilterState] = useState<ArchiveFilterState>({
    ...DEFAULT_FILTER,
    ...initialFilter,
  });

  // ✅ PERFORMANCE: Memoized date range calculations with timezone support
  const dateRanges = useMemo(() => {
    const boundaries = createDateBoundaries();

    // Development logging for timezone awareness
    if (process.env.NODE_ENV === "development") {
      const timezoneInfo = getTimezoneInfo();
      console.log("[useArchiveFiltering] Timezone-aware date ranges:", {
        userTimezone: timezoneInfo.timezone,
        today: boundaries.today.toLocaleString(),
        week: boundaries.week.toLocaleString(),
        month: boundaries.month.toLocaleString(),
        timezoneOffset: timezoneInfo.offsetHours,
      });
    }

    return boundaries;
  }, []);

  // ✅ BUSINESS LOGIC: Complex filtering algorithm with timezone accuracy
  const filteredData = useMemo((): ArchiveTableRow[] => {
    let result = [...data];

    // 🔧 DEBUG: Log filtering data when looking for today's tasks
    if (
      process.env.NODE_ENV === "development" &&
      filter.filterPeriod === "today"
    ) {
      console.log("[useArchiveFiltering] 🔍 TODAY FILTER DEBUG:", {
        totalRows: data.length,
        totalTasks: data.reduce((sum, row) => sum + row.tasks.length, 0),
        currentTime: new Date().toLocaleString(),
        currentDate: new Date().toDateString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        todayBoundary: dateRanges.today?.toLocaleString(),
      });

      // Debug each task's date classification
      data.forEach((row) => {
        row.tasks.forEach((task) => {
          const parsedDate = parseTimezoneAwareDate(task.completedDate);
          const isTaskToday = isTodayTimezone(parsedDate);

          console.log(`[useArchiveFiltering] Task "${task.name}":`, {
            originalDate: task.completedDate,
            originalType: typeof task.completedDate,
            parsedDate: parsedDate.toLocaleString(),
            parsedISO: parsedDate.toISOString(),
            isToday: isTaskToday,
            isDateValid: !isNaN(parsedDate.getTime()),
            timeDiffHours:
              (Date.now() - parsedDate.getTime()) / (1000 * 60 * 60),
          });
        });
      });
    }

    // 1. Apply period filter with timezone-aware comparison
    if (filter.filterPeriod !== "all") {
      const cutoffDate = dateRanges[filter.filterPeriod];
      result = result
        .map((row) => ({
          ...row,
          tasks: row.tasks.filter((task) => {
            // 🔧 CRITICAL FIX: Use timezone-aware date parsing
            // This handles cases where dates might be stored in different timezone assumptions
            const completedDate = parseTimezoneAwareDate(task.completedDate, {
              assumeUserTimezone: true, // Assume stored dates represent user's local time
            });

            // 🔧 FIXED: Proper timezone-aware date comparison
            let isWithinPeriod = false;

            if (filter.filterPeriod === "today") {
              // Special handling for "today" filter - use isToday function
              isWithinPeriod = isTodayTimezone(completedDate);

              if (process.env.NODE_ENV === "development") {
                console.log(
                  `[useArchiveFiltering] TODAY filter - Task "${task.name}":`,
                  {
                    originalDate: task.completedDate,
                    parsedDate: completedDate.toLocaleString(),
                    parsedISO: completedDate.toISOString(),
                    isToday: isWithinPeriod,
                    daysDiff: Math.floor(
                      (Date.now() - completedDate.getTime()) /
                        (1000 * 60 * 60 * 24)
                    ),
                    hoursDiff: Math.floor(
                      (Date.now() - completedDate.getTime()) / (1000 * 60 * 60)
                    ),
                  }
                );
              }
            } else {
              // For other periods, use cutoff date comparison
              isWithinPeriod = completedDate >= cutoffDate;
            }

            if (process.env.NODE_ENV === "development" && isWithinPeriod) {
              const timezoneInfo = getTimezoneInfo();
              console.log(
                `[useArchiveFiltering] ✅ Task "${task.name}" included in ${filter.filterPeriod}:`,
                {
                  originalInput: task.completedDate,
                  completedDate: completedDate.toLocaleString(),
                  completedISO: completedDate.toISOString(),
                  cutoffDate: cutoffDate.toLocaleString(),
                  cutoffISO: cutoffDate.toISOString(),
                  userTimezone: timezoneInfo.timezone,
                  timezoneOffset: timezoneInfo.offsetHours,
                  isToday:
                    filter.filterPeriod === "today"
                      ? "Used isToday()"
                      : "Used cutoff comparison",
                  parseMethod:
                    "parseTimezoneAwareDate with assumeUserTimezone=true",
                }
              );
            }

            return isWithinPeriod;
          }),
        }))
        .filter((row) => row.tasks.length > 0); // Remove members with no tasks in period
    }

    // 2. Apply member filter
    if (filter.selectedMember) {
      result = result.filter((row) => row.member.id === filter.selectedMember);
    }

    // 3. Apply search filter
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase().trim();
      result = result.filter((row) => {
        // Search in member name
        const memberNameMatch = row.member.name.toLowerCase().includes(query);

        // Search in task names
        const taskNameMatch = row.tasks.some((task) =>
          task.name.toLowerCase().includes(query)
        );

        // Search in scores (convert to string)
        const scoreMatch = row.tasks.some((task) =>
          task.score.toString().includes(query)
        );

        return memberNameMatch || taskNameMatch || scoreMatch;
      });
    }

    // 4. Apply sorting
    result.sort((a, b) => {
      switch (filter.sortBy) {
        case "name":
          return a.member.name.localeCompare(b.member.name);

        case "score":
          return b.member.totalScore - a.member.totalScore; // Descending

        case "performance":
          // Sort by completion rate, then by total score
          if (a.member.completionRate !== b.member.completionRate) {
            return b.member.completionRate - a.member.completionRate;
          }
          return b.member.totalScore - a.member.totalScore;

        case "date":
        default:
          // Sort by most recent task completion with timezone awareness
          const aLastTask = parseTimezoneAwareDate(
            a.member.recentActivity.lastTask,
            {
              assumeUserTimezone: true,
            }
          );
          const bLastTask = parseTimezoneAwareDate(
            b.member.recentActivity.lastTask,
            {
              assumeUserTimezone: true,
            }
          );

          // Log timezone-aware sorting for development
          if (process.env.NODE_ENV === "development") {
            const timezoneInfo = getTimezoneInfo();
            console.log(`[useArchiveFiltering] Sorting by date:`, {
              memberA: a.member.name,
              memberB: b.member.name,
              aLastTaskOriginal: a.member.recentActivity.lastTask,
              bLastTaskOriginal: b.member.recentActivity.lastTask,
              aLastTask: aLastTask.toLocaleString(),
              bLastTask: bLastTask.toLocaleString(),
              userTimezone: timezoneInfo.timezone,
              parseMethod:
                "parseTimezoneAwareDate with assumeUserTimezone=true",
            });
          }

          return bLastTask.getTime() - aLastTask.getTime(); // Most recent first
      }
    });

    return result;
  }, [data, filter, dateRanges]);

  // ✅ PERFORMANCE: Memoized filter statistics
  const filterStats = useMemo(() => {
    const hasActiveFilters =
      filter.filterPeriod !== "all" ||
      !!filter.searchQuery ||
      !!filter.selectedMember;

    return {
      totalItems: data.length,
      filteredItems: filteredData.length,
      hasActiveFilters,
    };
  }, [data.length, filteredData.length, filter]);

  // ✅ SOLID PRINCIPLES: Interface Segregation - Specific update functions
  const setFilter = useCallback((newFilter: Partial<ArchiveFilterState>) => {
    setFilterState((prev) => ({ ...prev, ...newFilter }));
  }, []);

  const resetFilter = useCallback(() => {
    setFilterState(DEFAULT_FILTER);
  }, []);

  // ✅ CONVENIENCE METHODS: Specific filter actions
  const setSortBy = useCallback(
    (sortBy: ArchiveSortBy) => {
      setFilter({ sortBy });
    },
    [setFilter]
  );

  const setFilterPeriod = useCallback(
    (filterPeriod: ArchiveFilterPeriod) => {
      setFilter({ filterPeriod });
    },
    [setFilter]
  );

  const setViewMode = useCallback(
    (viewMode: ArchiveViewMode) => {
      setFilter({ viewMode });
    },
    [setFilter]
  );

  const setSearchQuery = useCallback(
    (searchQuery: string) => {
      setFilter({ searchQuery });
    },
    [setFilter]
  );

  const setSelectedMember = useCallback(
    (selectedMember: string | undefined) => {
      setFilter({ selectedMember });
    },
    [setFilter]
  );

  // ✅ DEBUGGING: Development logging
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      console.log("[useArchiveFiltering] Filter updated:", {
        filter,
        resultCount: filteredData.length,
        hasActiveFilters: filterStats.hasActiveFilters,
      });
    }, [filter, filteredData.length, filterStats.hasActiveFilters]);
  }

  return {
    filter,
    setFilter,
    resetFilter,
    filteredData,
    filterStats,
    // Convenience methods
    setSortBy,
    setFilterPeriod,
    setViewMode,
    setSearchQuery,
    setSelectedMember,
  };
}

// ✅ UTILITY: Filter validation
export function isValidFilter(filter: Partial<ArchiveFilterState>): boolean {
  const validSortBy: ArchiveSortBy[] = ["date", "score", "name", "performance"];
  const validPeriod: ArchiveFilterPeriod[] = [
    "all",
    "today",
    "week",
    "month",
    "quarter",
    "year",
  ];
  const validViewMode: ArchiveViewMode[] = ["table", "cards", "timeline"];

  return (
    (!filter.sortBy || validSortBy.includes(filter.sortBy)) &&
    (!filter.filterPeriod || validPeriod.includes(filter.filterPeriod)) &&
    (!filter.viewMode || validViewMode.includes(filter.viewMode)) &&
    (!filter.searchQuery || typeof filter.searchQuery === "string") &&
    (!filter.selectedMember || typeof filter.selectedMember === "string")
  );
}

// ✅ UTILITY: Get filter summary for accessibility
export function getFilterSummary(
  filter: ArchiveFilterState,
  stats: { totalItems: number; filteredItems: number }
): string {
  const parts: string[] = [];

  if (filter.filterPeriod !== "all") {
    parts.push(`filtered by ${filter.filterPeriod}`);
  }

  if (filter.searchQuery) {
    parts.push(`searching for "${filter.searchQuery}"`);
  }

  if (filter.selectedMember) {
    parts.push(`filtered by member`);
  }

  parts.push(`sorted by ${filter.sortBy}`);
  parts.push(`showing ${stats.filteredItems} of ${stats.totalItems} items`);

  return parts.join(", ");
}

export default useArchiveFiltering;
