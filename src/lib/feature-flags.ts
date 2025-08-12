/**
 * ✅ PRINCIPAL ENGINEER: FEATURE FLAG SYSTEM
 *
 * Safe deployment strategy for enterprise dashboard migration.
 * Allows gradual rollout and instant rollback if issues arise.
 *
 * @module FeatureFlags
 * @version 1.0.0
 */

// ✅ FEATURE FLAGS CONFIGURATION
export const FEATURE_FLAGS = {
  // Dashboard Migration
  ENTERPRISE_DASHBOARD:
    process.env.NEXT_PUBLIC_ENABLE_ENTERPRISE_DASHBOARD === "true" || false,
  DASHBOARD_A_B_TEST:
    process.env.NEXT_PUBLIC_DASHBOARD_AB_TEST === "true" || false,

  // Future Features
  ENHANCED_ANALYTICS: false,
  NEW_TASK_SYSTEM: false,
} as const;

// ✅ FEATURE FLAG HELPER
export const isFeatureEnabled = (flag: keyof typeof FEATURE_FLAGS): boolean => {
  return FEATURE_FLAGS[flag];
};

// ✅ USER-BASED FEATURE ROLLOUT (for A/B testing)
export const isUserInFeatureGroup = (
  userId: string,
  feature: string
): boolean => {
  if (!userId) return false;

  // Simple hash-based distribution for A/B testing
  const hash = userId
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return hash % 2 === 0; // 50% distribution
};

// ✅ SAFE DASHBOARD SELECTOR
export const shouldUseEnterpriseDashboard = (userId?: string): boolean => {
  // Force enable for testing
  if (isFeatureEnabled("ENTERPRISE_DASHBOARD")) return true;

  // A/B testing rollout
  if (isFeatureEnabled("DASHBOARD_A_B_TEST") && userId) {
    return isUserInFeatureGroup(userId, "enterprise_dashboard");
  }

  return false;
};
