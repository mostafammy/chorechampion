/**
 * Enterprise Theme Utilities
 * Principal Engineer Implementation
 *
 * High-performance theme utilities with memoization and type safety
 */

import { useMemo } from "react";
import { useTheme } from "next-themes";
import {
  taskColors,
  performanceColors,
  combineColorClasses,
  getColorVariant,
  a11yColors,
} from "./colors";

// ✅ Theme-aware component utilities
export function useComponentTheme() {
  const { theme, systemTheme } = useTheme();

  // ✅ Performance: Memoize theme calculations
  const currentTheme = useMemo(() => {
    return theme === "system" ? systemTheme : theme;
  }, [theme, systemTheme]);

  const isDark = currentTheme === "dark";

  // ✅ Task component theme utilities
  const taskTheme = useMemo(
    () => ({
      card: {
        base: combineColorClasses(
          taskColors.taskCard.light.background,
          taskColors.taskCard.light.backgroundHover,
          taskColors.taskCard.light.border,
          taskColors.taskCard.light.shadow,
          taskColors.taskCard.dark.background,
          taskColors.taskCard.dark.backgroundHover,
          taskColors.taskCard.dark.border,
          taskColors.taskCard.dark.shadow,
          "transition-all duration-200 ease-in-out",
          a11yColors.focusRing
        ),
        pending: combineColorClasses(
          taskColors.taskStates.pending.background,
          taskColors.taskStates.pending.border,
          "border-2 border-dashed"
        ),
        completed: combineColorClasses(
          taskColors.taskStates.completed.background,
          taskColors.taskStates.completed.border,
          "border-2"
        ),
      },
      text: {
        primary: taskColors.taskText.primary,
        secondary: taskColors.taskText.secondary,
        muted: taskColors.taskText.muted,
        disabled: taskColors.taskText.disabled,
      },
      score: {
        active: combineColorClasses(
          taskColors.taskStates.active.score,
          taskColors.taskStates.active.scoreHover,
          "transition-colors duration-200"
        ),
        completed: taskColors.taskStates.completed.score,
      },
      admin: {
        disabled: taskColors.adminControls.disabled,
        tooltip: taskColors.adminControls.tooltip,
      },
    }),
    []
  );

  // ✅ Performance summary theme utilities
  const performanceTheme = useMemo(
    () => ({
      card: combineColorClasses(
        performanceColors.card.background,
        performanceColors.card.border,
        performanceColors.card.shadow,
        "border rounded-lg backdrop-blur-sm",
        a11yColors.focusRing
      ),
      score: {
        display: combineColorClasses(
          performanceColors.scoreDisplay.background,
          performanceColors.scoreDisplay.text,
          "rounded-lg p-2"
        ),
        primary: performanceColors.scoreDisplay.primary,
        accent: performanceColors.scoreDisplay.accent,
      },
      button: {
        primary: combineColorClasses(
          performanceColors.buttons.primary.background,
          performanceColors.buttons.primary.border,
          performanceColors.buttons.primary.text,
          performanceColors.buttons.primary.hover,
          performanceColors.buttons.primary.disabled,
          "border rounded-full transition-all duration-200",
          a11yColors.focusRing
        ),
        destructive: combineColorClasses(
          performanceColors.buttons.destructive.background,
          performanceColors.buttons.destructive.border,
          performanceColors.buttons.destructive.text,
          performanceColors.buttons.destructive.hover,
          "border rounded-full transition-all duration-200",
          a11yColors.focusRing
        ),
      },
      progress: {
        background: performanceColors.progress.background,
        fill: performanceColors.progress.fill,
        text: performanceColors.progress.text,
      },
    }),
    []
  );

  return {
    isDark,
    currentTheme,
    task: taskTheme,
    performance: performanceTheme,
    getVariant: getColorVariant,
    a11y: a11yColors,
  };
}

// ✅ Component-specific theme hooks for optimal performance
export function useTaskTheme() {
  const { task, isDark } = useComponentTheme();
  return { ...task, isDark };
}

export function usePerformanceTheme() {
  const { performance, isDark } = useComponentTheme();
  return { ...performance, isDark };
}

// ✅ Utility for conditional admin styling
export function useAdminAwareTheme(isAdmin: boolean, isLoading: boolean) {
  const theme = useComponentTheme();

  return useMemo(
    () => ({
      ...theme,
      getAdminStyle: (baseStyle: string) => {
        if (isLoading) return `${baseStyle} animate-pulse`;
        if (!isAdmin) return `${baseStyle} ${theme.task.admin.disabled}`;
        return baseStyle;
      },
      getAdminTooltip: () => (isAdmin ? undefined : theme.task.admin.tooltip),
    }),
    [theme, isAdmin, isLoading]
  );
}

// ✅ High contrast mode support
export function useAccessibilityTheme() {
  const theme = useComponentTheme();

  return useMemo(
    () => ({
      ...theme,
      highContrast: a11yColors.highContrast,
      focusRing: a11yColors.focusRing,
      // Enhanced focus styles for keyboard navigation
      enhancedFocus:
        "focus-visible:ring-4 focus-visible:ring-blue-500/50 focus-visible:outline-none",
    }),
    [theme]
  );
}
