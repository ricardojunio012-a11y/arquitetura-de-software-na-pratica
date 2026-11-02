// Testes: os assinantes são idempotentes e independentes uns dos outros.
import { describe, expect, it } from "vitest";
import { eventoDe } from "../src/eventos.ts";
import { Comunicacao } from "../src/modulos/comunicacao.ts";
import { Reservas } from "../src/modulos/reservas.ts";

const reserva = { reserva: "R-1", unidade: "A-1", espaco: "salao", data: "2026-03-14" };
const evento = eventoDe({
  pagamento: "P-1",
  unidade: "A-1",
  reserva: "R-1",
  valorCentavos: 18000,
});

describe("assinantes", () => {
  it("confirmam a reserva e avisam o morador", () => {
    const reservas = new Reservas([reserva]);
    const comunicacao = new Comunicacao();
    reservas.aoConfirmarPagamento(evento);
    comunicacao.aoConfirmarPagamento(evento);
    expect(reservas.linhas()).toEqual(["R-1;A-1;salao;2026-03-14;confirmada"]);
    expect(comunicacao.avisos).toHaveLength(1);
  });

  it("ignoram o mesmo evento entregue duas vezes", () => {
    const comunicacao = new Comunicacao();
    comunicacao.aoConfirmarPagamento(evento);
    comunicacao.aoConfirmarPagamento(evento);
    expect(comunicacao.avisos).toHaveLength(1);
    expect(comunicacao.registro[1]).toBe("comunicacao ignorou E-P-1 (repetido)");
  });

  it("o identificador do evento é estável para o mesmo pagamento", () => {
    const outra = eventoDe({
      pagamento: "P-1",
      unidade: "A-1",
      reserva: "R-1",
      valorCentavos: 18000,
    });
    expect(outra.evento).toBe(evento.evento);
  });
});
