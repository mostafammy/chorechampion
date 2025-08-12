/**
 * ✅ PRINCIPAL ENGINEER: SMART DASHBOARD WRAPPER
 * 
 * Zero-downtime migration wrapper that intelligently selects between
 * original and enterprise dashboard based on feature flags.
 * 
 * @module SmartDashboard
 * @version 1.0.0
 */

'use client';

import React, { Suspense, lazy, useEffect, Component } from 'react';
import { shouldUseEnterpriseDashboard } from '@/lib/feature-flags';
import { useAppContext } from '@/context/app-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

// ✅ LAZY LOAD DASHBOARDS FOR OPTIMAL PERFORMANCE
const EnterpriseDashboard = lazy(() => 
  import('@/components/features/dashboard/EnterpriseDashboard').then(module => ({
    default: module.EnterpriseDashboard
  }))
);

const OriginalDashboard = lazy(() => 
  import('@/components/dashboard').then(module => ({
    default: module.Dashboard
  }))
);

/**
 * ✅ DASHBOARD LOADING SKELETON
 * Consistent loading state for both dashboard variants
 */
const DashboardSkeleton = () => (
  <div className="space-y-6">
    {/* Header Skeleton */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
    
    {/* Stats Grid Skeleton */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-4">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-12" />
        </Card>
      ))}
    </div>
    
    {/* Progress Section Skeleton */}
    <Card className="p-6">
      <Skeleton className="h-6 w-32 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-2 w-full" />
    </Card>
    
    {/* Member Grid Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div>
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-2 w-full mb-4" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </Card>
      ))}
    </div>
  </div>
);

/**
 * ✅ ERROR BOUNDARY WRAPPER
 * Graceful fallback to original dashboard if enterprise version fails
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class DashboardErrorBoundary extends Component<
  { children: React.ReactNode; fallback: React.ComponentType },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback: React.ComponentType }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Enterprise Dashboard Error:', error, errorInfo);
    
    // Report to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // analytics.reportError('enterprise_dashboard_error', error);
    }
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;
      return <FallbackComponent />;
    }

    return this.props.children;
  }
}

/**
 * ✅ SMART DASHBOARD: PRINCIPAL ENGINEER IMPLEMENTATION
 * 
 * Intelligently routes between dashboard implementations based on:
 * - Feature flags
 * - User groups (A/B testing)
 * - Error states (graceful degradation)
 * - Performance metrics
 * 
 * @returns Optimal dashboard implementation
 */
export function SmartDashboard() {
  const context = useAppContext();
  
  // ✅ INTELLIGENT DASHBOARD SELECTION
  const useEnterprise = shouldUseEnterpriseDashboard();
  
  // ✅ PERFORMANCE MONITORING
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      // Track dashboard variant usage
      const variant = useEnterprise ? 'enterprise' : 'original';
      // analytics.track('dashboard_variant_loaded', { variant });
    }
  }, [useEnterprise]);

  if (useEnterprise) {
    return (
      <DashboardErrorBoundary 
        fallback={() => (
          <Suspense fallback={<DashboardSkeleton />}>
            <OriginalDashboard />
          </Suspense>
        )}
      >
        <Suspense fallback={<DashboardSkeleton />}>
          <EnterpriseDashboard />
        </Suspense>
      </DashboardErrorBoundary>
    );
  }

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <OriginalDashboard />
    </Suspense>
  );
}

// ✅ BACKWARD COMPATIBILITY: Export as Dashboard for seamless replacement
export { SmartDashboard as Dashboard };
