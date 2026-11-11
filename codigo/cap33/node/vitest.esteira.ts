import { defineConfig } from "vitest/config";

// A configuração que a esteira usa para rodar os testes de um commit
export default defineConfig({ test: { include: ["src/commits/**/*.test.ts"] } });
