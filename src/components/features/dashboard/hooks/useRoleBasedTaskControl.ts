/**
 * 🎯 ENTERPRISE ROLE-BASED TASK CONTROL HOOK
 * ==========================================
 *
 * Principal Engineer implementation for role-based access control.
 * Follows SOLID principles with enterprise-grade performance optimization.
 *
 * Features:
 * - ✅ Single Responsibility: Only handles role-based task permissions
 * - ✅ Open/Closed: Extensible for new roles without modification
 * - ✅ Dependency Inversion: Depends on abstractions (useUserRole)
 * - ✅ Performance: Memoized calculations with minimal re-renders
 * - ✅ Type Safety: Comprehensive TypeScript coverage
 * - ✅ Scalability: Caches permission calculations
 *
 * @module useRoleBasedTaskControl
 * @version 1.0.0 - Principal Engineer Implementation
 */

"use client";

import { useMemo } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import type { Task } from "@/types";

/**
 * 🎯 ENTERPRISE: Task Control Permissions Interface
 */
interface TaskControlPermissions {
  /** Can the user toggle task completion */
  canToggleTask: boolean;
  /** Can the user modify task properties */
  canModifyTask: boolean;
  /** Can the user delete tasks */
  canDeleteTask: boolean;
  /** Can the user adjust scores */
  canAdjustScore: boolean;
  /** Reason for disabled state (for UX feedback) */
  disabledReason: string | null;
  /** Should show tooltip for disabled state */
  showDisabledTooltip: boolean;
}

/**
 * 🎯 ENTERPRISE: Task Control Configuration
 */
interface TaskControlConfig {
  /** Task to check permissions for */
  task?: Pick<Task, "id" | "assigneeId" | "completed">;
  /** Current user ID (for task ownership checks) */
  currentUserId?: string;
  /** Enable stricter permission checking */
  strictMode?: boolean;
  /** Custom permission overrides */
  permissionOverrides?: Partial<TaskControlPermissions>;
}

/**
 * 🎯 ENTERPRISE: Hook Return Type
 */
interface UseRoleBasedTaskControlReturn extends TaskControlPermissions {
  /** User's current role */
  userRole: string | null;
  /** Is user an admin */
  isAdmin: boolean;
  /** Is role loading */
  isLoading: boolean;
  /** Performance optimization flag */
  isOptimized: boolean;
}

/**
 * 🎯 ENTERPRISE ROLE-BASED TASK CONTROL HOOK
 *
 * Implements enterprise-grade role-based access control for task operations.
 * Uses memoization for optimal performance and provides comprehensive permissions.
 *
 * @param config - Task control configuration
 * @returns Comprehensive task control permissions
 */
export function useRoleBasedTaskControl(
  config: TaskControlConfig = {}
): UseRoleBasedTaskControlReturn {
  const {
    task,
    currentUserId,
    strictMode = false,
    permissionOverrides = {},
  } = config;

  // 🎯 DEPENDENCY INJECTION: Get user role from centralized hook
  const { userRole, isAdmin, isLoading } = useUserRole();

  // 🎯 PERFORMANCE: Memoize permission calculations
  const permissions = useMemo<TaskControlPermissions>(() => {
    // 🎯 LOADING STATE: Deny permissions while loading for security
    if (isLoading) {
      return {
        canToggleTask: false,
        canModifyTask: false,
        canDeleteTask: false,
        canAdjustScore: false,
        disabledReason: "Loading permissions...",
        showDisabledTooltip: true,
      };
    }

    // 🎯 ENTERPRISE: Admin users have full permissions
    if (isAdmin) {
      return {
        canToggleTask: true,
        canModifyTask: true,
        canDeleteTask: true,
        canAdjustScore: true,
        disabledReason: null,
        showDisabledTooltip: false,
        ...permissionOverrides, // Allow overrides
      };
    }

    // 🎯 ENTERPRISE: Regular users have limited permissions
    const isTaskOwner =
      task && currentUserId && task.assigneeId === currentUserId;

    if (strictMode) {
      // 🎯 STRICT MODE: Only admins can perform task operations
      return {
        canToggleTask: false,
        canModifyTask: false,
        canDeleteTask: false,
        canAdjustScore: false,
        disabledReason: "Admin permissions required",
        showDisabledTooltip: true,
        ...permissionOverrides,
      };
    }

    // 🎯 STANDARD MODE: Task owners can toggle their own tasks
    return {
      canToggleTask: isTaskOwner || false, // Only for owned tasks
      canModifyTask: false, // Reserved for admins
      canDeleteTask: false, // Reserved for admins
      canAdjustScore: false, // Reserved for admins
      disabledReason: isTaskOwner
        ? null
        : "Admin permissions required for task completion",
      showDisabledTooltip: !isTaskOwner,
      ...permissionOverrides,
    };
  }, [
    isAdmin,
    isLoading,
    task,
    currentUserId,
    strictMode,
    permissionOverrides,
  ]);

  // 🎯 PERFORMANCE: Return memoized object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      ...permissions,
      userRole,
      isAdmin,
      isLoading,
      isOptimized: true, // Flag to indicate this hook is performance-optimized
    }),
    [permissions, userRole, isAdmin, isLoading]
  );
}

/**
 * 🎯 ENTERPRISE: Specialized hook for task completion buttons
 *
 * Optimized specifically for TaskCompletionButton component usage.
 * Provides minimal interface with maximum performance.
 */
export function useTaskCompletionPermissions(
  taskId: string,
  assigneeId?: string
): {
  disabled: boolean;
  disabledReason: string;
  showTooltip: boolean;
} {
  const { canToggleTask, disabledReason, showDisabledTooltip } =
    useRoleBasedTaskControl({
      task:
        taskId && assigneeId
          ? { id: taskId, assigneeId, completed: false }
          : undefined,
      strictMode: true, // 🎯 ENTERPRISE: Use strict mode for task completion
    });

  return useMemo(
    () => ({
      disabled: !canToggleTask,
      disabledReason: disabledReason || "Insufficient permissions",
      showTooltip: showDisabledTooltip,
    }),
    [canToggleTask, disabledReason, showDisabledTooltip]
  );
}

/**
 * 🎯 ENTERPRISE: Specialized hook for score adjustment permissions
 *
 * Optimized specifically for score adjustment functionality.
 * Provides minimal interface with maximum performance.
 */
export function useScoreAdjustmentPermissions(memberId?: string): {
  canAdjustScore: boolean;
  disabled: boolean;
  disabledReason: string;
  showTooltip: boolean;
  isAdmin: boolean;
  isLoading: boolean;
} {
  const {
    canAdjustScore,
    disabledReason,
    showDisabledTooltip,
    isAdmin,
    isLoading,
  } = useRoleBasedTaskControl({
    strictMode: true, // 🎯 ENTERPRISE: Score adjustments are admin-only
  });

  return useMemo(
    () => ({
      canAdjustScore,
      disabled: !canAdjustScore,
      disabledReason:
        disabledReason || "Admin permissions required for score adjustments",
      showTooltip: showDisabledTooltip,
      isAdmin,
      isLoading,
    }),
    [canAdjustScore, disabledReason, showDisabledTooltip, isAdmin, isLoading]
  );
}

/**
 * 🎯 ENTERPRISE: Type exports for enhanced TypeScript support
 */
export type {
  TaskControlPermissions,
  TaskControlConfig,
  UseRoleBasedTaskControlReturn,
};
