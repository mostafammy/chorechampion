/**
 * ✅ ENTERPRISE DASHBOARD TYPES
 *
 * Type-safe definitions for dashboard domain.
 * Ensures type safety across all dashboard components and hooks.
 *
 * @module DashboardTypes
 * @version 1.0.0
 */

import type { Member, Task } from "@/types";

// ✅ CORE DASHBOARD TYPES
export interface DashboardProps {
  /** Optional className for styling override */
  className?: string;
  /** Optional test ID for testing */
  testId?: string;
}

export interface DashboardMemberData extends Member {
  /** Active tasks assigned to this member */
  tasks: Task[];
  /** Score from completed tasks */
  completedScore: number;
  /** Total score including adjustments */
  totalScore: number;
  /** Total possible score from all tasks */
  totalPossibleScore: number;
  /** Completion rate percentage (0-100) */
  completionRate: number;
  /** Task counts by period */
  taskCounts: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export interface DashboardStats {
  /** Total number of members */
  totalMembers: number;
  /** Total number of active tasks */
  totalActiveTasks: number;
  /** Total number of completed tasks */
  totalCompletedTasks: number;
  /** Total points across all members */
  totalPoints: number;
  /** Average completion rate percentage */
  averageCompletion: number;
  /** Top performing member */
  topPerformer: DashboardMemberData | null;
}

export interface MemberCardGradient {
  /** CSS class string for card gradient */
  className: string;
  /** Gradient index for consistent assignment */
  index: number;
  /** WCAG contrast ratio compliance (optional) */
  contrastRatio?: string;
  /** Accessibility readability score (optional) */
  readabilityScore?: string;
}

export interface DashboardTabConfig {
  /** Unique identifier for the tab */
  id: string;
  /** Display label for the tab */
  label: string;
  /** Icon component for the tab */
  icon: React.ComponentType<any>;
  /** Optional badge count */
  badgeCount?: number;
  /** Whether tab is disabled */
  disabled?: boolean;
}

// ✅ TASK FILTERING TYPES
export type TaskFilterPeriod = "all" | "daily" | "weekly" | "monthly";

export interface TaskFilter {
  /** Period to filter by */
  period: TaskFilterPeriod;
  /** Always show active tasks only - completed tasks are for reference */
  // Note: Removed showCompleted/showActive as we only care about active tasks
}

export interface TaskFilterState {
  /** Current active filter */
  activeFilter: TaskFilter;
  /** Filtered tasks based on current filter */
  filteredTasks: Task[];
  /** Available filter options */
  availableFilters: TaskFilterOption[];
  /** Filter stats for each period */
  filterStats: Record<TaskFilterPeriod, TaskFilterStats>;
}

export interface TaskFilterOption {
  /** Filter period */
  period: TaskFilterPeriod;
  /** Display label */
  label: string;
  /** Number of tasks in this period */
  count: number;
  /** Whether this filter is currently active */
  isActive: boolean;
  /** Whether this filter is disabled */
  disabled: boolean;
}

export interface TaskFilterStats {
  /** Total tasks in this period */
  total: number;
  /** Completed tasks in this period */
  completed: number;
  /** Active tasks in this period */
  active: number;
  /** Completion percentage */
  completionRate: number;
}

// ✅ HOOK RETURN TYPES
export interface UseDashboardDataReturn {
  /** Processed member data with calculations */
  memberData: DashboardMemberData[];
  /** Dashboard statistics */
  dashboardStats: DashboardStats;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Refresh function */
  refresh: () => Promise<void>;
}

export interface UseDashboardStatsReturn {
  /** Dashboard statistics */
  stats: DashboardStats;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
}

export interface UseMemberCardGradientsReturn {
  /** Get gradient for member by index */
  getGradient: (index: number) => MemberCardGradient;
  /** All available gradients */
  gradients: MemberCardGradient[];
}

// ✅ COMPONENT PROP TYPES
export interface DashboardHeaderProps {
  /** Dashboard statistics for header display */
  stats: DashboardStats;
  /** Optional className */
  className?: string;
}

export interface DashboardStatsProps {
  /** Dashboard statistics */
  stats: DashboardStats;
  /** Loading state */
  isLoading?: boolean;
  /** Optional className */
  className?: string;
}

export interface DashboardMemberGridProps {
  /** Member data with calculations */
  memberData: DashboardMemberData[];
  /** Function to handle task toggle */
  onToggleTask: (taskId: string) => Promise<void>;
  /** Function to handle score adjustment */
  onAdjustScore: (
    memberId: string,
    delta: number,
    reason: string
  ) => Promise<void>;
  /** Loading state */
  isLoading?: boolean;
  /** Optional className */
  className?: string;
}

export interface DashboardTabsProps {
  /** Member data for tabs */
  memberData: DashboardMemberData[];
  /** Function to handle task operations */
  onToggleTask: (taskId: string) => Promise<void>;
  /** Function to handle score adjustments */
  onAdjustScore: (
    memberId: string,
    delta: number,
    reason: string
  ) => Promise<void>;
  /** Optional className */
  className?: string;
}

export interface DashboardContentProps {
  /** Member data with calculations */
  memberData: DashboardMemberData[];
  /** Function to handle task toggle */
  onToggleTask: (taskId: string) => Promise<void>;
  /** Function to handle score adjustment */
  onAdjustScore: (
    memberId: string,
    delta: number,
    reason: string
  ) => Promise<void>;
  /** Loading state */
  isLoading?: boolean;
  /** Optional className */
  className?: string;
}

// ✅ CONTEXT TYPES
export interface DashboardContextValue {
  /** Dashboard state */
  state: {
    memberData: DashboardMemberData[];
    stats: DashboardStats;
    isLoading: boolean;
    error: Error | null;
  };
  /** Dashboard actions */
  actions: {
    refresh: () => Promise<void>;
    updateMemberData: (data: DashboardMemberData[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: Error | null) => void;
  };
}
