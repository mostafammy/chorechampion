/**
 * Simple Archive Table Integration Tests
 * Focus on core i18n numerals functionality
 */

import { render, screen } from '@testing-library/react';
import { ArchiveTable } from '../archive-table';
import { toLocaleNumerals } from '@/lib/utils/i18n-numerals';

// Mock the locale hook to return 'ar' for Arabic tests
const mockUseLocale = jest.fn();
const mockUseTranslations = jest.fn();

// Update the mock to be more controlled
jest.mock('next-intl', () => ({
  useLocale: () => mockUseLocale(),
  useTranslations: () => mockUseTranslations(),
}));

describe('Archive Table - Core i18n Numerals Integration', () => {
  const mockArchivedTasks = [
    {
      id: 'task1',
      name: 'Clean Kitchen',
      score: 50,
      period: 'weekly' as const,
      completed: true,
      assigneeId: 'user1',
      completedDate: new Date('2024-01-15'),
    },
    {
      id: 'task2', 
      name: 'Vacuum Living Room',
      score: 30,
      period: 'daily' as const,
      completed: true,
      assigneeId: 'user1',
      completedDate: new Date('2024-01-14'),
    },
  ];

  const mockMembers = [
    {
      id: 'user1',
      name: 'Ahmed',
      avatar: '/avatar1.jpg',
    },
  ];

  beforeEach(() => {
    // Reset mocks
    mockUseLocale.mockClear();
    mockUseTranslations.mockClear();
    
    // Set default locale to English
    mockUseLocale.mockReturnValue('en');
    mockUseTranslations.mockReturnValue((key: string) => {
      // Simple translation mock
      const translations: Record<string, string> = {
        'ArchiveTable.sortBy.date': 'Date',
        'ArchiveTable.sortBy.score': 'Score', 
        'ArchiveTable.sortBy.name': 'Name',
        'ArchiveTable.filterBy.all': 'All Tasks',
        'emptyState.title': 'No Completed Tasks Yet',
        'emptyState.description': 'Once family members start completing tasks, you will see them here.',
      };
      return translations[key] || key;
    });
  });

  test('should render basic component structure', () => {
    const { container } = render(
      <ArchiveTable archivedTasks={mockArchivedTasks} members={mockMembers} />
    );
    
    expect(container).toBeInTheDocument();
    expect(container.firstChild).toBeInTheDocument();
  });

  test('should display controls and buttons', () => {
    render(<ArchiveTable archivedTasks={mockArchivedTasks} members={mockMembers} />);
    
    // Check for sorting buttons - these are using the translation keys
    expect(screen.getByText('date')).toBeInTheDocument();
    expect(screen.getByText('score')).toBeInTheDocument(); 
    expect(screen.getByText('name')).toBeInTheDocument();
    
    // Check for filter buttons  
    expect(screen.getByText('all')).toBeInTheDocument();
  });

  test('should render empty state correctly', () => {
    render(<ArchiveTable archivedTasks={[]} members={[]} />);
    
    expect(screen.getByText('No Completed Tasks Yet')).toBeInTheDocument();
    expect(screen.getByText(/Once family members start completing tasks/)).toBeInTheDocument();
  });

  test('Arabic numerals utility integration', () => {
    // Test our numerals utility directly
    expect(toLocaleNumerals(50, 'ar')).toBe('٥٠');
    expect(toLocaleNumerals(30, 'ar')).toBe('٣٠');
    expect(toLocaleNumerals(25, 'ar')).toBe('٢٥');
    
    // Test English numerals
    expect(toLocaleNumerals(50, 'en')).toBe('50');
    expect(toLocaleNumerals(30, 'en')).toBe('30');
    expect(toLocaleNumerals(25, 'en')).toBe('25');
  });

  test('Arabic locale integration', () => {
    // Set Arabic locale
    mockUseLocale.mockReturnValue('ar');
    mockUseTranslations.mockReturnValue((key: string) => {
      const arabicTranslations: Record<string, string> = {
        'ArchiveTable.sortBy.date': 'التاريخ',
        'ArchiveTable.sortBy.score': 'النقاط',
        'ArchiveTable.sortBy.name': 'الاسم',
        'ArchiveTable.filterBy.all': 'جميع المهام',
        'emptyState.title': 'لا توجد مهام مكتملة بعد',
        'emptyState.description': 'بمجرد أن يبدأ أفراد الأسرة في إكمال المهام، ستراها هنا.',
      };
      return arabicTranslations[key] || key;
    });

    render(<ArchiveTable archivedTasks={[]} members={[]} />);
    
    // Check Arabic translations
    expect(screen.getByText('لا توجد مهام مكتملة بعد')).toBeInTheDocument();
    expect(screen.getByText(/بمجرد أن يبدأ أفراد الأسرة في إكمال المهام/)).toBeInTheDocument();
  });
});
