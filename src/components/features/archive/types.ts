/**
 * ✅ ENTERPRISE ARCHIVE DOMAIN - TYPE DEFINITIONS
 *
 * Comprehensive type system for the Archive feature domain.
 * Follows enterprise patterns: strict typing, extensibility, maintainability.
 *
 * @module ArchiveTypes
 * @version 1.0.0
 * @author Principal Engineering Team
 */

import { ArchivedTask, Member } from "@/types";
import { ReactNode } from "react";

// ========================================
// ARCHIVE DOMAIN CORE TYPES
// ========================================

/**
 * Archive statistics aggregated data
 */
export interface ArchiveStats {
  totalTasks: number;
  totalScore: number;
  uniqueMembers: number;
  weeklyTasks: number;
  monthlyTasks: number;
  averageTasksPerMember: number;
  lastUpdatedDate: string; // ISO string
  topPerformer: ArchiveMemberPerformance | null;
}

/**
 * Enhanced member performance data for archive analysis
 */
export interface ArchiveMemberPerformance {
  id: string;
  name: string;
  avatar?: string;
  taskCount: number;
  totalScore: number;
  averageScore: number;
  completionRate: number;
  recentActivity: {
    lastTask: string; // ISO string
    streak: number;
    efficiency: "high" | "medium" | "low";
  };
}

/**
 * Archive filtering and sorting options
 */
export type ArchiveSortBy = "date" | "score" | "name" | "performance";
export type ArchiveFilterPeriod =
  | "all"
  | "today"
  | "week"
  | "month"
  | "quarter"
  | "year";
export type ArchiveViewMode = "table" | "cards" | "timeline";

export interface ArchiveFilterState {
  sortBy: ArchiveSortBy;
  filterPeriod: ArchiveFilterPeriod;
  viewMode: ArchiveViewMode;
  searchQuery?: string;
  selectedMember?: string;
}

/**
 * Archive table configuration
 */
export interface ArchiveTableColumn {
  key: string;
  label: string;
  sortable: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  responsive?: {
    hidden?: "sm" | "md" | "lg" | "xl";
    priority?: number; // Lower numbers shown first on mobile
  };
}

export interface ArchiveTableRow {
  id: string;
  member: ArchiveMemberPerformance;
  tasks: ArchivedTask[];
  isExpanded?: boolean;
}

// ========================================
// COMPONENT PROPS INTERFACES
// ========================================

/**
 * Main Archive component props
 */
export interface ArchiveProps {
  archivedTasks?: ArchivedTask[];
  members?: Member[];
  className?: string;
  initialFilter?: Partial<ArchiveFilterState>;
}

/**
 * Archive header component props
 */
export interface ArchiveHeaderProps {
  stats: ArchiveStats;
  onActionClick?: () => void;
  className?: string;
}

/**
 * Archive statistics component props
 */
export interface ArchiveStatsProps {
  stats: ArchiveStats;
  variant?: "default" | "compact" | "detailed";
  className?: string;
}

/**
 * Archive table component props
 */
export interface ArchiveTableProps {
  data: ArchiveTableRow[];
  columns: ArchiveTableColumn[];
  filter: ArchiveFilterState;
  onFilterChange: (filter: Partial<ArchiveFilterState>) => void;
  onRowExpand?: (rowId: string) => void;
  className?: string;
  loading?: boolean;
  empty?: ReactNode;
}

/**
 * Archive filters component props
 */
export interface ArchiveFiltersProps {
  filter: ArchiveFilterState;
  onFilterChange: (filter: Partial<ArchiveFilterState>) => void;
  className?: string;
  variant?: "full" | "compact" | "minimal";
}

/**
 * Archive card component props (for card view mode)
 */
export interface ArchiveCardProps {
  member: ArchiveMemberPerformance;
  tasks: ArchivedTask[];
  onExpand?: () => void;
  isExpanded?: boolean;
  className?: string;
}

/**
 * Archive timeline component props (for timeline view mode)
 */
export interface ArchiveTimelineProps {
  tasks: ArchivedTask[];
  members: Member[];
  className?: string;
  groupBy?: "date" | "member" | "score";
}

// ========================================
// HOOK RETURN TYPES
// ========================================

/**
 * Archive data hook return type
 */
export interface UseArchiveDataReturn {
  archivedTasks: ArchivedTask[];
  members: Member[];
  stats: ArchiveStats;
  membersWithTasks: ArchiveTableRow[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Archive filtering hook return type
 */
export interface UseArchiveFilteringReturn {
  filter: ArchiveFilterState;
  setFilter: (filter: Partial<ArchiveFilterState>) => void;
  resetFilter: () => void;
  filteredData: ArchiveTableRow[];
  filterStats: {
    totalItems: number;
    filteredItems: number;
    hasActiveFilters: boolean;
  };
  // Convenience methods
  setSortBy: (sortBy: ArchiveSortBy) => void;
  setFilterPeriod: (filterPeriod: ArchiveFilterPeriod) => void;
  setViewMode: (viewMode: ArchiveViewMode) => void;
  setSearchQuery: (searchQuery: string) => void;
  setSelectedMember: (selectedMember: string | undefined) => void;
}

/**
 * Archive statistics hook return type
 */
export interface UseArchiveStatsReturn {
  stats: ArchiveStats;
  trends: {
    weeklyChange: number;
    monthlyChange: number;
    performanceChange: number;
  };
  insights: {
    mostActive: string;
    bestPerformer: string;
    improvementSuggestions: string[];
  };
  isCalculating: boolean;
}

/**
 * Archive export hook return type
 */
export interface UseArchiveExportReturn {
  exportToCSV: () => Promise<void>;
  exportToJSON: () => Promise<void>;
  exportToPDF: () => Promise<void>;
  isExporting: boolean;
  error: string | null;
}

// ========================================
// CONTEXT AND PROVIDER TYPES
// ========================================

/**
 * Archive context value
 */
export interface ArchiveContextValue {
  // Data
  archivedTasks: ArchivedTask[];
  members: Member[];
  stats: ArchiveStats;

  // State
  filter: ArchiveFilterState;
  loading: boolean;
  error: string | null;

  // Actions
  setFilter: (filter: Partial<ArchiveFilterState>) => void;
  refreshData: () => Promise<void>;
  exportData: (format: "csv" | "json" | "pdf") => Promise<void>;

  // Computed values
  filteredData: ArchiveTableRow[];
  isEmpty: boolean;
  hasError: boolean;
}

/**
 * Archive provider props
 */
export interface ArchiveProviderProps {
  children: ReactNode;
  initialData?: {
    archivedTasks?: ArchivedTask[];
    members?: Member[];
  };
  initialFilter?: Partial<ArchiveFilterState>;
}

// ========================================
// SERVICE AND API TYPES
// ========================================

/**
 * Archive service interface
 */
export interface ArchiveService {
  getArchivedTasks: () => Promise<ArchivedTask[]>;
  getArchiveStats: () => Promise<ArchiveStats>;
  exportArchiveData: (format: "csv" | "json" | "pdf") => Promise<Blob>;
  searchArchive: (query: string) => Promise<ArchivedTask[]>;
}

/**
 * Archive API response types
 */
export interface ArchiveApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ========================================
// UTILITY AND HELPER TYPES
// ========================================

/**
 * Date range utility type
 */
export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Performance metric type
 */
export interface PerformanceMetric {
  label: string;
  value: number;
  change: number; // Percentage change
  trend: "up" | "down" | "stable";
  format: "number" | "percentage" | "currency";
}

/**
 * Archive configuration type
 */
export interface ArchiveConfig {
  defaultFilter: ArchiveFilterState;
  tableColumns: ArchiveTableColumn[];
  enableExport: boolean;
  enableSearch: boolean;
  pagination: {
    enabled: boolean;
    defaultSize: number;
    sizeOptions: number[];
  };
  responsive: {
    breakpoints: Record<string, number>;
    hiddenColumns: Record<string, string[]>;
  };
}

// ========================================
// ERROR TYPES
// ========================================

/**
 * Archive domain specific errors
 */
export class ArchiveError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = "ArchiveError";
  }
}

export type ArchiveErrorCode =
  | "ARCHIVE_DATA_FETCH_FAILED"
  | "ARCHIVE_EXPORT_FAILED"
  | "ARCHIVE_FILTER_INVALID"
  | "ARCHIVE_STATS_CALCULATION_FAILED";

// ========================================
// RESPONSIVE DESIGN TYPES
// ========================================

/**
 * Responsive archive configuration
 */
export interface ResponsiveArchiveConfig {
  breakpoints: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  layouts: {
    mobile: ArchiveLayoutConfig;
    tablet: ArchiveLayoutConfig;
    desktop: ArchiveLayoutConfig;
  };
}

export interface ArchiveLayoutConfig {
  viewMode: ArchiveViewMode;
  statsVariant: "compact" | "full";
  filtersVariant: "minimal" | "compact" | "full";
  tableColumns: string[]; // Column keys to show
  cardColumns: number; // Cards per row
}

// ========================================
// ACCESSIBILITY TYPES
// ========================================

/**
 * Archive accessibility configuration
 */
export interface ArchiveA11yConfig {
  announcements: {
    filterChange: string;
    dataLoaded: string;
    exportStarted: string;
    exportCompleted: string;
  };
  landmarks: {
    main: string;
    filters: string;
    table: string;
    stats: string;
  };
  descriptions: {
    sortButton: (column: string, direction: "asc" | "desc") => string;
    filterButton: (filter: string, active: boolean) => string;
    exportButton: (format: string) => string;
  };
}

// ========================================
// EXPORT ALL TYPES
// ========================================

export type {
  // Re-export core types from main types file
  ArchivedTask,
  Member,
} from "@/types";
