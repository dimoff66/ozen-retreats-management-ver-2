import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

loadTestEnv();

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/services/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});

function loadTestEnv(): void {
  [".env", ".env.local", ".env.test", ".env.test.local"].forEach(file => {
    try {
      process.loadEnvFile(file);
    } catch {
      // Файл окружения необязателен: значения могут быть переданы из shell/CI.
    }
  });
}
