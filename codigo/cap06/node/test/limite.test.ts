// Os testes da classe-broto: a regra nova é testada sozinha, sem o código legado.
import { describe, expect, it } from "vitest";
import { LimitePorMes } from "../src/etapa6/limite.ts";

const salao = (unidade: string, data: string) => ({ unidade, espaco: "salao", data });

describe("limite de reservas por mês (classe-broto)", () => {
  const limite = new LimitePorMes();

  it("recusa a segunda reserva do salão da mesma unidade no mesmo mês", () => {
    const feitas = [salao("A-101", "2026-03-14")];
    expect(limite.atingido(salao("A-101", "2026-03-28"), feitas)).toBe(true);
  });

  it("não conta outro mês, outra unidade nem outro espaço", () => {
    const feitas = [
      salao("A-101", "2026-02-28"),
      salao("B-101", "2026-03-14"),
      { unidade: "A-101", espaco: "churrasqueira", data: "2026-03-07" },
    ];
    expect(limite.atingido(salao("A-101", "2026-03-28"), feitas)).toBe(false);
  });

  it("a churrasqueira aceita duas por mês; um espaço sem limite aceita todas", () => {
    const churrasco = (data: string) => ({
      unidade: "A-101",
      espaco: "churrasqueira",
      data,
    });
    const duas = [churrasco("2026-03-07"), churrasco("2026-03-14")];
    expect(limite.atingido(churrasco("2026-03-21"), [duas[0]])).toBe(false);
    expect(limite.atingido(churrasco("2026-03-21"), duas)).toBe(true);
    const piscina = { unidade: "A-101", espaco: "piscina", data: "2026-03-21" };
    expect(limite.atingido(piscina, [piscina, piscina])).toBe(false);
  });
});
