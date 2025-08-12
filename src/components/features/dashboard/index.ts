/**
 * ✅ ENTERPRISE DASHBOARD DOMAIN - PUBLIC API
 *
 * Domain-driven feature module with clean public interface.
 * Follows enterprise patterns: barrel exports, dependency injection, type safety.
 *
 * @module Dashboard
 * @version 1.0.0
 * @author Principal Engineering Team
 */

// ✅ COMPONENTS - Public component exports
export { Dashboard } from "./components/Dashboard";
export { DashboardHeader } from "./components/DashboardHeader";
export { DashboardStats } from "./components/DashboardStats";
export { DashboardMemberGrid } from "./components/DashboardMemberGrid";
export { DashboardMemberCard } from "./components/DashboardMemberCard";
export { DashboardContent } from "./components/DashboardContent";

// ✅ TASK FILTERING - Interactive filtering components
export { TaskFilterTabs, CompactTaskFilter } from "./components/TaskFilterTabs";

// ✅ TASK COMPLETION - Professional completion component
export {
  TaskCompletionButton,
  default as TaskCompletionButtonDefault,
} from "./components/TaskCompletionButton";

// ✅ ENTERPRISE WRAPPER - Drop-in replacement for original Dashboard
export { EnterpriseDashboard } from "./EnterpriseDashboard";
export { default as DashboardReplacement } from "./EnterpriseDashboard";

// ✅ HOOKS - Custom hooks for dashboard domain
export { useDashboardData } from "./hooks/useDashboardData";
export { useDashboardStats } from "./hooks/useDashboardStats";
export { useMemberCardGradients } from "./hooks/useMemberCardGradients";
export {
  useTaskFiltering,
  type UseTaskFilteringReturn,
} from "./hooks/useTaskFiltering";
export {
  useTaskCompletion,
  type UseTaskCompletionReturn,
} from "./hooks/useTaskCompletion";
export {
  useRoleBasedTaskControl,
  useTaskCompletionPermissions,
  useScoreAdjustmentPermissions,
  type TaskControlPermissions,
  type UseRoleBasedTaskControlReturn,
} from "./hooks/useRoleBasedTaskControl";

// ✅ TYPES - Domain-specific types
export type {
  DashboardProps,
  DashboardMemberData,
  DashboardStats as IDashboardStats,
  MemberCardGradient,
  DashboardTabConfig,
  DashboardHeaderProps,
  DashboardStatsProps,
  DashboardMemberGridProps,
  DashboardContentProps,
  DashboardTabsProps,
  DashboardContextValue,
  UseDashboardDataReturn,
  UseDashboardStatsReturn,
  UseMemberCardGradientsReturn,
  // Task Filtering Types
  TaskFilter,
  TaskFilterPeriod,
  TaskFilterState,
  TaskFilterOption,
  TaskFilterStats,
} from "./types";

// ✅ PROVIDERS - Domain context providers
export { DashboardProvider } from "./providers/DashboardProvider";
export { useDashboardContext } from "./providers/DashboardProvider";
