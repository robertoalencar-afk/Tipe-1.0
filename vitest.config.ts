import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Testes unitários não passam pelo transform de RPC do TanStack Start/Vite.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { maxWorkers: 2 },
});
