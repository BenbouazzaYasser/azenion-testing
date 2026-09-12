module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.[jt]sx?$": ["babel-jest", { presets: ["babel-preset-expo"] }],
  },
  testMatch: ["<rootDir>/lib/**/*.test.ts"],
  setupFiles: ["<rootDir>/lib/test-setup.js"],
  // babel-preset-expo rewrites EXPO_PUBLIC_* reads to expo/virtual/env,
  // which ships ESM — transform just that virtual module for Jest.
  transformIgnorePatterns: ["node_modules/(?!(expo/virtual)/)"],
};
