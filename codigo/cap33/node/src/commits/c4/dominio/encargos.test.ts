import { describe, expect, it } from "vitest";
import type { Calendario } from "./calendario.ts";
import { calcularEncargos } from "./encargos.ts";

// Um calendário de teste: fins de semana e o feriado de 20 de novembro
const calendario: Calendario = {
  ehDiaUtil: (dia) =>
    ![0, 6].includes(new Date(dia).getUTCDay()) && dia !== "2026-11-20",
};
const taxa = { valor: 65_000, vencimento: "2026-11-05" };

describe("encargos da taxa condominial", () => {
  it("em dia, paga o valor da taxa", () => {
    expect(calcularEncargos(taxa, "2026-11-05", calendario).total).toBe(65_000);
  });
  it("com 10 dias de atraso, multa de 2% e juros de 1% ao mês", () => {
    const e = calcularEncargos(taxa, "2026-11-15", calendario);
    expect([e.multa, e.juros, e.total]).toEqual([1_300, 217, 66_517]);
  });
  it("5 dias antes do vencimento, desconto de 3%", () => {
    const e = calcularEncargos(taxa, "2026-10-31", calendario);
    expect([e.desconto, e.total]).toEqual([1_950, 63_050]);
  });
  it("o desconto é arredondado para o centavo mais próximo", () => {
    const quebrada = { valor: 65_020, vencimento: "2026-11-05" };
    expect(calcularEncargos(quebrada, "2026-10-31", calendario).desconto).toBe(1_951);
  });
  it("vencimento no feriado de sexta passa para segunda", () => {
    const feriado = { valor: 65_000, vencimento: "2026-11-20" };
    expect(calcularEncargos(feriado, "2026-11-23", calendario).total).toBe(65_000);
  });
  it("vencimento no domingo passa para segunda", () => {
    const domingo = { valor: 65_000, vencimento: "2026-11-15" };
    expect(calcularEncargos(domingo, "2026-11-16", calendario).total).toBe(65_000);
  });
});
