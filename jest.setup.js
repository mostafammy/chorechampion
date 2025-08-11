// Jest setup file
import "@testing-library/jest-dom";

// Mock next-intl for testing
jest.mock("next-intl", () => ({
  useLocale: jest.fn(() => "en"),
  useTranslations: jest.fn(() => (key) => key),
}));

// Mock design system dependencies
jest.mock("@/lib/design-system/responsive-archive", () => ({
  useResponsiveArchive: jest.fn(() => ({
    containerClasses: "responsive-container",
    tableClasses: "responsive-table",
    cellClasses: "responsive-cell",
  })),
  responsiveBadges: {
    period: jest.fn(() => "badge-period"),
    score: jest.fn(() => "badge-score"),
    performance: jest.fn(() => "badge-performance"),
    default: jest.fn(() => "badge-default"),
  },
}));

// Mock mobile hook
jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: jest.fn(() => false),
}));

// Mock framer-motion for testing
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => children,
    span: ({ children, ...props }) => children,
    tr: ({ children, ...props }) => children,
  },
  AnimatePresence: ({ children }) => children,
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  Archive: () => <div data-testid="archive-icon">Archive</div>,
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  TrendingUp: () => <div data-testid="trending-up-icon">TrendingUp</div>,
  Users: () => <div data-testid="users-icon">Users</div>,
  Award: () => <div data-testid="award-icon">Award</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  ChevronDown: () => <div data-testid="chevron-down-icon">ChevronDown</div>,
  ChevronRight: () => <div data-testid="chevron-right-icon">ChevronRight</div>,
  Filter: () => <div data-testid="filter-icon">Filter</div>,
  Search: () => <div data-testid="search-icon">Search</div>,
  X: () => <div data-testid="x-icon">X</div>,
  Trophy: () => <div data-testid="trophy-icon">Trophy</div>,
  SortAsc: () => <div data-testid="sort-asc-icon">SortAsc</div>,
  SortDesc: () => <div data-testid="sort-desc-icon">SortDesc</div>,
  User: () => <div data-testid="user-icon">User</div>,
  CheckCircle: () => <div data-testid="check-circle-icon">CheckCircle</div>,
  Star: () => <div data-testid="star-icon">Star</div>,
  Target: () => <div data-testid="target-icon">Target</div>,
  BarChart: () => <div data-testid="bar-chart-icon">BarChart</div>,
  PieChart: () => <div data-testid="pie-chart-icon">PieChart</div>,
  Plus: () => <div data-testid="plus-icon">Plus</div>,
  Minus: () => <div data-testid="minus-icon">Minus</div>,
  Check: () => <div data-testid="check-icon">Check</div>,
  ChevronUp: () => <div data-testid="chevron-up-icon">ChevronUp</div>,
  Medal: () => <div data-testid="medal-icon">Medal</div>,
  Sparkles: () => <div data-testid="sparkles-icon">Sparkles</div>,
  MoreVertical: () => <div data-testid="more-vertical-icon">MoreVertical</div>,
}));

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
