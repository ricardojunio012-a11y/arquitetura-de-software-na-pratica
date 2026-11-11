// A camada anticorrupção: traduz a liquidação para o domínio e recusa um arquivo cujo
// trailer não confere.
import { describe, expect, it } from "vitest";
import { traduzirRetorno } from "../src/cnab/retorno-banco-alfa.ts";

const linha = (texto: string) => texto.padEnd(80);
const detalhe = linha(
  "999306MORADA0000C-301     04112026000000000045000000000000000250",
);

describe("retorno do Banco Alfa", () => {
  it("traduz uma liquidação em PagamentoRecebido", () => {
    const trailer = linha("9999000001000000000045000");
    const { pagamentos } = traduzirRetorno([detalhe, trailer].join("\n"));
    expect(pagamentos).toEqual([
      {
        cobranca: "C-301",
        pagoEm: "2026-11-04",
        valorPagoCentavos: 45000,
        tarifaCentavos: 250,
      },
    ]);
  });

  it("recusa o arquivo quando o trailer não confere", () => {
    const trailer = linha("9999000002000000000090000");
    expect(() => traduzirRetorno([detalhe, trailer].join("\n"))).toThrow(/não confere/);
  });
});
