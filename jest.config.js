/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest",{}],
  },
  cacheDirectory: './tmp/jest-cache',
  coverageDirectory: './tmp/jest-coverage',
  collectCoverage: true,
  verbose: true,
};
