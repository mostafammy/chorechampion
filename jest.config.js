const nextJest = require("next/jest");

/** @type {import('jest').Config} */
const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: "./",
});

// Add any custom config to be passed to Jest
const config = {
  testEnvironment: "jsdom",

  // Setup files
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

  // Module name mapping for absolute imports
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  // Transform patterns
  transformIgnorePatterns: [
    "node_modules/(?!(lucide-react|@testing-library|date-fns)/)",
  ],

  // Test patterns
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}",
    "<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}",
  ],

  // Coverage configuration
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/app/**", // Exclude Next.js app directory
    "!src/components/ui/**", // Exclude basic UI components
    "!**/*.stories.{js,jsx,ts,tsx}", // Exclude Storybook files
  ],

  // Coverage thresholds (Principal Engineer standards)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Stricter thresholds for utilities
    "src/lib/utils/**/*.ts": {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90,
    },
  },

  // Transform configuration
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": ["babel-jest", { presets: ["next/babel"] }],
  },

  // Module directories
  moduleDirectories: ["node_modules", "<rootDir>/"],

  // Test timeout
  testTimeout: 10000,

  // Verbose output for better debugging
  verbose: true,
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(config);
