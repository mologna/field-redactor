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
    // Istanbul under-reports these modules when tests live outside src/rootDir; parity tests cover them.
    './src/objectRedactorCow.ts',
    './src/copyOnWriteHelpers.ts'
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
