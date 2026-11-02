// Testes da simulação da fila de registro: mesma semente, mesmo resultado.
import { describe, expect, it } from "vitest";
import { disponiveisAte, percentil, simular } from "../src/fila-de-registro.ts";

const premissas = {
  id: "T",
  descricao: "teste",
  boletos: 1000,
  boletosPorArquivo: 250,
  registrosPorSegundo: 10,
  retornoSegundos: 100,
  falhaPassageiraPorCento: 20,
  recusaDefinitivaACada: 50,
  maxTentativas: 3,
  limiteSegundos: 400,
  semente: 7,
};

describe("simular", () => {
  it("ingênua: a cauda passa do limite e há boletos sem registro", () => {
    const r = simular(premissas, false);
    expect([r.arquivos, r.tentativas, r.semRegistro]).toEqual([12, 1246, 26]);
    expect(disponiveisAte(r, 400)).toBe(968);
    expect(percentil(r, 1000, 500)).toBe(175);
    expect(percentil(r, 1000, 990)).toBeNull(); // o p99 cai nos sem registro
  });

  it("ajustada: tudo disponível no limite, parte com Pix", () => {
    const r = simular(premissas, true);
    expect([r.arquivos, r.tentativas, r.viaPix]).toEqual([11, 1199, 32]);
    expect(disponiveisAte(r, 400)).toBe(1000);
    expect(percentil(r, 1000, 990)).toBe(357);
  });

  it("a mesma semente dá sempre o mesmo resultado", () => {
    expect(simular(premissas, false)).toEqual(simular(premissas, false));
  });
});
