import { describe, expect, it, vi } from "vitest";
import { calcularEncargos } from "./encargos.ts";

// Para testar o domínio sem banco, o teste precisa substituir o módulo inteiro
vi.mock("../adaptadores/feriados-pg.ts", () => ({
  ehFeriado: async (dia: string) => dia === "2026-11-20",
}));

const taxa = { valor: 65_000, vencimento: "2026-11-05" };

describe("encargos da taxa condominial", () => {
  it("em dia, paga o valor da taxa", async () => {
    expect((await calcularEncargos(taxa, "2026-11-05")).total).toBe(65_000);
  });
  it("com 10 dias de atraso, multa de 2% e juros de 1% ao mês", async () => {
    const e = await calcularEncargos(taxa, "2026-11-15");
    expect([e.multa, e.juros, e.total]).toEqual([1_300, 217, 66_517]);
  });
  it("5 dias antes do vencimento, desconto de 3%", async () => {
    const e = await calcularEncargos(taxa, "2026-10-31");
    expect([e.desconto, e.total]).toEqual([1_950, 63_050]);
  });
  it("o desconto é arredondado para o centavo mais próximo", async () => {
    const quebrada = { valor: 65_020, vencimento: "2026-11-05" };
    expect((await calcularEncargos(quebrada, "2026-10-31")).desconto).toBe(1_951);
  });
  it("vencimento no feriado de sexta passa para segunda", async () => {
    const feriado = { valor: 65_000, vencimento: "2026-11-20" };
    expect((await calcularEncargos(feriado, "2026-11-23")).total).toBe(65_000);
  });
  it("vencimento no domingo passa para segunda", async () => {
    const domingo = { valor: 65_000, vencimento: "2026-11-15" };
    expect((await calcularEncargos(domingo, "2026-11-16")).total).toBe(65_000);
  });
});
