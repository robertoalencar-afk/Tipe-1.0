import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  test: {
    include: ["scripts/tests/cardapio-storage.smoke.ts"],
    maxWorkers: 1,
    testTimeout: 120000,
    hookTimeout: 60000,
  },
});
