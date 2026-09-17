import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "actions/**/*.test.ts", "app/api/**/*.test.ts", "components/**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
