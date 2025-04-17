module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "backend/models/**/*.js",
    "backend/services/**/*.js",
    "backend/utils/**/*.js",
  ],
  coveragePathIgnorePatterns: ["/node_modules/"],
  verbose: true,
};
