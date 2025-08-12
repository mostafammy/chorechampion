/**
 * ✅ ENTERPRISE DASHBOARD COMPONENT - MAIN COMPOSITION
 * 
 * Main dashboard component following enterprise composition patterns.
 * Implements dependency injection, single responsibility, and clean architecture.
 * 
 * @module Dashboard
 * @version 1.0.0
 */

'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useAppContext } from '@/context/app-provider';
import { LastUpdated } from '@/components/ui/last-updated';

// ✅ ENTERPRISE: Import domain components via barrel exports
import { DashboardHeader, DashboardStats, DashboardMemberGrid } from '../index';
import { useDashboardData } from '../hooks/useDashboardData';
import type { DashboardHeaderProps, DashboardProps } from '../types';

/**
 * ✅ ENTERPRISE DASHBOARD: Main Composition Component
 * 
 * Orchestrates dashboard sub-components with proper dependency injection.
 * Follows composition over inheritance and single responsibility principles.
 * 
 * @param props Dashboard properties
 * @returns Composed dashboard component
 */
export function Dashboard({ className, testId }: DashboardProps) {
  const t = useTranslations('Dashboard');
  
  // ✅ DEPENDENCY INJECTION: Get operations from context
  const { handleToggleTask, handleAdjustScore: contextAdjustScore } = useAppContext();
  
  // ✅ DOMAIN LOGIC: Extract data processing to custom hook
  const { memberData, dashboardStats, isLoading, error } = useDashboardData();

  // ✅ ADAPTER PATTERN: Bridge context function to enterprise interface
  const handleAdjustScore = async (memberId: string, delta: number, reason: string): Promise<void> => {
    // Note: The app context function doesn't use reason parameter yet
    // This adapter ensures compatibility with enterprise interface
    await contextAdjustScore(memberId, delta);
  };

  // ✅ ERROR HANDLING: Display error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8" data-testid={testId}>
        <div className="text-center text-red-600 dark:text-red-400">
          <p className="text-lg font-semibold">{t('errorTitle') || 'Dashboard Error'}</p>
          <p className="text-sm mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`container mx-auto space-y-6 sm:space-y-8 px-4 sm:px-6 lg:px-8 ${className || ''}`}
      data-testid={testId}
    >
      {/* ✅ COMPOSITION: Dashboard header with stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <DashboardHeader stats={dashboardStats} />
      </motion.div>

      {/* ✅ COMPOSITION: Overall progress section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <DashboardStats stats={dashboardStats} isLoading={isLoading} />
      </motion.div>

      {/* ✅ COMPOSITION: Member grid with dependency injection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <DashboardMemberGrid
          memberData={memberData}
          onToggleTask={handleToggleTask}
          onAdjustScore={handleAdjustScore}
          isLoading={isLoading}
        />
      </motion.div>

      {/* ✅ COMPOSITION: Footer with timestamp */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center"
      >
        <LastUpdated 
          timestamp={new Date().toISOString()}
          size="md"
          variant="muted"
          labelOverride={t('lastRefreshed') || 'Dashboard refreshed'}
        />
      </motion.div>
    </div>
  );
}
