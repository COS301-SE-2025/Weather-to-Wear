// app-backend/jest.integration.config.js

const { createDefaultPreset } = require("ts-jest");
const tsJestTransformCfg = createDefaultPreset().transform;

module.exports = {
  testEnvironment: "node",
  transform: tsJestTransformCfg,
  roots: ["<rootDir>/tests/integration"],
  testMatch: ["**/*.test.ts", "**/*.tests.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  moduleDirectories: ["node_modules", "src"],
  globalSetup: "<rootDir>/tests/integration/setupTestDB.ts", 
  setupFilesAfterEnv: ["<rootDir>/tests/integration/setupTestEnv.ts"],
};
