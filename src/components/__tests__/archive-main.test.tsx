/**
 * @fileoverview Integration tests for ArchiveMain component with i18n numerals
 * @description Tests the i18n numerals integration with archive main statistics display
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ArchiveMain from '../archive-main';
import { toLocaleNumerals } from '@/lib/utils/i18n-numerals';

// Mock the app context
jest.mock('@/context/app-provider', () => ({
  useAppContext: jest.fn(),
}));

// Mock all dependencies
jest.mock('next-intl', () => ({
  useLocale: jest.fn(),
  useTranslations: jest.fn(),
}));

jest.mock('@/lib/design-system/responsive-archive', () => ({
  useResponsiveArchive: jest.fn(() => ({
    containerStyles: 'mock-container',
    headerStyles: 'mock-header',
    statsStyles: 'mock-stats',
  })),
}));

jest.mock('@/components/archive-table', () => ({
  ArchiveTable: ({ archivedTasks, members }: any) => (
    <div data-testid="archive-table">
      Archive Table with {archivedTasks.length} tasks and {members.length} members
    </div>
  ),
}));

jest.mock('@/components/ui/last-updated', () => ({
  LastUpdated: ({ timestamp, labelOverride }: any) => (
    <div data-testid="last-updated">
      {labelOverride}: {timestamp}
    </div>
  ),
}));

// Sample test data
const mockMembers = [
  {
    id: '1',
    name: 'Ahmed Ali',
    avatar: '/avatar1.jpg',
  },
  {
    id: '2',
    name: 'Sara Mohammed',
    avatar: '/avatar2.jpg',
  },
];

const mockArchivedTasks = [
  {
    id: '1',
    name: 'Clean Kitchen',
    score: 50,
    assigneeId: '1',
    completedDate: new Date('2025-01-20'),
    period: 'daily' as const,
    completed: true,
  },
  {
    id: '2',
    name: 'Do Math Homework',
    score: 30,
    assigneeId: '1',
    completedDate: new Date('2025-01-19'),
    period: 'weekly' as const,
    completed: true,
  },
  {
    id: '3',
    name: 'Water Plants',
    score: 25,
    assigneeId: '2',
    completedDate: new Date('2025-01-20'),
    period: 'daily' as const,
    completed: true,
  },
  {
    id: '4',
    name: 'Organize Garage',
    score: 75,
    assigneeId: '2',
    completedDate: new Date('2025-01-18'),
    period: 'monthly' as const,
    completed: true,
  },
];

const mockTranslations = {
  en: {
    'ArchivePage.title': 'Archive',
    'ArchivePage.description': 'View completed tasks and performance history',
    'ArchivePage.lastUpdated': 'Last updated',
    'ArchivePage.statistics.totalTasks': 'Total Tasks',
    'ArchivePage.statistics.totalTasksShort': 'Tasks',
    'ArchivePage.statistics.totalPoints': 'Total Points',
    'ArchivePage.statistics.totalPointsShort': 'Points',
    'ArchivePage.statistics.activeMembers': 'Active Members',
    'ArchivePage.statistics.activeMembersShort': 'Members',
    'ArchivePage.statistics.thisWeek': 'This Week',
    'ArchivePage.statistics.thisWeekShort': 'Week',
    'ArchivePage.controls.viewTimeline': 'View Timeline',
    'ArchivePage.controls.viewTimelineShort': 'Timeline',
  },
  ar: {
    'ArchivePage.title': 'الأرشيف',
    'ArchivePage.description': 'عرض المهام المكتملة وتاريخ الأداء',
    'ArchivePage.lastUpdated': 'آخر تحديث',
    'ArchivePage.statistics.totalTasks': 'إجمالي المهام',
    'ArchivePage.statistics.totalTasksShort': 'المهام',
    'ArchivePage.statistics.totalPoints': 'إجمالي النقاط',
    'ArchivePage.statistics.totalPointsShort': 'النقاط',
    'ArchivePage.statistics.activeMembers': 'الأعضاء النشطون',
    'ArchivePage.statistics.activeMembersShort': 'الأعضاء',
    'ArchivePage.statistics.thisWeek': 'هذا الأسبوع',
    'ArchivePage.statistics.thisWeekShort': 'الأسبوع',
    'ArchivePage.controls.viewTimeline': 'عرض الجدول الزمني',
    'ArchivePage.controls.viewTimelineShort': 'الجدول الزمني',
  }
};

describe('ArchiveMain Component with i18n Numerals', () => {
  beforeEach(() => {
    const { useAppContext } = require('@/context/app-provider');
    useAppContext.mockReturnValue({
      archivedTasks: mockArchivedTasks,
      members: mockMembers,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('English Locale (en)', () => {
    beforeEach(() => {
      const { useLocale, useTranslations } = require('next-intl');
      useLocale.mockReturnValue('en');
      useTranslations.mockImplementation((namespace: string) => {
        return (key: string) => {
          const fullKey = namespace ? `${namespace}.${key}` : key;
          return mockTranslations.en[fullKey as keyof typeof mockTranslations.en] || fullKey;
        };
      });
    });

    test('displays English numerals in statistics cards', () => {
      render(<ArchiveMain />);
      
      // Check statistics: 4 total tasks, 180 total points (50+30+25+75), 2 unique members
      expect(screen.getByText('4')).toBeInTheDocument(); // Total tasks
      expect(screen.getByText('180')).toBeInTheDocument(); // Total score
      expect(screen.getByText('2')).toBeInTheDocument(); // Unique members
      
      // Check English text using more specific selectors
      const archiveHeading = screen.getByRole('heading', { name: /Archive/i });
      expect(archiveHeading).toBeInTheDocument();
      expect(screen.getByText('Total Tasks')).toBeInTheDocument();
      expect(screen.getByText('Total Points')).toBeInTheDocument();
    });

    test('renders all statistics cards with correct English numbers', () => {
      render(<ArchiveMain />);
      
      // Verify all four statistics cards are rendered with English numerals
      const statisticsCards = screen.getAllByText(/\d+/);
      expect(statisticsCards.length).toBeGreaterThanOrEqual(4);
      
      // Check that numbers are in English format (no Arabic-Indic digits)
      statisticsCards.forEach(card => {
        expect(card.textContent).not.toMatch(/[٠-٩]/); // No Arabic-Indic digits
        expect(card.textContent).toMatch(/[0-9]/); // Contains Western digits
      });
    });
  });

  describe('Arabic Locale (ar)', () => {
    beforeEach(() => {
      const { useLocale, useTranslations } = require('next-intl');
      useLocale.mockReturnValue('ar');
      useTranslations.mockImplementation((namespace: string) => {
        return (key: string) => {
          const fullKey = namespace ? `${namespace}.${key}` : key;
          return mockTranslations.ar[fullKey as keyof typeof mockTranslations.ar] || 
                 mockTranslations.en[fullKey as keyof typeof mockTranslations.en] || 
                 fullKey;
        };
      });
    });

    test('displays Arabic numerals in statistics cards', () => {
      render(<ArchiveMain />);
      
      // Check Arabic numerals using our utility
      const expectedArabic4 = toLocaleNumerals(4, 'ar');     // ٤ (total tasks)
      const expectedArabic180 = toLocaleNumerals(180, 'ar'); // ١٨٠ (total points)
      const expectedArabic2 = toLocaleNumerals(2, 'ar');     // ٢ (unique members)
      
      expect(screen.getByText(expectedArabic4)).toBeInTheDocument();
      expect(screen.getByText(expectedArabic180)).toBeInTheDocument();
      expect(screen.getByText(expectedArabic2)).toBeInTheDocument();
      
      // Check Arabic text
      expect(screen.getByText('الأرشيف')).toBeInTheDocument();
      expect(screen.getByText('إجمالي المهام')).toBeInTheDocument();
      expect(screen.getByText('إجمالي النقاط')).toBeInTheDocument();
    });

    test('renders all statistics cards with correct Arabic numerals', () => {
      render(<ArchiveMain />);
      
      // Check that Arabic-Indic numerals are used in statistics cards
      const arabic4 = toLocaleNumerals(4, 'ar');
      const arabic180 = toLocaleNumerals(180, 'ar');
      const arabic2 = toLocaleNumerals(2, 'ar');
      
      expect(screen.getByText(arabic4)).toBeInTheDocument();
      expect(screen.getByText(arabic180)).toBeInTheDocument();
      expect(screen.getByText(arabic2)).toBeInTheDocument();
      
      // Verify Arabic-Indic digits are present in the component
      const statisticsContainer = screen.getByText(arabic4).closest('div')?.parentElement;
      expect(statisticsContainer?.textContent).toMatch(/[٠-٩]/);
    });

    test('weekly tasks calculation uses Arabic numerals', () => {
      render(<ArchiveMain />);
      
      // Calculate weekly tasks (tasks from last 7 days)
      // Based on our mock data, tasks from 2025-01-18 to 2025-01-20 should be included
      const weeklyTasksCount = mockArchivedTasks.filter(task => {
        const taskDate = new Date(task.completedDate);
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return taskDate >= weekAgo;
      }).length;
      
      const expectedArabicWeekly = toLocaleNumerals(weeklyTasksCount, 'ar');
      expect(screen.getByText(expectedArabicWeekly)).toBeInTheDocument();
    });
  });

  describe('Performance and Integration', () => {
    test('component renders without errors with Arabic numerals', () => {
      const { useLocale, useTranslations } = require('next-intl');
      useLocale.mockReturnValue('ar');
      useTranslations.mockImplementation(() => (key: string) => key);
      
      const { container } = render(<ArchiveMain />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test('i18n numerals conversion performance in component', () => {
      const { useLocale, useTranslations } = require('next-intl');
      useLocale.mockReturnValue('ar');
      useTranslations.mockImplementation(() => (key: string) => key);
      
      const startTime = performance.now();
      render(<ArchiveMain />);
      const endTime = performance.now();
      
      // Should render with Arabic numerals in under 100ms
      expect(endTime - startTime).toBeLessThan(100);
    });

    test('statistics calculations are accurate with large numbers', () => {
      // Create large dataset
      const largeTasks = Array.from({ length: 100 }, (_, i) => ({
        id: `task-${i}`,
        name: `Task ${i}`,
        score: 50,
        assigneeId: '1',
        completedDate: new Date(),
        period: 'daily' as const,
        completed: true,
      }));

      const { useAppContext } = require('@/context/app-provider');
      useAppContext.mockReturnValue({
        archivedTasks: largeTasks,
        members: mockMembers,
      });

      const { useLocale, useTranslations } = require('next-intl');
      useLocale.mockReturnValue('ar');
      useTranslations.mockImplementation(() => (key: string) => key);
      
      render(<ArchiveMain />);
      
      // Check large numbers are converted correctly
      const expectedTotal = toLocaleNumerals(100, 'ar'); // Total tasks
      const expectedScore = toLocaleNumerals(5000, 'ar'); // Total score (100 * 50)
      
      // Use getAllByText for numbers that might appear multiple times
      const totalElements = screen.getAllByText(expectedTotal);
      expect(totalElements.length).toBeGreaterThan(0);
      
      expect(screen.getByText(expectedScore)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    test('handles empty tasks gracefully', () => {
      const { useAppContext } = require('@/context/app-provider');
      useAppContext.mockReturnValue({
        archivedTasks: [],
        members: mockMembers,
      });

      const { useLocale, useTranslations } = require('next-intl');
      useLocale.mockReturnValue('en');
      useTranslations.mockImplementation(() => (key: string) => key);
      
      render(<ArchiveMain />);
      
      // Should not show statistics when no tasks
      expect(screen.queryByText('4')).not.toBeInTheDocument();
      expect(screen.getByTestId('archive-table')).toBeInTheDocument();
    });
  });
});
