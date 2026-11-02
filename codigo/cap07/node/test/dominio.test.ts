// Testes: o que o modelo anêmico permite e o que o modelo rico impede.
import { describe, expect, it } from "vitest";
import { reservas, Reserva } from "../src/antes/modelo.ts";
import { Agenda } from "../src/depois/dominio/agenda.ts";
import { Dinheiro } from "../src/depois/dominio/dinheiro.ts";
import { ErroDeDominio } from "../src/depois/dominio/erro.ts";
import { Periodo } from "../src/depois/dominio/periodo.ts";

const politica = {
  taxa: Dinheiro.deCentavos(15000),
  antecedenciaMinimaDias: 2,
  limitePorMes: 1,
};

describe("antes: modelo anêmico", () => {
  it("qualquer código grava uma reserva sobreposta, sem passar pelas regras", () => {
    const a = Object.assign(new Reserva(), {
      id: "X-1",
      espaco: "salao",
      data: "2026-03-14",
    });
    const b = Object.assign(new Reserva(), {
      id: "X-2",
      espaco: "salao",
      data: "2026-03-14",
    });
    Object.assign(a, { inicio: 14, fim: 22 });
    Object.assign(b, { inicio: 20, fim: 23 });
    reservas.push(a, b);
    const sobrepostas = reservas.filter((r) => r.id.startsWith("X-"));
    expect(sobrepostas).toHaveLength(2); // o estado inválido foi aceito
  });
});

describe("depois: modelo rico", () => {
  it("a agenda recusa um horário sobreposto", () => {
    const agenda = new Agenda("salao", politica);
    agenda.reservar("R-1", "A-101", new Periodo("2026-03-14", 14, 22), "2026-03-02");
    expect(() =>
      agenda.reservar("R-2", "A-202", new Periodo("2026-03-14", 20, 23), "2026-03-02"),
    ).toThrow("horário sobreposto a R-1");
  });

  it("não existe período com o fim antes do início", () => {
    expect(() => new Periodo("2026-03-14", 18, 16)).toThrow(ErroDeDominio);
  });

  it("dinheiro arredonda meio para cima e é comparado pelo valor", () => {
    expect(Dinheiro.deCentavos(18001).percentual(50).toString()).toBe("R$ 90,01");
    expect(Dinheiro.deCentavos(9000).igual(Dinheiro.deCentavos(9000))).toBe(true);
  });

  it("cancelar em cima da hora gera multa e evento; cancelar de novo, não", () => {
    const agenda = new Agenda("salao", politica);
    agenda.reservar("R-1", "A-101", new Periodo("2026-03-14", 14, 22), "2026-03-02");
    agenda.recolherEventos();
    expect(agenda.cancelar("R-1", "2026-03-13").toString()).toBe("R$ 90,00");
    expect(agenda.recolherEventos().map((e) => e.tipo)).toEqual(["ReservaCancelada"]);
    expect(() => agenda.cancelar("R-1", "2026-03-13")).toThrow("não está confirmada");
    expect(() => agenda.cancelar("R-99", "2026-03-13")).toThrow("não encontrada");
  });
});
