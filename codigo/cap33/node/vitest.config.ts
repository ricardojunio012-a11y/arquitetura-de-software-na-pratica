import { defineConfig } from "vitest/config";

// Os testes do laboratório ficam em test/. Os testes de cada commit, em
// src/commits, são rodados pela esteira, um commit por vez.
export default defineConfig({ test: { include: ["test/**/*.test.ts"] } });
