'use client';

/**
 * ✅ ENTERPRISE ARCHIVE COMPONENT
 *
 * Main archive component implementing feature-based architecture.
 * Follows SOLID principles, dependency injection, and enterprise patterns.
 *
 * @module Archive
 * @version 1.0.0
 * @author Principal Engineering Team
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { LastUpdated } from '@/components/ui/last-updated';
import { ArchiveProvider, useArchiveContext } from '../providers/ArchiveProvider';
import { ArchiveHeader } from './ArchiveHeader';
import { ArchiveFilters } from './ArchiveFilters';
import { ArchiveTable } from './ArchiveTable';
import type { ArchiveProps } from '../types';

/**
 * ✅ SOLID PRINCIPLES: Single Responsibility
 * This component only orchestrates the archive layout and components
 */
function ArchiveContent({ className }: { className?: string }) {
  const {
    stats,
    filter,
    setFilter,
    filteredData,
    loading,
    error,
    isEmpty,
  } = useArchiveContext();
  
  const t = useTranslations('ArchivePage');

  // ✅ ERROR HANDLING: Display error state
  if (error) {
    return (
      <div className={cn("container mx-auto space-y-6 px-4 sm:px-6 lg:px-8", className)}>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            {t('error.title')}
          </h3>
          <p className="text-red-700 dark:text-red-300">
            {error}
          </p>
        </div>
      </div>
    );
  }

  // ✅ TABLE COLUMNS CONFIGURATION
  const tableColumns = React.useMemo(() => [
    {
      key: 'member',
      label: t('table.columns.member'),
      sortable: true,
      width: '30%',
      responsive: { priority: 1 },
    },
    {
      key: 'tasks',
      label: t('table.columns.tasks'),
      sortable: true,
      align: 'center' as const,
      responsive: { priority: 2 },
    },
    {
      key: 'score',
      label: t('table.columns.score'),
      sortable: true,
      align: 'center' as const,
      responsive: { priority: 3 },
    },
    {
      key: 'performance',
      label: t('table.columns.performance'),
      sortable: true,
      align: 'center' as const,
      responsive: { hidden: 'sm' as const, priority: 4 },
    },
    {
      key: 'lastActivity',
      label: t('table.columns.lastActivity'),
      sortable: true,
      align: 'center' as const,
      responsive: { hidden: 'md' as const, priority: 5 },
    },
  ], [t]);

  return (
    <div className={cn("container mx-auto space-y-6 sm:space-y-8 px-4 sm:px-6 lg:px-8", className)}>
      {/* ✅ ENTERPRISE HEADER with statistics */}
      <ArchiveHeader 
        stats={stats}
        onActionClick={() => console.log('[Archive] Timeline action clicked')}
      />

      {/* ✅ ADVANCED FILTERING Interface */}
      {!isEmpty && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-6"
        >
          <ArchiveFilters
            filter={filter}
            onFilterChange={setFilter}
            variant="full"
          />
        </motion.div>
      )}

      {/* ✅ RESPONSIVE DATA TABLE */}
      {!isEmpty && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7, ease: "easeOut" }}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
        >
          <ArchiveTable
            data={filteredData}
            columns={tableColumns}
            filter={filter}
            onFilterChange={setFilter}
            loading={loading}
            empty={
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                  {t('emptyState.filtered.title')}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  {t('emptyState.filtered.description')}
                </p>
              </div>
            }
          />
        </motion.div>
      )}

      {/* ✅ LAST UPDATED TIMESTAMP */}
      {!isEmpty && stats.totalTasks > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex justify-center mt-6 sm:mt-8"
        >
          <LastUpdated 
            timestamp={stats.lastUpdatedDate}
            variant="muted"
            size="sm"
            labelOverride={t('lastUpdated')}
            className="bg-white dark:bg-gray-800 px-3 py-2 sm:px-4 sm:py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm text-xs sm:text-sm"
          />
        </motion.div>
      )}
    </div>
  );
}

/**
 * ✅ ENTERPRISE PATTERN: Provider wrapper with dependency injection
 * Main Archive component that provides context and renders content
 */
export function Archive({ 
  archivedTasks,
  members,
  className,
  initialFilter 
}: ArchiveProps) {
  return (
    <ArchiveProvider
      initialData={{ archivedTasks, members }}
      initialFilter={initialFilter}
    >
      <ArchiveContent className={className} />
    </ArchiveProvider>
  );
}

/**
 * ✅ ENTERPRISE REPLACEMENT: Drop-in replacement for archive-main.tsx
 * This component can replace the existing archive-main.tsx with zero breaking changes
 */
export function EnterpriseArchive() {
  return <Archive />;
}

/**
 * ✅ COMPOUND COMPONENT PATTERN: Export sub-components for advanced usage
 */
Archive.Header = ArchiveHeader;
Archive.Filters = ArchiveFilters;
Archive.Table = ArchiveTable;
Archive.Provider = ArchiveProvider;

/**
 * ✅ PERFORMANCE: Memoized component to prevent unnecessary re-renders
 */
export default React.memo(Archive);
