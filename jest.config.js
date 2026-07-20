/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest",{}],
  },
  cacheDirectory: './tmp/jest-cache',
  coverageDirectory: './tmp/jest-coverage',
  coveragePathIgnorePatterns: [
    './node_modules/',
    './tests/mocks/',
    './tests/helpers/',
    './tests/integration/fixtures/'
  ],
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  verbose: true,
};
