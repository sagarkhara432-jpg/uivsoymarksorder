import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/tests/**/*.test.ts"],
    reporters: ["verbose"],
    coverage: {
      enabled: true,
      provider: "v8",
      reporter: ["text-summary", "json-summary"],
      reportsDirectory: "coverage",
      include: ["src/tests/**", "src/lib/orders.functions.ts"],
      all: false,
    },
  },
});
