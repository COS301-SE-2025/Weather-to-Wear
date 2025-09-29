const { createDefaultPreset } = require("ts-jest");
const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: tsJestTransformCfg,
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  testMatch: [
    "**/*.security.test.ts"
  ],
  moduleFileExtensions: ["ts", "js", "json"],
  moduleDirectories: ["node_modules", "src"],
  collectCoverageFrom: [
    "src/**/*.{ts,js}",
    "!src/**/*.d.ts",
    "!src/server.ts" // Exclude server startup file
  ],
  coverageDirectory: "coverage/security",
  coverageReporters: ["text", "lcov", "html"],
  verbose: true,
  testTimeout: 15000,
  setupFilesAfterEnv: ["<rootDir>/tests/security/setupSecurity.ts"],
  // Handle worker cleanup
  workerIdleMemoryLimit: "512MB",
  maxWorkers: 1, // Use single worker for security tests to avoid conflicts
  forceExit: true, // Force exit to prevent hanging
  detectOpenHandles: false, // Disable for now to avoid noise
  // Avoid database connections during security tests
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  }
};
