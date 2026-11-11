// As funções de aptidão e a carga simulada
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { percentil, simular } from "../src/aptidao/carga.ts";
import { dadosProprios } from "../src/aptidao/dados-proprios.ts";

const commits = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/commits",
);

describe("dados próprios", () => {
  it("aprova o commit em que cada módulo usa só as suas tabelas", () => {
    expect(dadosProprios(path.join(commits, "c1"))).toEqual([]);
  });

  it("acha o SQL numa string que lê a tabela de outro módulo", () => {
    expect(dadosProprios(path.join(commits, "c2"))).toEqual([
      "reservas/regras.ts:6 lê financeiro.cobrancas, de financeiro",
    ]);
  });
});

describe("carga simulada", () => {
  it("soma a espera na fila à duração do pedido", () => {
    // uma conexão, três pedidos de 10 ms chegando juntos
    expect(simular([0, 0, 0], [10, 10, 10], 1)).toEqual([10, 20, 30]);
    expect(simular([0, 0, 0], [10, 10, 10], 3)).toEqual([10, 10, 10]);
  });

  it("calcula o percentil pelo posto mais próximo", () => {
    const valores = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentil(valores, 95)).toBe(95);
    expect(percentil([5, 1, 3], 50)).toBe(3);
  });
});
