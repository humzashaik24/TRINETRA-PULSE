/** @type {import('ts-jest').JestConfigWithTsJest} */
const shared = {
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@trinetra-pulse/types$': '<rootDir>/../../packages/types/src/index.ts',
    '^@trinetra-pulse/ui$': '<rootDir>/../../packages/ui/src/index.ts',
    '^d3-force$': '<rootDir>/src/test/mocks/d3-force.ts',
    // Force a single React/ReactDOM instance so workspace package sources
    // (resolved relative to the root node_modules) share the same React
    // module identity as the app code under test.
    '^react$': '<rootDir>/../../node_modules/react/index.js',
    '^react-dom$': '<rootDir>/../../node_modules/react-dom/index.js',
    '^react/jsx-runtime$': '<rootDir>/../../node_modules/react/jsx-runtime.js',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
};

/** @type {import('ts-jest').JestConfigWithTsJest} */
const componentsProject = {
  ...shared,
  displayName: 'components',
  testEnvironment: 'jsdom',
  testMatch: ['**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: {
    ...shared.moduleNameMapper,
    '^framer-motion$': '<rootDir>/src/test/mocks/framer-motion.ts',
    '^next/link$': '<rootDir>/src/test/mocks/next-link.ts',
    '^next/navigation$': '<rootDir>/src/test/mocks/next-navigation.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.jest.json',
      },
    ],
  },
};

module.exports = {
  projects: [
    {
      ...shared,
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: ['**/*.test.ts'],
    },
    componentsProject,
  ],
};