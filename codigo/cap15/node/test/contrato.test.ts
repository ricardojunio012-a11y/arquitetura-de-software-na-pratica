// Testes do contrato. O primeiro é o que quebra o build quando alguém muda
// openapi/v1.yaml de um jeito que os clientes atuais não aguentam.
import { describe, expect, it } from "vitest";
import { compararContratos } from "../src/contrato/compatibilidade.ts";
import { lerContrato } from "../src/contrato/openapi.ts";
import { validarResposta } from "../src/contrato/validar.ts";

const atual = lerContrato("/dados/openapi/v1.yaml");
const publicado = lerContrato("/dados/openapi/publicado/v1.yaml");

describe("contrato", () => {
  it("o contrato atual é compatível com o publicado", () => {
    const quebras = compararContratos(publicado, atual).filter((m) => !m.compativel);
    expect(quebras).toEqual([]);
  });

  it("renomear um campo da resposta é incompatível", () => {
    const proposta = lerContrato("/dados/entrada/propostas/b-renomear.yaml");
    const quebras = compararContratos(publicado, proposta).filter((m) => !m.compativel);
    expect(quebras.map((m) => m.texto)).toEqual([
      "GET /v1/condominios/{condominio}/cobrancas 200: " +
        "campo removido: dados[].valorCentavos",
    ]);
  });

  it("uma resposta com o tipo errado não passa na conferência", () => {
    const corpo = {
      dados: [
        {
          id: "CB-02",
          unidade: "102",
          vencimento: "2026-10-10",
          valorCentavos: "450,00",
          situacao: "aberta",
        },
      ],
      proximo: null,
    };
    const caminho = "/v1/condominios/C-01/cobrancas";
    const tipo = "application/json";
    expect(validarResposta(atual, "GET", caminho, 200, tipo, corpo)).toEqual([
      "GET /v1/condominios/{condominio}/cobrancas 200: " +
        "$.dados[0].valorCentavos: esperado integer, recebido string",
    ]);
  });
});
