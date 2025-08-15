/**
 * ✅ ENTERPRISE ARCHIVE DOMAIN - PUBLIC API
 *
 * Feature-based architecture module with clean public interface.
 * Follows enterprise patterns: barrel exports, dependency injection, type safety.
 *
 * @module Archive
 * @version 1.0.0
 * @author Principal Engineering Team
 */

// ========================================
// COMPONENTS - Public component exports
// ========================================

// ✅ MAIN COMPONENTS - Core archive functionality
export { Archive, EnterpriseArchive } from "./components/Archive";
export { ArchiveHeader } from "./components/ArchiveHeader";
export { ArchiveFilters } from "./components/ArchiveFilters";
export { ArchiveTable } from "./components/ArchiveTable";

// ✅ DEFAULT EXPORT - Drop-in replacement for archive-main.tsx
export { default as ArchiveMain } from "./components/Archive";

// ========================================
// HOOKS - Custom hooks for archive domain
// ========================================

// ✅ DATA MANAGEMENT HOOKS
export { useArchiveData } from "./hooks/useArchiveData";
export { useArchiveFiltering } from "./hooks/useArchiveFiltering";

// ✅ UTILITY HOOKS
export { isValidFilter, getFilterSummary } from "./hooks/useArchiveFiltering";

// ========================================
// PROVIDERS - Domain context providers
// ========================================

// ✅ CONTEXT PROVIDERS AND HOOKS
export {
  ArchiveProvider,
  useArchiveContext,
  useArchiveSelector,
  withArchiveContext,
  ArchiveErrorBoundary,
} from "./providers/ArchiveProvider";

// ========================================
// TYPES - Domain-specific types
// ========================================

// ✅ CORE TYPES - Main interfaces and types
export type {
  // Archive domain types
  ArchiveStats,
  ArchiveMemberPerformance,
  ArchiveFilterState,
  ArchiveTableRow,

  // Enums and unions
  ArchiveSortBy,
  ArchiveFilterPeriod,
  ArchiveViewMode,

  // Component props
  ArchiveProps,
  ArchiveHeaderProps,
  ArchiveFiltersProps,
  ArchiveTableProps,

  // Table configuration
  ArchiveTableColumn,

  // Hook return types
  UseArchiveDataReturn,
  UseArchiveFilteringReturn,

  // Context types
  ArchiveContextValue,
  ArchiveProviderProps,

  // Service types
  ArchiveService,
  ArchiveApiResponse,

  // Utility types
  DateRange,
  PerformanceMetric,
  ArchiveConfig,
  ResponsiveArchiveConfig,
  ArchiveLayoutConfig,
  ArchiveA11yConfig,

  // Error types
  ArchiveError,
  ArchiveErrorCode,
} from "./types";

// ========================================
// SERVICES - Business logic and API calls
// ========================================

// ✅ Future: Export archive services when implemented
// export { ArchiveService } from "./services/ArchiveService";
// export { ArchiveApiClient } from "./services/ArchiveApiClient";
// export { ArchiveExportService } from "./services/ArchiveExportService";

// ========================================
// UTILITIES - Helper functions and constants
// ========================================

// ✅ CONSTANTS - Default configurations
export const DEFAULT_ARCHIVE_CONFIG = {
  defaultFilter: {
    sortBy: "date" as const,
    filterPeriod: "all" as const,
    viewMode: "table" as const,
    searchQuery: "",
    selectedMember: undefined,
  },
  pagination: {
    enabled: true,
    defaultSize: 20,
    sizeOptions: [10, 20, 50, 100],
  },
  enableExport: true,
  enableSearch: true,
} as const;

// ✅ RESPONSIVE BREAKPOINTS - Mobile-first design
export const ARCHIVE_BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

// ========================================
// DEVELOPMENT UTILITIES
// ========================================

/**
 * ✅ DEVELOPMENT HELPER - Debug information
 */
export const ARCHIVE_DEBUG = {
  version: "1.0.0",
  components: ["Archive", "ArchiveHeader", "ArchiveFilters", "ArchiveTable"],
  hooks: ["useArchiveData", "useArchiveFiltering"],
  features: ["filtering", "sorting", "responsive", "accessibility", "i18n"],
  patterns: ["SOLID", "DI", "Provider", "Compound Components"],
} as const;

/**
 * ✅ PERFORMANCE MONITORING - Component usage tracker
 */
export function trackArchiveUsage(component: string, action: string) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[Archive] ${component}: ${action}`);
  }
}

// ========================================
// MODULE METADATA
// ========================================

/**
 * Archive Domain Module Information
 *
 * Architecture: Feature-based with domain-driven design
 * Patterns: SOLID principles, dependency injection, provider pattern
 * Technology: React, TypeScript, Framer Motion, Next.js i18n
 * Accessibility: WCAG 2.1 AA compliant
 * Performance: Memoization, code splitting, lazy loading ready
 * Responsive: Mobile-first design with breakpoint system
 * Maintainability: Strong typing, clear separation of concerns
 * Scalability: Modular architecture, pluggable components
 * Testing: Testable with dependency injection and mocking support
 */
