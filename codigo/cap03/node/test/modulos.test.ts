// Testes: o acoplamento escondido do "antes" e o isolamento do "depois".
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { config } from "../src/antes/config/config.ts";
import {
  calcularTodas,
  cobrancas,
  gerarSaida,
} from "../src/antes/servicos/servicos.ts";
import { calcularCobrancas } from "../src/depois/cobranca/index.ts";
import { relatorioDeInadimplencia } from "../src/depois/inadimplencia/index.ts";

const hoje = new Date("2026-03-02T00:00:00Z");
// Entrada: /dados/entrada no contêiner; fora dele, a pasta do capítulo
const arquivo = fs.existsSync("/dados/entrada/financeiro.json")
  ? "/dados/entrada/financeiro.json"
  : new URL("../../entrada/financeiro.json", import.meta.url);
const dados = JSON.parse(fs.readFileSync(arquivo, "utf8"));

describe("antes: acoplamento de conteúdo", () => {
  it("gerar a inadimplência muda a ordem das cobranças de outro módulo", () => {
    config.hoje = hoje;
    config.dados = dados;
    calcularTodas();
    const ordemOriginal = cobrancas.map((c) => c.unidade.id).join(",");
    gerarSaida("inadimplencia");
    expect(cobrancas.map((c) => c.unidade.id).join(",")).not.toBe(ordemOriginal);
  });
});

describe("depois: módulos isolados", () => {
  it("o relatório de inadimplência não altera as cobranças que recebe", () => {
    const lista = calcularCobrancas(
      dados.condominio.despesasDoMesCentavos,
      dados.unidades,
      hoje,
    );
    const antes = lista.map((c) => c.unidade).join(",");
    relatorioDeInadimplencia("Teste", hoje, lista);
    expect(lista.map((c) => c.unidade).join(",")).toBe(antes);
  });

  it("calcula multa e juros sem depender de configuração global", () => {
    const [carla] = calcularCobrancas(485000, [dados.unidades[2]], hoje);
    expect([carla.diasDeAtraso, carla.multa, carla.juros]).toEqual([20, 1335, 445]);
  });
});
