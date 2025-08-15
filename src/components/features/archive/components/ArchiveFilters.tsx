'use client';

/**
 * ✅ ENTERPRISE ARCHIVE FILTERS COMPONENT
 *
 * Advanced filtering UI with responsive design and accessibility.
 * Implements compound component pattern and enterprise UX.
 *
 * @module ArchiveFilters
 * @version 1.0.0
 * @author Principal Engineering Team
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { 
  Search, 
  SortAsc, 
  SortDesc, 
  Calendar,
  Users,
  LayoutGrid,
  List,
  Clock,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { 
  ArchiveFiltersProps, 
  ArchiveSortBy, 
  ArchiveFilterPeriod, 
  ArchiveViewMode 
} from '../types';

/**
 * ✅ SOLID PRINCIPLES: Single Responsibility
 * This component only handles filter UI and user interactions
 */
export function ArchiveFilters({ 
  filter, 
  onFilterChange, 
  className,
  variant = 'full' 
}: ArchiveFiltersProps) {
  const t = useTranslations('ArchiveTable');
  const tFilter = useTranslations('ArchiveTable.filterBy');
  const tSort = useTranslations('ArchiveTable.sortBy');
  const tView = useTranslations('ArchiveTable.viewMode');

  // ✅ CONFIGURATION: Filter options with translations
  const sortOptions: { value: ArchiveSortBy; label: string; icon: React.ReactNode }[] = [
    { value: 'date', label: tSort('date'), icon: <Calendar className="w-4 h-4" /> },
    { value: 'score', label: tSort('score'), icon: <SortDesc className="w-4 h-4" /> },
    { value: 'name', label: tSort('name'), icon: <SortAsc className="w-4 h-4" /> },
    { value: 'performance', label: tSort('performance'), icon: <SortDesc className="w-4 h-4" /> },
  ];

  const periodOptions: { value: ArchiveFilterPeriod; label: string }[] = [
    { value: 'all', label: tFilter('all') },
    { value: 'today', label: tFilter('today') },
    { value: 'week', label: tFilter('week') },
    { value: 'month', label: tFilter('month') },
    { value: 'quarter', label: tFilter('quarter') },
    { value: 'year', label: tFilter('year') },
  ];

  const viewModeOptions: { value: ArchiveViewMode; label: string; icon: React.ReactNode }[] = [
    { value: 'table', label: tView('table'), icon: <List className="w-4 h-4" /> },
    { value: 'cards', label: tView('cards'), icon: <LayoutGrid className="w-4 h-4" /> },
    { value: 'timeline', label: tView('timeline'), icon: <Clock className="w-4 h-4" /> },
  ];

  // ✅ BUSINESS LOGIC: Calculate active filters count
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (filter.filterPeriod !== 'all') count++;
    if (filter.searchQuery) count++;
    if (filter.selectedMember) count++;
    return count;
  }, [filter.filterPeriod, filter.searchQuery, filter.selectedMember]);

  // ✅ EVENT HANDLERS: Optimized event handling
  const handleSearchChange = React.useCallback((value: string) => {
    onFilterChange({ searchQuery: value });
  }, [onFilterChange]);

  const handleSortChange = React.useCallback((value: ArchiveSortBy) => {
    onFilterChange({ sortBy: value });
  }, [onFilterChange]);

  const handlePeriodChange = React.useCallback((value: ArchiveFilterPeriod) => {
    onFilterChange({ filterPeriod: value });
  }, [onFilterChange]);

  const handleViewModeChange = React.useCallback((value: ArchiveViewMode) => {
    onFilterChange({ viewMode: value });
  }, [onFilterChange]);

  const handleClearFilters = React.useCallback(() => {
    onFilterChange({
      filterPeriod: 'all',
      searchQuery: '',
      selectedMember: undefined,
    });
  }, [onFilterChange]);

  // ✅ RESPONSIVE: Compact variant for mobile
  if (variant === 'compact' || variant === 'minimal') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {/* Compact Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={filter.searchQuery || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Compact Filters Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="relative">
              <SortAsc className="w-4 h-4" />
              {activeFiltersCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {/* Sort Options */}
            <div className="px-2 py-1 text-xs font-medium text-gray-500">
              {tSort('label')}
            </div>
            {sortOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleSortChange(option.value)}
                className={cn(
                  "flex items-center gap-2",
                  filter.sortBy === option.value && "bg-blue-50 text-blue-700"
                )}
              >
                {option.icon}
                {option.label}
              </DropdownMenuItem>
            ))}
            
            <DropdownMenuSeparator />
            
            {/* Period Options */}
            <div className="px-2 py-1 text-xs font-medium text-gray-500">
              {tFilter('period')}
            </div>
            {periodOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handlePeriodChange(option.value)}
                className={cn(
                  filter.filterPeriod === option.value && "bg-blue-50 text-blue-700"
                )}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
            
            {activeFiltersCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleClearFilters} className="text-red-600">
                  <X className="w-4 h-4 mr-2" />
                  {t('clearFilters')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View Mode Toggle */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
          {viewModeOptions.map((option) => (
            <Button
              key={option.value}
              variant={filter.viewMode === option.value ? "default" : "ghost"}
              size="sm"
              onClick={() => handleViewModeChange(option.value)}
              className={cn(
                "rounded-none first:rounded-l-lg last:rounded-r-lg border-0",
                filter.viewMode === option.value && "bg-blue-600 text-white"
              )}
            >
              {option.icon}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  // ✅ FULL VARIANT: Complete filter interface
  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and Main Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={filter.searchQuery || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sort By */}
        <Select value={filter.sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={tSort('label')} />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  {option.icon}
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filter Period */}
        <Select value={filter.filterPeriod} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={tFilter('period')} />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {activeFiltersCount > 0 && (
          <Button
            variant="outline"
            onClick={handleClearFilters}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            {t('clearFilters')}
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          </Button>
        )}
      </div>

      {/* View Mode and Secondary Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {tView('label')}:
          </span>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
            {viewModeOptions.map((option) => (
              <Button
                key={option.value}
                variant={filter.viewMode === option.value ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewModeChange(option.value)}
                className={cn(
                  "rounded-none first:rounded-l-lg last:rounded-r-lg border-0 px-3",
                  filter.viewMode === option.value && "bg-blue-600 text-white"
                )}
              >
                {option.icon}
                <span className="ml-2 hidden sm:inline">{option.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Active Filters Summary */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span>{activeFiltersCount} active filter{activeFiltersCount !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ✅ PERFORMANCE: Memoized component to prevent unnecessary re-renders
 */
export default React.memo(ArchiveFilters);
