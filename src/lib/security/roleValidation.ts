/**
 * 🔐 Role-Based Access Control Utilities
 * =====================================
 *
 * Centralized role validation for enterprise security.
 * Provides consistent, reusable role checking across all endpoints.
 *
 * Features:
 * - ✅ Performance optimized role validation
 * - ✅ Consistent error responses
 * - ✅ Comprehensive audit logging
 * - ✅ Type-safe role definitions
 * - ✅ Maintainable centralized logic
 */

import { NextResponse } from "next/server";
import { IS_DEV } from "@/lib/utils";

// ✅ SCALABILITY: Centralized role definitions
export const USER_ROLES = {
  ADMIN: "ADMIN",
  admin: "admin", // Support both cases for compatibility
  USER: "USER",
  user: "user",
} as const;

export type UserRole = keyof typeof USER_ROLES;

// ✅ MAINTAINABILITY: Role-based permission configurations
export const ROLE_PERMISSIONS = {
  SCORE_ADJUSTMENT: [USER_ROLES.ADMIN, USER_ROLES.admin],
  TASK_MANAGEMENT: [USER_ROLES.ADMIN, USER_ROLES.admin], // Admin-only task operations
  TASK_COMPLETION: [USER_ROLES.ADMIN, USER_ROLES.admin, USER_ROLES.USER, USER_ROLES.user], // ✅ FIXED: Allow users to complete their own tasks
  USER_MANAGEMENT: [USER_ROLES.ADMIN, USER_ROLES.admin],
} as const;

export type Permission = keyof typeof ROLE_PERMISSIONS;

// ✅ PERFORMANCE: Fast role validation interface
export interface RoleValidationResult {
  allowed: boolean;
  error?: {
    message: string;
    errorCode: string;
    statusCode: number;
    details: Record<string, any>;
  };
}

// ✅ SCALABILITY: User context interface
export interface AuthenticatedUser {
  id?: string;
  userId?: string;
  email: string;
  role: string;
  [key: string]: any;
}

/**
 * ✅ PERFORMANCE: High-performance role validation
 *
 * @param user - Authenticated user object
 * @param permission - Required permission level
 * @param endpoint - Endpoint name for logging (optional)
 * @returns Validation result with error details if access denied
 */
export function validateUserRole(
  user: AuthenticatedUser,
  permission: Permission,
  endpoint?: string
): RoleValidationResult {
  // ✅ PERFORMANCE: Get required roles for permission
  const allowedRoles = ROLE_PERMISSIONS[permission];

  // ✅ PERFORMANCE: Fast role check
  const userRole = user.role;
  const hasPermission = allowedRoles.includes(userRole as any);

  if (hasPermission) {
    return { allowed: true };
  }

  // ✅ AUDIT: Enhanced logging for access denials
  const logContext = {
    endpoint: endpoint || "unknown",
    userRole,
    userRoleType: typeof userRole,
    requiredRoles: allowedRoles,
    userId: user.userId || user.id,
    userEmail: user.email,
    timestamp: new Date().toISOString(),
  };

  if (IS_DEV) {
    console.log(`[RoleValidation] Access denied for ${endpoint}:`, logContext);
    console.log("Full user object:", JSON.stringify(user, null, 2));
  }

  // ✅ SECURITY: Consistent error response format
  return {
    allowed: false,
    error: {
      message:
        "Insufficient privileges. Admin role required for this operation.",
      errorCode: "INSUFFICIENT_ROLE",
      statusCode: 403,
      details: {
        requiredRoles: allowedRoles,
        userRole,
        endpoint: endpoint || "unknown",
        ...(IS_DEV && { fullContext: logContext }),
      },
    },
  };
}

/**
 * ✅ MAINTAINABILITY: Convenience function for creating role-denied responses
 *
 * @param validationResult - Result from validateUserRole
 * @returns NextResponse with proper error formatting
 */
export function createRoleErrorResponse(
  validationResult: RoleValidationResult
): NextResponse {
  if (validationResult.allowed || !validationResult.error) {
    throw new Error("Cannot create error response for allowed access");
  }

  const { error } = validationResult;

  return NextResponse.json(
    {
      error: error.message,
      errorCode: error.errorCode,
      ...error.details,
    },
    { status: error.statusCode }
  );
}

/**
 * ✅ PERFORMANCE: Express-style middleware for role validation
 *
 * @param permission - Required permission level
 * @param endpoint - Endpoint name for logging
 * @returns Function that validates user role and returns error response if denied
 */
export function requireRole(permission: Permission, endpoint?: string) {
  return (user: AuthenticatedUser): NextResponse | null => {
    const validation = validateUserRole(user, permission, endpoint);

    if (!validation.allowed) {
      return createRoleErrorResponse(validation);
    }

    return null; // No error = access allowed
  };
}

/**
 * ✅ AUDIT: Enhanced audit logging for successful role checks
 *
 * @param user - Authenticated user
 * @param permission - Permission that was validated
 * @param endpoint - Endpoint name
 * @param additionalContext - Extra context for logging
 */
export function logSuccessfulAccess(
  user: AuthenticatedUser,
  permission: Permission,
  endpoint: string,
  additionalContext?: Record<string, any>
): void {
  if (IS_DEV) {
    console.log(`[RoleValidation] Access granted for ${endpoint}:`, {
      permission,
      userRole: user.role,
      userId: user.userId || user.id,
      userEmail: user.email,
      endpoint,
      timestamp: new Date().toISOString(),
      ...additionalContext,
    });
  }
}

// ✅ SCALABILITY: Role checking utilities for specific use cases
export const RoleUtils = {
  isAdmin: (user: AuthenticatedUser): boolean =>
    validateUserRole(user, "SCORE_ADJUSTMENT", "role-check").allowed,

  canManageTasks: (user: AuthenticatedUser): boolean =>
    validateUserRole(user, "TASK_MANAGEMENT", "role-check").allowed,

  canCompleteTasks: (user: AuthenticatedUser): boolean =>
    validateUserRole(user, "TASK_COMPLETION", "role-check").allowed,

  canManageUsers: (user: AuthenticatedUser): boolean =>
    validateUserRole(user, "USER_MANAGEMENT", "role-check").allowed,
};

export default {
  validateUserRole,
  createRoleErrorResponse,
  requireRole,
  logSuccessfulAccess,
  RoleUtils,
  USER_ROLES,
  ROLE_PERMISSIONS,
};
