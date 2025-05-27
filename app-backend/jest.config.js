const { createDefaultPreset } = require("ts-jest");
const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: tsJestTransformCfg,

  roots: ["<rootDir>/tests", "<rootDir>/src"],
  testMatch: [
    "**/*.tests.ts",
    "**/*.test.ts"
  ],
  moduleFileExtensions: ["ts", "js", "json"],
  moduleDirectories: ["node_modules", "src"],
};
