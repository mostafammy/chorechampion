import type { Meta, StoryObj } from '@storybook/react';
import { NextIntlClientProvider } from 'next-intl';
import { LastUpdated } from '../last-updated';

// ✅ Mock messages for Storybook
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

// ✅ Storybook wrapper for internationalization
const IntlWrapper = ({ 
  children, 
  locale = 'en',
  messages = mockMessages 
}: { 
  children: React.ReactNode;
  locale?: string;
  messages?: any;
}) => (
  <NextIntlClientProvider locale={locale} messages={messages}>
    <div className="p-4 max-w-md mx-auto">
      {children}
    </div>
  </NextIntlClientProvider>
);

const meta: Meta<typeof LastUpdated> = {
  title: 'UI/LastUpdated',
  component: LastUpdated,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
# LastUpdated Component

An enterprise-grade component for displaying last updated timestamps with full internationalization support.

## Features
- 🌍 Full i18n support with RTL/LTR text handling
- 🗓️ Consistent Gregorian calendar enforcement
- 🎨 Design system variants for different contexts
- ⚡ Memoized for optimal performance
- ♿ Accessible with proper ARIA attributes
- 🏗️ Enterprise-grade type safety

## Usage
Use this component anywhere you need to display timestamp information with proper internationalization.
        `,
      },
    },
  },
  argTypes: {
    timestamp: {
      control: 'text',
      description: 'ISO timestamp string for the last update',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size variant for different use cases',
    },
    variant: {
      control: 'select',
      options: ['default', 'muted', 'accent'],
      description: 'Color variant for different contexts',
    },
    className: {
      control: 'text',
      description: 'Optional CSS classes for styling customization',
    },
    labelOverride: {
      control: 'text',
      description: 'Optional prefix text override',
    },
  },
  decorators: [
    (Story, context) => (
      <IntlWrapper locale={context.globals?.locale || 'en'}>
        <Story />
      </IntlWrapper>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LastUpdated>;

// ✅ Default Story
export const Default: Story = {
  args: {
    timestamp: '2024-01-15T10:30:00.000Z',
  },
};

// ✅ Size Variants
export const SizeVariants: Story = {
  render: (args) => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Small (sm)</h3>
        <LastUpdated {...args} size="sm" />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Medium (md) - Default</h3>
        <LastUpdated {...args} size="md" />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Large (lg)</h3>
        <LastUpdated {...args} size="lg" />
      </div>
    </div>
  ),
  args: {
    timestamp: '2024-01-15T10:30:00.000Z',
  },
};

// ✅ Color Variants
export const ColorVariants: Story = {
  render: (args) => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Default</h3>
        <LastUpdated {...args} variant="default" />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Muted (Recommended)</h3>
        <LastUpdated {...args} variant="muted" />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Accent</h3>
        <LastUpdated {...args} variant="accent" />
      </div>
    </div>
  ),
  args: {
    timestamp: '2024-01-15T10:30:00.000Z',
  },
};

// ✅ Arabic RTL Layout
export const ArabicRTL: Story = {
  decorators: [
    (Story) => (
      <IntlWrapper locale="ar" messages={mockMessagesArabic}>
        <div dir="rtl" className="text-right">
          <Story />
        </div>
      </IntlWrapper>
    ),
  ],
  args: {
    timestamp: '2024-01-15T10:30:00.000Z',
  },
  parameters: {
    docs: {
      description: {
        story: 'Arabic layout with proper RTL text flow and bidirectional text isolation for dates.',
      },
    },
  },
};

// ✅ Custom Label
export const CustomLabel: Story = {
  args: {
    timestamp: '2024-01-15T10:30:00.000Z',
    labelOverride: 'Data refreshed',
  },
  parameters: {
    docs: {
      description: {
        story: 'Custom label text instead of default "Last updated".',
      },
    },
  },
};

// ✅ Real-world Usage Examples
export const UsageExamples: Story = {
  render: (args) => (
    <div className="space-y-8">
      {/* Leaderboard Footer */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-lg">
        <h3 className="text-xl font-bold mb-4">🏆 Leaderboard</h3>
        <div className="space-y-2">
          <div className="bg-white/10 backdrop-blur-sm p-3 rounded">
            <span className="font-semibold">1. John Doe - 1,250 pts</span>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-3 rounded">
            <span className="font-semibold">2. Jane Smith - 1,100 pts</span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/20">
          <LastUpdated {...args} variant="default" className="text-white/80" />
        </div>
      </div>

      {/* Dashboard Widget */}
      <div className="bg-white dark:bg-gray-800 border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">📊 Dashboard Stats</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Recent activity and performance metrics
        </p>
        <LastUpdated {...args} size="sm" />
      </div>

      {/* Data Table Footer */}
      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">📋 Task Archive</h3>
        <div className="space-y-2 mb-4">
          <div className="bg-white dark:bg-gray-800 p-3 rounded border">
            Clean kitchen - Completed ✅
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded border">
            Vacuum living room - Completed ✅
          </div>
        </div>
        <LastUpdated {...args} labelOverride="Archive updated" size="sm" />
      </div>
    </div>
  ),
  args: {
    timestamp: '2024-01-15T10:30:00.000Z',
  },
  parameters: {
    docs: {
      description: {
        story: 'Real-world usage examples showing the component in different contexts.',
      },
    },
  },
};

// ✅ Performance Test
export const PerformanceTest: Story = {
  render: (args) => (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold mb-4">Performance Test - Multiple Instances</h3>
      {Array.from({ length: 20 }, (_, index) => (
        <div key={index} className="bg-gray-50 dark:bg-gray-900 p-2 rounded">
          <span className="text-sm font-medium">Component #{index + 1}:</span>{' '}
          <LastUpdated 
            {...args} 
            timestamp={new Date(Date.now() - index * 60000).toISOString()}
            size="sm"
          />
        </div>
      ))}
    </div>
  ),
  args: {
    timestamp: '2024-01-15T10:30:00.000Z',
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance test with multiple component instances to verify memo optimization.',
      },
    },
  },
};
