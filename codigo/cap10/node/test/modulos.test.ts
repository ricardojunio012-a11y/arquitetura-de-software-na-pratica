// Testes: cada módulo testado pela própria API, e Reservas testado sem o Financeiro.
import { describe, expect, it } from "vitest";
import { Financeiro } from "../src/depois/modulos/financeiro/api.ts";
import { TabelaDeCobrancas } from "../src/depois/modulos/financeiro/interno/tabela.ts";
import { RecusaErro, Reservas } from "../src/depois/modulos/reservas/api.ts";

describe("Financeiro", () => {
  it("considera em dia a unidade com a cobrança vencida parcelada num acordo", () => {
    const financeiro = new Financeiro(new TabelaDeCobrancas());
    financeiro.emitir("C-1", "B-101", 58685, "2026-02-10");
    expect(financeiro.unidadeEmDia("B-101", "2026-03-02")).toBe(false);
    financeiro.parcelar("C-1", 3);
    expect(financeiro.unidadeEmDia("B-101", "2026-03-02")).toBe(true);
  });
});

describe("Reservas", () => {
  it("recusa unidade em débito, usando um Financeiro de mentira", () => {
    const emDebito = { unidadeEmDia: () => false };
    const reservas = new Reservas(["salao"], emDebito);
    expect(() =>
      reservas.reservar("R-1", "A-1", "salao", "2026-03-14", "2026-03-02"),
    ).toThrow(RecusaErro);
  });

  it("não aceita duas reservas do mesmo espaço no mesmo dia", () => {
    const reservas = new Reservas(["salao"], { unidadeEmDia: () => true });
    reservas.reservar("R-1", "A-1", "salao", "2026-03-14", "2026-03-02");
    expect(() =>
      reservas.reservar("R-2", "A-2", "salao", "2026-03-14", "2026-03-02"),
    ).toThrow("salao já reservado em 2026-03-14");
  });
});
