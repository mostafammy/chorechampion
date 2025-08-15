/**
 * ✅ FILTER STATE DEBUGGER COMPONENT
 * 
 * Debug component to help identify UI filter state issues.
 * This component shows the current filter state and helps
 * troubleshoot the "Today button shining" bug.
 * 
 * @module FilterStateDebugger
 * @version 1.0.0
 */

'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTaskFiltering, type UseTaskFilteringReturn } from '@/components/features/dashboard';
import type { Task } from '@/types';

interface FilterStateDebuggerProps {
  tasks: Task[];
  title?: string;
}

export function FilterStateDebugger({ tasks, title = "Filter State Debug" }: FilterStateDebuggerProps) {
  const filtering: UseTaskFilteringReturn = useTaskFiltering(tasks, {
    enablePerformanceLogging: true
  });
  
  const { filterState, utils } = filtering;

  // ✅ LOG: Debug information to console
  useEffect(() => {
    console.group('[FilterStateDebugger] Current State');
    console.log('Active Filter:', filterState.activeFilter);
    console.log('Available Filters:', filterState.availableFilters);
    console.log('Filter Stats:', filterState.filterStats);
    console.log('Has Active Filters:', utils.hasActiveFilters);
    console.log('Performance Metrics:', utils.performanceMetrics);
    console.groupEnd();
  }, [filterState, utils]);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className="mt-4 border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
      <CardHeader>
        <CardTitle className="text-sm text-red-800 dark:text-red-200 flex items-center">
          🐛 {title}
          <Badge variant="destructive" className="ml-2 text-xs">
            DEBUG
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {/* ✅ ACTIVE FILTER STATE */}
        <div>
          <h4 className="font-semibold text-red-700 dark:text-red-300 mb-1">
            Active Filter State (Simplified - Active Tasks Only):
          </h4>
          <div className="bg-white dark:bg-gray-900 p-2 rounded border font-mono">
            <div>Period: <span className="font-bold text-blue-600">{filterState.activeFilter.period}</span></div>
            <div>Filter Logic: <span className="text-green-600">Active tasks only (completed tasks excluded)</span></div>
          </div>
        </div>

        {/* ✅ AVAILABLE FILTERS */}
        <div>
          <h4 className="font-semibold text-red-700 dark:text-red-300 mb-1">
            Available Filter Options:
          </h4>
          <div className="space-y-1">
            {filterState.availableFilters.map(filter => (
              <div 
                key={filter.period} 
                className={`p-2 rounded border font-mono ${
                  filter.isActive 
                    ? 'bg-blue-100 border-blue-300 dark:bg-blue-900 dark:border-blue-600' 
                    : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={filter.isActive ? 'font-bold text-blue-800 dark:text-blue-200' : ''}>
                    {filter.period} - {filter.label}
                  </span>
                  <div className="flex space-x-2">
                    <Badge variant={filter.isActive ? 'default' : 'secondary'} className="text-xs">
                      {filter.isActive ? 'ACTIVE' : 'inactive'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {filter.count} tasks
                    </Badge>
                    {filter.disabled && (
                      <Badge variant="destructive" className="text-xs">
                        DISABLED
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ✅ PERFORMANCE METRICS */}
        <div>
          <h4 className="font-semibold text-red-700 dark:text-red-300 mb-1">
            Performance Metrics:
          </h4>
          <div className="bg-white dark:bg-gray-900 p-2 rounded border font-mono">
            <div>Original Tasks: {utils.performanceMetrics.originalTaskCount}</div>
            <div>Filtered Tasks: {utils.performanceMetrics.filteredTaskCount}</div>
            <div>Filter Efficiency: {Math.round(utils.performanceMetrics.filterEfficiency)}%</div>
            <div>Has Active Filters: <span className={utils.hasActiveFilters ? 'text-orange-600' : 'text-green-600'}>
              {utils.hasActiveFilters ? 'YES' : 'NO'}
            </span></div>
          </div>
        </div>

        {/* ✅ ISSUE DETECTION */}
        <div>
          <h4 className="font-semibold text-red-700 dark:text-red-300 mb-1">
            Issue Detection:
          </h4>
          <div className="space-y-1">
            {/* Check for multiple active filters */}
            {filterState.availableFilters.filter(f => f.isActive).length !== 1 && (
              <div className="bg-red-100 border-red-300 text-red-800 p-2 rounded">
                ❌ CRITICAL: {filterState.availableFilters.filter(f => f.isActive).length} active filters detected (should be exactly 1)
              </div>
            )}
            
            {/* Check for the specific "Daily button shining" bug - updated for simplified logic */}
            {filterState.availableFilters.find(f => f.period === 'daily')?.isActive && 
             filterState.activeFilter.period !== 'daily' && (
              <div className="bg-red-100 border-red-300 text-red-800 p-2 rounded">
                ❌ BUG DETECTED: Daily Tasks filter appears active but activeFilter.period is "{filterState.activeFilter.period}"
              </div>
            )}
            
            {/* Check for expected "all" default */}
            {filterState.activeFilter.period === 'all' && !filterState.availableFilters.find(f => f.period === 'all')?.isActive && (
              <div className="bg-yellow-100 border-yellow-300 text-yellow-800 p-2 rounded">
                ⚠️ WARNING: Active filter is "all" but "all" option not marked as active
              </div>
            )}

            {/* Show when everything is correct */}
            {filterState.availableFilters.filter(f => f.isActive).length === 1 &&
             filterState.availableFilters.find(f => f.period === filterState.activeFilter.period)?.isActive && (
              <div className="bg-green-100 border-green-300 text-green-800 p-2 rounded">
                ✅ Filter state appears correct - showing active tasks filtered by "{filterState.activeFilter.period}" period
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
