import { describe, expect, it } from "vitest";
import { calcularEncargos } from "./encargos.ts";

const taxa = { valor: 65_000, vencimento: "2026-11-05" };

describe("encargos da taxa condominial", () => {
  it("em dia, paga o valor da taxa", () => {
    expect(calcularEncargos(taxa, "2026-11-05").total).toBe(65_000);
  });
  it("com 10 dias de atraso, multa de 2% e juros de 1% ao mês", () => {
    const e = calcularEncargos(taxa, "2026-11-15");
    expect([e.multa, e.juros, e.total]).toEqual([1_300, 217, 66_517]);
  });
  it("5 dias antes do vencimento, desconto de 3%", () => {
    const e = calcularEncargos(taxa, "2026-10-31");
    expect([e.desconto, e.total]).toEqual([1_950, 63_050]);
  });
  it("4 dias antes do vencimento, sem desconto", () => {
    expect(calcularEncargos(taxa, "2026-11-01").desconto).toBe(0);
  });
  it("o desconto é arredondado para o centavo mais próximo", () => {
    const quebrada = { valor: 65_020, vencimento: "2026-11-05" };
    expect(calcularEncargos(quebrada, "2026-10-31").desconto).toBe(1_951);
  });
});
