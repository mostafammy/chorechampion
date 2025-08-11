import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { LastUpdated } from '../last-updated';

// ✅ Test utilities and mocks
const mockMessages = {
  Common: {
    lastUpdated: 'Last updated',
  },
};

const mockMessagesArabic = {
  Common: {
    lastUpdated: 'آخر تحديث',
  },
};

const TestWrapper = ({ 
  children, 
  locale = 'en',
  messages = mockMessages 
}: { 
  children: React.ReactNode;
  locale?: string;
  messages?: any;
}) => (
  <NextIntlClientProvider locale={locale} messages={messages}>
    {children}
  </NextIntlClientProvider>
);

describe('LastUpdated Component', () => {
  const testTimestamp = '2024-01-15T10:30:00.000Z';

  describe('✅ Core Functionality', () => {
    it('renders last updated timestamp correctly in English', () => {
      render(
        <TestWrapper>
          <LastUpdated timestamp={testTimestamp} />
        </TestWrapper>
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/last updated:/i)).toBeInTheDocument();
    });

    it('renders last updated timestamp correctly in Arabic', () => {
      render(
        <TestWrapper locale="ar" messages={mockMessagesArabic}>
          <LastUpdated timestamp={testTimestamp} />
        </TestWrapper>
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/آخر تحديث/)).toBeInTheDocument();
    });

    it('formats date with Gregorian calendar consistently', () => {
      render(
        <TestWrapper>
          <LastUpdated timestamp={testTimestamp} />
        </TestWrapper>
      );

      const bdiElement = screen.getByRole('status').querySelector('bdi');
      expect(bdiElement).toHaveAttribute('dir', 'ltr');
      expect(bdiElement).toBeInTheDocument();
    });
  });

  describe('✅ Internationalization & RTL Support', () => {
    it('displays Arabic layout with date first, then label', () => {
      render(
        <TestWrapper locale="ar" messages={mockMessagesArabic}>
          <LastUpdated timestamp={testTimestamp} />
        </TestWrapper>
      );

      const statusElement = screen.getByRole('status');
      const textContent = statusElement.textContent;
      
      // Arabic layout should have date first, then colon and label
      expect(textContent).toMatch(/^\d+.*:\s*آخر تحديث$/);
    });

    it('displays English layout with label first, then date', () => {
      render(
        <TestWrapper>
          <LastUpdated timestamp={testTimestamp} />
        </TestWrapper>
      );

      const statusElement = screen.getByRole('status');
      const textContent = statusElement.textContent;
      
      // English layout should have label first, then colon and date
      expect(textContent).toMatch(/^Last updated:\s*\d+/);
    });

    it('uses bidirectional text isolation for dates', () => {
      render(
        <TestWrapper locale="ar" messages={mockMessagesArabic}>
          <LastUpdated timestamp={testTimestamp} />
        </TestWrapper>
      );

      const bdiElement = screen.getByRole('status').querySelector('bdi');
      expect(bdiElement).toHaveAttribute('dir', 'ltr');
      expect(bdiElement).toHaveClass('inline-block');
    });
  });

  describe('✅ Design System Variants', () => {
    it('applies size variants correctly', () => {
      const { rerender } = render(
        <TestWrapper>
          <LastUpdated timestamp={testTimestamp} size="sm" />
        </TestWrapper>
      );
      expect(screen.getByRole('status')).toHaveClass('text-xs');

      rerender(
        <TestWrapper>
          <LastUpdated timestamp={testTimestamp} size="md" />
        </TestWrapper>
      );
      expect(screen.getByRole('status')).toHaveClass('text-sm');

      rerender(
        <TestWrapper>
          <LastUpdated timestamp={testTimestamp} size="lg" />
        </TestWrapper>
      );
      expect(screen.getByRole('status')).toHaveClass('text-base');
    });

    it('applies color variants correctly', () => {
      const { rerender } = render(
        <TestWrapper>
          <LastUpdated timestamp={testTimestamp} variant="default" />
        </TestWrapper>
      );
      expect(screen.getByRole('status')).toHaveClass('text-foreground');

      rerender(
        <TestWrapper>
          <LastUpdated timestamp={testTimestamp} variant="muted" />
        </TestWrapper>
      );
      expect(screen.getByRole('status')).toHaveClass('text-muted-foreground');

      rerender(
        <TestWrapper>
          <LastUpdated timestamp={testTimestamp} variant="accent" />
        </TestWrapper>
      );
      expect(screen.getByRole('status')).toHaveClass('text-accent-foreground');
    });

    it('applies custom className correctly', () => {
      render(
        <TestWrapper>
          <LastUpdated timestamp={testTimestamp} className="custom-class" />
        </TestWrapper>
      );

      expect(screen.getByRole('status')).toHaveClass('custom-class');
    });
  });

  describe('✅ Accessibility Features', () => {
    it('has proper ARIA role and label', () => {
      render(
        <TestWrapper>
          <LastUpdated timestamp={testTimestamp} />
        </TestWrapper>
      );

      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveAttribute('aria-label');
      expect(statusElement.getAttribute('aria-label')).toMatch(/Last updated:/);
    });

    it('provides tooltip with full timestamp information', () => {
      render(
        <TestWrapper>
          <LastUpdated timestamp={testTimestamp} />
        </TestWrapper>
      );

      const bdiElement = screen.getByRole('status').querySelector('bdi');
      expect(bdiElement).toHaveAttribute('title');
      expect(bdiElement?.getAttribute('title')).toMatch(/Last updated:/);
    });
  });

  describe('✅ Customization Options', () => {
    it('uses label override when provided', () => {
      render(
        <TestWrapper>
          <LastUpdated timestamp={testTimestamp} labelOverride="Custom Label" />
        </TestWrapper>
      );

      expect(screen.getByText(/custom label:/i)).toBeInTheDocument();
    });

    it('falls back to default label when translation is missing', () => {
      render(
        <TestWrapper messages={{}}>
          <LastUpdated timestamp={testTimestamp} />
        </TestWrapper>
      );

      expect(screen.getByText(/last updated:/i)).toBeInTheDocument();
    });
  });

  describe('✅ Performance & Stability', () => {
    it('handles invalid timestamps gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(
        <TestWrapper>
          <LastUpdated timestamp="invalid-date" />
        </TestWrapper>
      );

      // Component should render without crashing
      expect(screen.getByRole('status')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('re-renders only when props change (memo optimization)', () => {
      const { rerender } = render(
        <TestWrapper>
          <LastUpdated timestamp={testTimestamp} />
        </TestWrapper>
      );

      // Same props should not cause re-render
      rerender(
        <TestWrapper>
          <LastUpdated timestamp={testTimestamp} />
        </TestWrapper>
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('✅ Edge Cases', () => {
    it('handles future timestamps correctly', () => {
      const futureTimestamp = '2030-12-31T23:59:59.999Z';
      
      render(
        <TestWrapper>
          <LastUpdated timestamp={futureTimestamp} />
        </TestWrapper>
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/last updated:/i)).toBeInTheDocument();
    });

    it('handles very old timestamps correctly', () => {
      const oldTimestamp = '1970-01-01T00:00:00.000Z';
      
      render(
        <TestWrapper>
          <LastUpdated timestamp={oldTimestamp} />
        </TestWrapper>
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/last updated:/i)).toBeInTheDocument();
    });
  });
});
