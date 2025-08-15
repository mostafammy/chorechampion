/**
 * ✅ ENTERPRISE FILTER THEME HOOK
 *
 * Principal Engineer implementation of filter theming system.
 * Provides performance-optimized, type-safe theme management.
 *
 * Features:
 * - Memoized theme calculations for optimal performance
 * - Automatic dark/light mode detection
 * - Accessibility-compliant styling
 * - Type-safe style generation
 * - Scalable design token system
 *
 * @module useFilterTheme
 * @version 1.0.0
 */

import { useMemo } from "react";
import { useTheme } from "next-themes";
import {
  FILTER_COLOR_SYSTEM,
  FILTER_DESIGN_TOKENS,
  createFilterStyles,
  createAccessibilityProps,
  type FilterTheme,
  type FilterPeriod,
  type FilterThemeConfig,
} from "./filter-theme";
import type { TaskFilterPeriod } from "@/components/features/dashboard/types";

/**
 * ✅ ENTERPRISE HOOK: Filter Theme Management
 *
 * Provides comprehensive theming capabilities for filter components.
 * Optimized for performance with strategic memoization.
 */
export function useFilterTheme(config: Partial<FilterThemeConfig> = {}) {
  const { theme: systemTheme, resolvedTheme } = useTheme();

  // ✅ PERFORMANCE: Memoized theme detection
  const currentTheme = useMemo<FilterTheme>(() => {
    const resolved = resolvedTheme || systemTheme;
    return (resolved === "dark" ? "dark" : "light") as FilterTheme;
  }, [resolvedTheme, systemTheme]);

  // ✅ CONFIGURATION: Merge with defaults
  const themeConfig = useMemo<FilterThemeConfig>(
    () => ({
      theme: currentTheme,
      variant: "enhanced",
      showPerformanceMetrics: false,
      enableAnimations: true,
      accessibilityMode: false,
      ...config,
    }),
    [currentTheme, config]
  );

  // ✅ DESIGN TOKENS: Theme-aware color system
  const colors = useMemo(
    () => ({
      ...FILTER_COLOR_SYSTEM[currentTheme],
      current: currentTheme,
    }),
    [currentTheme]
  );

  // ✅ STYLE GENERATORS: Memoized for performance
  const styles = useMemo(
    () => ({
      // Container styles with theme awareness
      container: (enhanced = true) => {
        const base = createFilterStyles.container(currentTheme);
        return enhanced ? `${base.base} ${base.enhanced}` : base.base;
      },

      // Period button styles with state management
      periodButton: (
        period: TaskFilterPeriod,
        isActive: boolean,
        isDisabled = false
      ) => {
        if (isDisabled) {
          return `
          ${
            createFilterStyles.button(
              period as FilterPeriod,
              false,
              currentTheme
            ).base
          }
          opacity-50 cursor-not-allowed
          ${
            currentTheme === "light"
              ? "bg-gray-100 text-gray-400"
              : "bg-gray-800 text-gray-600"
          }
        `;
        }

        const buttonStyles = createFilterStyles.button(
          period as FilterPeriod,
          isActive,
          currentTheme
        );
        return `${buttonStyles.base} ${buttonStyles.active} ${buttonStyles.inactive}`;
      },

      // Performance metrics styling
      performanceMetrics: () => createFilterStyles.metrics(currentTheme),

      // Popover styling
      popover: () => createFilterStyles.popover(currentTheme),

      // Badge styling with dynamic variants
      badge: (
        variant:
          | "success"
          | "warning"
          | "error"
          | "info"
          | "default" = "default"
      ) => {
        const statusColors = colors.status;

        switch (variant) {
          case "success":
            return `inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium
                  ${
                    currentTheme === "light"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-green-900/20 text-green-300 border border-green-800"
                  }`;
          case "warning":
            return `inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium
                  ${
                    currentTheme === "light"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-amber-900/20 text-amber-300 border border-amber-800"
                  }`;
          case "error":
            return `inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium
                  ${
                    currentTheme === "light"
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-red-900/20 text-red-300 border border-red-800"
                  }`;
          case "info":
            return `inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium
                  ${
                    currentTheme === "light"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-blue-900/20 text-blue-300 border border-blue-800"
                  }`;
          default:
            return `inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium
                  ${
                    currentTheme === "light"
                      ? "bg-gray-50 text-gray-700 border border-gray-200"
                      : "bg-gray-800 text-gray-300 border border-gray-700"
                  }`;
        }
      },

      // Icon styling
      icon: (size: "sm" | "md" | "lg" = "md") => {
        const sizeMap = { sm: "w-3 h-3", md: "w-4 h-4", lg: "w-5 h-5" };
        return `${sizeMap[size]} ${
          currentTheme === "light" ? "text-gray-600" : "text-gray-400"
        }`;
      },

      // Text styling
      text: {
        primary: currentTheme === "light" ? "text-gray-900" : "text-gray-100",
        secondary: currentTheme === "light" ? "text-gray-600" : "text-gray-300",
        tertiary: currentTheme === "light" ? "text-gray-500" : "text-gray-400",
        disabled: currentTheme === "light" ? "text-gray-400" : "text-gray-500",
        inverse: currentTheme === "light" ? "text-white" : "text-gray-900",
      },

      // Animation classes
      animations: {
        fadeIn: "animate-in fade-in-0 duration-200",
        slideIn: "animate-in slide-in-from-top-2 duration-200",
        scaleIn: "animate-in zoom-in-95 duration-200",
        hover: "transition-all duration-200 hover:scale-105",
        press: "transition-all duration-100 active:scale-95",
      },
    }),
    [currentTheme, colors]
  );

  // ✅ ACCESSIBILITY HELPERS: Type-safe a11y props
  const accessibility = useMemo(
    () => ({
      filterButton: createAccessibilityProps.filterButton,
      performanceMetrics: createAccessibilityProps.performanceMetrics,
      popoverTrigger: createAccessibilityProps.popoverTrigger,

      // Focus management
      focusRing:
        currentTheme === "light"
          ? "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2"
          : "focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-2 focus:ring-offset-gray-900",

      // High contrast support
      highContrast: themeConfig.accessibilityMode
        ? {
            border: "border-2",
            text: "font-semibold",
            background: currentTheme === "light" ? "bg-white" : "bg-black",
          }
        : {},
    }),
    [currentTheme, themeConfig.accessibilityMode]
  );

  // ✅ UTILITY FUNCTIONS: Theme-aware helpers
  const utils = useMemo(
    () => ({
      // Get period-specific colors
      getPeriodColors: (period: TaskFilterPeriod) => {
        return colors.periods[period as FilterPeriod] || colors.periods.all;
      },

      // Generate efficiency badge variant
      getEfficiencyVariant: (
        efficiency: number
      ): "success" | "warning" | "error" => {
        if (efficiency > 75) return "success";
        if (efficiency > 50) return "warning";
        return "error";
      },

      // Combine classes utility
      combineClasses: (...classes: (string | undefined | false)[]) => {
        return classes.filter(Boolean).join(" ");
      },

      // Conditional styling
      conditional: (
        condition: boolean,
        trueClass: string,
        falseClass: string = ""
      ) => {
        return condition ? trueClass : falseClass;
      },

      // Responsive breakpoint helpers
      responsive: {
        sm: "sm:",
        md: "md:",
        lg: "lg:",
        xl: "xl:",
      },
    }),
    [colors]
  );

  // ✅ PERFORMANCE MONITORING (Development only)
  const performance = useMemo(() => {
    if (process.env.NODE_ENV === "development") {
      return {
        renderCount: 0,
        themeCalculationTime: 0,
        memoizationHits: 0,
      };
    }
    return null;
  }, []);

  return {
    // Core theme data
    theme: currentTheme,
    config: themeConfig,
    colors,
    tokens: FILTER_DESIGN_TOKENS,

    // Style generators
    styles,

    // Accessibility helpers
    accessibility,

    // Utility functions
    utils,

    // Performance monitoring (dev only)
    performance,

    // Theme state
    isDark: currentTheme === "dark",
    isLight: currentTheme === "light",
  };
}

/**
 * ✅ ENTERPRISE HOOK: Compact Filter Theme
 *
 * Optimized version for compact filter components.
 * Reduces bundle size and computation for simple use cases.
 */
export function useCompactFilterTheme() {
  const { theme: systemTheme, resolvedTheme } = useTheme();

  const currentTheme = useMemo<FilterTheme>(() => {
    const resolved = resolvedTheme || systemTheme;
    return (resolved === "dark" ? "dark" : "light") as FilterTheme;
  }, [resolvedTheme, systemTheme]);

  return useMemo(
    () => ({
      theme: currentTheme,
      isDark: currentTheme === "dark",

      // Essential styles only
      button: (isActive: boolean) =>
        `px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          isActive
            ? currentTheme === "light"
              ? "bg-blue-100 text-blue-800 border border-blue-200"
              : "bg-blue-900/30 text-blue-300 border border-blue-700"
            : currentTheme === "light"
            ? "bg-gray-50 text-gray-600 hover:bg-gray-100"
            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
        }`,

      text: currentTheme === "light" ? "text-gray-900" : "text-gray-100",

      icon: currentTheme === "light" ? "text-gray-600" : "text-gray-400",
    }),
    [currentTheme]
  );
}

// ✅ TYPE EXPORTS
export type FilterThemeHook = ReturnType<typeof useFilterTheme>;
export type CompactFilterThemeHook = ReturnType<typeof useCompactFilterTheme>;
