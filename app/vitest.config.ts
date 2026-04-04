import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: [
        "ts/browser-native.ts",
        "ts/i18n.ts",
        "ts/core/browser-native-runtime.ts",
        "ts/core/local-simulation-core.ts",
        "ts/core/runtime-primitives.ts",
        "ts/core/simulation-artifacts.ts",
        "ts/core/world3-core.ts",
        "ts/core/world3-simulation.ts",
        "ts/core/world3-tables.ts",
        "ts/simulation-provider.ts",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 84,
      },
    },
  },
});
