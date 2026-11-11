import { defineConfig } from "vitest/config";

// Os testes do laboratório ficam em test/.
export default defineConfig({ test: { include: ["test/**/*.test.ts"] } });
