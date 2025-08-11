/**
 * @fileoverview Integration tests for ArchiveTable component with i18n numerals
 * @description Tests the complete flow of internationalization in archive table
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ArchiveTable } from '../archive-table';
import { toLocaleNumerals } from '@/lib/utils/i18n-numerals';
import type { ArchivedTask, Member } from '@/types';

// Mock translations with proper typing
const mockTranslations: Record<string, any> = {
  en: {
    'ArchiveTable.task': 'Task',
    'ArchiveTable.period': 'Period',
    'ArchiveTable.score': 'Score',
    'ArchiveTable.completed': 'Completed',
    'ArchiveTable.topPerformer': 'Top Performer',
    'ArchiveTable.emptyState.title': 'No Completed Tasks Yet',
    'ArchiveTable.emptyState.description': 'Once family members start completing tasks...',
    'ArchivePage.tasksCompleted': '{count, plural, one {# task completed} other {# tasks completed}}',
    'ArchivePage.points': 'points',
  },
  ar: {
    'ArchiveTable.task': 'المهمة',
    'ArchiveTable.period': 'الفترة',
    'ArchiveTable.score': 'النقاط',
    'ArchiveTable.completed': 'مكتملة',
    'ArchiveTable.topPerformer': 'الأفضل أداءً',
  }
};

// Mock the hooks
jest.mock('next-intl', () => ({
  useLocale: jest.fn(),
  useTranslations: jest.fn(),
}));

jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: jest.fn(() => false),
}));

jest.mock('@/lib/design-system/responsive-archive', () => ({
  useResponsiveArchive: jest.fn(() => ({})),
  responsiveBadges: {
    period: jest.fn(() => 'mock-badge-class'),
  },
}));

// Sample test data
const mockMembers: Member[] = [
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

const mockArchivedTasks: ArchivedTask[] = [
  {
    id: '1',
    name: 'Clean Kitchen',
    score: 50,
    period: 'daily',
    completed: true,
    assigneeId: '1',
    completedDate: new Date('2025-08-04'),
  },
  {
    id: '2',
    name: 'Do Homework',
    score: 30,
    period: 'weekly',
    completed: true,
    assigneeId: '1',
    completedDate: new Date('2025-08-03'),
  },
  {
    id: '3',
    name: 'Water Plants',
    score: 25,
    period: 'daily',
    completed: true,
    assigneeId: '2',
    completedDate: new Date('2025-08-04'),
  },
];

describe('ArchiveTable Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('English Locale (en)', () => {
    beforeEach(() => {
      const { useLocale, useTranslations } = require('next-intl');
      useLocale.mockReturnValue('en');
      useTranslations.mockImplementation((namespace: string) => {
        return (key: string, params?: any) => {
          const fullKey = namespace ? `${namespace}.${key}` : key;
          let translation = mockTranslations.en[fullKey] || fullKey;
          
          // Handle ICU message format for plurals
          if (params && translation.includes('plural')) {
            const count = params.count || 0;
            if (count === 1) {
              translation = translation.replace(/{count, plural, one {([^}]+)} other {[^}]+}}/g, '$1').replace('#', count.toString());
            } else {
              translation = translation.replace(/{count, plural, one {[^}]+} other {([^}]+)}}/g, '$1').replace('#', count.toString());
            }
          }
          
          // Handle simple parameter replacement
          if (params) {
            Object.keys(params).forEach(param => {
              translation = translation.replace(new RegExp(`{${param}}`, 'g'), params[param]);
            });
          }
          
          return translation;
        };
      });
    });

    test('displays English numerals correctly', () => {
      render(<ArchiveTable archivedTasks={mockArchivedTasks} members={mockMembers} />);
      
      // Check that English numerals are displayed in score contexts
      const scoreElements = screen.getAllByText(/\d+/);
      expect(scoreElements.length).toBeGreaterThan(0);
      
      // Look for individual scores
      expect(screen.getByText(/50/)).toBeInTheDocument();
      expect(screen.getByText(/30/)).toBeInTheDocument(); 
      expect(screen.getByText(/25/)).toBeInTheDocument();
    });

    test('shows correct member statistics with English numerals', () => {
      render(<ArchiveTable archivedTasks={mockArchivedTasks} members={mockMembers} />);
      
      // Ahmed should have 2 tasks completed (50+30=80 points)
      // Sara should have 1 task completed (25 points)
      const taskElements = screen.getAllByText(/task/i);
      expect(taskElements.length).toBeGreaterThan(0);
    });
  });

  describe('Arabic Locale (ar)', () => {
    beforeEach(() => {
      const { useLocale, useTranslations } = require('next-intl');
      useLocale.mockReturnValue('ar');
      useTranslations.mockImplementation((namespace: string) => {
        return (key: string) => {
          const fullKey = namespace ? `${namespace}.${key}` : key;
          return mockTranslations.ar[fullKey] || mockTranslations.en[fullKey] || fullKey;
        };
      });
    });

    test('displays Arabic numerals correctly', () => {
      render(<ArchiveTable archivedTasks={mockArchivedTasks} members={mockMembers} />);
      
      // Check that Arabic numerals are displayed using our utility
      const expectedArabic50 = toLocaleNumerals(50, 'ar'); // ٥٠
      const expectedArabic30 = toLocaleNumerals(30, 'ar'); // ٣٠
      const expectedArabic25 = toLocaleNumerals(25, 'ar'); // ٢٥
      
      // These should be in score displays
      expect(screen.getByText(new RegExp(expectedArabic50))).toBeInTheDocument();
      expect(screen.getByText(new RegExp(expectedArabic30))).toBeInTheDocument();
      expect(screen.getByText(new RegExp(expectedArabic25))).toBeInTheDocument();
    });

    test('displays Arabic UI text correctly', () => {
      render(<ArchiveTable archivedTasks={mockArchivedTasks} members={mockMembers} />);
      
      // Check Arabic translations are being used
      expect(screen.getByText('المهمة')).toBeInTheDocument(); // Task
      expect(screen.getByText('النقاط')).toBeInTheDocument();  // Score
      expect(screen.getByText('الفترة')).toBeInTheDocument();  // Period
    });

    test('member statistics use Arabic numerals', () => {
      render(<ArchiveTable archivedTasks={mockArchivedTasks} members={mockMembers} />);
      
      // Check for Arabic numerals in member statistics
      const expectedArabic2 = toLocaleNumerals(2, 'ar'); // ٢
      const expectedArabic1 = toLocaleNumerals(1, 'ar'); // ١
      const expectedArabic80 = toLocaleNumerals(80, 'ar'); // ٨٠
      const expectedArabic25 = toLocaleNumerals(25, 'ar'); // ٢٥
      
      // These might be in the component output
      expect(screen.getByText(new RegExp(expectedArabic2))).toBeInTheDocument();
      expect(screen.getByText(new RegExp(expectedArabic1))).toBeInTheDocument();
      expect(screen.getByText(new RegExp(expectedArabic80))).toBeInTheDocument();
      expect(screen.getByText(new RegExp(expectedArabic25))).toBeInTheDocument();
    });
  });

  describe('Performance and Integration', () => {
    test('renders without performance issues', () => {
      const startTime = performance.now();
      render(<ArchiveTable archivedTasks={mockArchivedTasks} members={mockMembers} />);
      const endTime = performance.now();
      
      // Should render in under 100ms
      expect(endTime - startTime).toBeLessThan(100);
    });

    test('i18n numeral conversion performance', () => {
      const testNumbers = Array.from({ length: 1000 }, (_, i) => i);
      
      const startTime = performance.now();
      testNumbers.forEach(num => {
        toLocaleNumerals(num, 'ar');
      });
      const endTime = performance.now();
      
      // Should process 1000 conversions in under 50ms
      expect(endTime - startTime).toBeLessThan(50);
    });

    test('integrates correctly with Arabic locale', () => {
      const { useLocale, useTranslations } = require('next-intl');
      useLocale.mockReturnValue('ar');
      useTranslations.mockImplementation(() => (key: string) => key);
      
      const { container } = render(<ArchiveTable archivedTasks={mockArchivedTasks} members={mockMembers} />);
      
      // Component should render successfully
      expect(container.firstChild).toBeInTheDocument();
      
      // Should contain Arabic numerals
      const arabic50 = toLocaleNumerals(50, 'ar');
      expect(screen.getByText(new RegExp(arabic50))).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    test('shows empty state when no data', () => {
      render(<ArchiveTable archivedTasks={[]} members={[]} />);
      
      expect(screen.getByText('No Completed Tasks Yet')).toBeInTheDocument();
      expect(screen.getByText(/Once family members start completing tasks/)).toBeInTheDocument();
    });
  });
});
