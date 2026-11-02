// Testes do executor de cenários: verificam a carga e a avaliação, não o tempo.
import { describe, expect, it } from "vitest";
import { avaliar, condominioSintetico, executar } from "../src/cenarios.ts";

describe("condominioSintetico", () => {
  it("gera as unidades pedidas, com frações que somam o condomínio inteiro", () => {
    const { unidades } = condominioSintetico(1, 40);
    expect(unidades).toHaveLength(40);
    expect(unidades.reduce((soma, u) => soma + u.fracaoMilionesimos, 0)).toBe(1000000);
    expect(unidades.filter((u) => u.debitoAnterior !== null)).toHaveLength(5);
  });
});

describe("avaliar e executar", () => {
  it("passa dentro do limite e falha acima dele", () => {
    expect(avaliar(59.9, 60)).toBe(true);
    expect(avaliar(60.1, 60)).toBe(false);
  });

  it("calcula uma cobrança por unidade e estima o registro", () => {
    const cenario = {
      id: "T",
      descricao: "teste",
      condominios: 3,
      unidadesPorCondominio: 10,
      registrosPorSegundo: 10,
      limiteSegundos: 2,
    };
    const r = executar(cenario, new Date("2026-03-02T00:00:00Z"));
    expect(r.cobrancas).toBe(30);
    expect(r.segundosRegistro).toBe(3);
    expect(r.passou).toBe(false); // 3 s de registro não cabem em 2 s
  });
});
