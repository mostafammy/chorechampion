'use client';

/**
 * ✅ ENTERPRISE ARCHIVE PROVIDER
 *
 * Context provider for Archive domain with dependency injection.
 * Implements enterprise patterns: provider pattern, dependency injection, error boundaries.
 *
 * @module ArchiveProvider
 * @version 1.0.0
 * @author Principal Engineering Team
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useArchiveData } from '../hooks/useArchiveData';
import { useArchiveFiltering } from '../hooks/useArchiveFiltering';
import type {
  ArchiveContextValue,
  ArchiveProviderProps,
} from '../types';

/**
 * ✅ SOLID PRINCIPLES: Dependency Inversion
 * Create context with undefined to enforce provider usage
 */
const ArchiveContext = createContext<ArchiveContextValue | undefined>(undefined);

/**
 * ✅ ENTERPRISE PATTERN: Provider with error boundary and performance optimization
 */
export function ArchiveProvider({ 
  children, 
  initialData,
  initialFilter = {} 
}: ArchiveProviderProps) {
  // ✅ DEPENDENCY INJECTION: Use hooks for data management
  const {
    archivedTasks,
    members,
    stats,
    membersWithTasks,
    isLoading,
    error,
    refetch,
  } = useArchiveData();

  // ✅ BUSINESS LOGIC: Filtering functionality
  const {
    filter,
    setFilter,
    resetFilter,
    filteredData,
    filterStats,
  } = useArchiveFiltering(membersWithTasks, initialFilter);

  // ✅ ENTERPRISE FEATURE: Export functionality
  const exportData = useMemo(() => {
    return async (format: 'csv' | 'json' | 'pdf'): Promise<void> => {
      try {
        console.log(`[ArchiveProvider] Exporting data in ${format} format...`);
        
        // In a real application, this would call an export service
        const exportData = {
          stats,
          members: filteredData,
          exportedAt: new Date().toISOString(),
          format,
        };

        switch (format) {
          case 'csv':
            // CSV export logic would go here
            console.log('[ArchiveProvider] CSV export not yet implemented');
            break;
          case 'json':
            // JSON export logic would go here
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
              type: 'application/json',
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `archive-data-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
            break;
          case 'pdf':
            // PDF export logic would go here
            console.log('[ArchiveProvider] PDF export not yet implemented');
            break;
        }
      } catch (err) {
        console.error('[ArchiveProvider] Export failed:', err);
        throw new Error(`Failed to export data in ${format} format`);
      }
    };
  }, [stats, filteredData]);

  // ✅ PERFORMANCE: Memoized context value
  const contextValue = useMemo((): ArchiveContextValue => ({
    // Data
    archivedTasks,
    members,
    stats,
    
    // State
    filter,
    loading: isLoading,
    error,
    
    // Actions
    setFilter,
    refreshData: refetch,
    exportData,
    
    // Computed values
    filteredData,
    isEmpty: archivedTasks.length === 0,
    hasError: !!error,
  }), [
    archivedTasks,
    members,
    stats,
    filter,
    isLoading,
    error,
    setFilter,
    refetch,
    exportData,
    filteredData,
  ]);

  // ✅ DEBUGGING: Development logging
  if (process.env.NODE_ENV === 'development') {
    React.useEffect(() => {
      console.log('[ArchiveProvider] Context updated:', {
        archivedTasksCount: archivedTasks.length,
        membersCount: members.length,
        filteredDataCount: filteredData.length,
        hasError: !!error,
        isLoading,
      });
    }, [archivedTasks.length, members.length, filteredData.length, error, isLoading]);
  }

  return (
    <ArchiveContext.Provider value={contextValue}>
      {children}
    </ArchiveContext.Provider>
  );
}

/**
 * ✅ SOLID PRINCIPLES: Interface Segregation
 * Custom hook to use Archive context with proper error handling
 */
export function useArchiveContext(): ArchiveContextValue {
  const context = useContext(ArchiveContext);
  
  if (context === undefined) {
    throw new Error(
      'useArchiveContext must be used within an ArchiveProvider. ' +
      'Wrap your component tree with <ArchiveProvider> to use Archive functionality.'
    );
  }
  
  return context;
}

/**
 * ✅ UTILITY: Context selector hook for performance optimization
 * Allows components to subscribe to specific parts of the context
 */
export function useArchiveSelector<T>(
  selector: (context: ArchiveContextValue) => T
): T {
  const context = useArchiveContext();
  return React.useMemo(() => selector(context), [selector, context]);
}

/**
 * ✅ HOC: Higher-order component for Archive context injection
 */
export function withArchiveContext<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <ArchiveProvider>
      <Component {...props} />
    </ArchiveProvider>
  );
  
  WrappedComponent.displayName = `withArchiveContext(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// ✅ ERROR BOUNDARY: Archive-specific error boundary
export class ArchiveErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ArchiveErrorBoundary] Archive component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback;
      
      if (FallbackComponent) {
        return <FallbackComponent error={this.state.error} />;
      }
      
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Archive Error
          </h3>
          <p className="text-red-700 mb-4">
            Something went wrong while loading the archive data.
          </p>
          <details className="text-sm text-red-600">
            <summary className="cursor-pointer font-medium">
              Error Details
            </summary>
            <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
              {this.state.error.message}
            </pre>
          </details>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ArchiveProvider;
