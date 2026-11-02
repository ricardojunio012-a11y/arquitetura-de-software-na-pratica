// Testes: o que a versão antes não deixa testar e o que a versão depois isola.
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { emitirCobrancas } from "../src/antes/emissao.ts";
import { CalculadoraDeCobranca } from "../src/depois/cobranca/calculadora.ts";
import type { Cobranca } from "../src/depois/cobranca/cobranca.ts";
import { DebitoAnterior } from "../src/depois/cobranca/regras/debito-anterior.ts";
import * as desconto from "../src/depois/cobranca/regras/desconto-antecipado.ts";
import { FundoDeReserva } from "../src/depois/cobranca/regras/fundo-de-reserva.ts";
import { IsencaoDoSindico } from "../src/depois/cobranca/regras/isencao-do-sindico.ts";
import { TaxaCondominial } from "../src/depois/cobranca/regras/taxa-condominial.ts";
import { lancamento, type Regra, type Unidade } from "../src/depois/cobranca/tipos.ts";
import type { GatewayDePagamento } from "../src/depois/emissao/gateway.ts";
import { ServicoDeEmissao } from "../src/depois/emissao/servico-de-emissao.ts";
import { ClienteBancoAlfa } from "../src/externos/banco-alfa.ts";

const hoje = new Date("2026-03-02T00:00:00Z");
// Entrada: /dados/entrada no contêiner; fora dele, a pasta do capítulo
const arquivo = fs.existsSync("/dados/entrada/condominio.json")
  ? "/dados/entrada/condominio.json"
  : new URL("../../entrada/condominio.json", import.meta.url);
const dados = JSON.parse(fs.readFileSync(arquivo, "utf8"));
const unidades: Unidade[] = dados.unidades;
const despesas = dados.condominio.despesasDoMesCentavos;
const prazos = { vencimento: "2026-03-10", descontoAte: "2026-03-05" };

// Dublê de teste: implementa a interface e só anota o que recebeu
class GatewayEmMemoria implements GatewayDePagamento {
  readonly nome = "em memória";
  readonly recebidas: Cobranca[] = [];

  registrar(cobranca: Cobranca) {
    this.recebidas.push(cobranca);
    return { unidade: cobranca.unidade, identificador: "teste" };
  }
}

describe("antes: cálculo e banco grudados", () => {
  it("calcular as cobranças também emite boletos no banco", () => {
    const antes = ClienteBancoAlfa.emitidos;
    emitirCobrancas(dados, hoje);
    expect(ClienteBancoAlfa.emitidos - antes).toBe(8);
  });
});

describe("depois: regras e gateway atrás de abstrações", () => {
  it("uma regra nova entra sem mudar a calculadora", () => {
    const taxaExtra: Regra = {
      aplicar: () => [lancamento("obra", "Chamada para obra", 5000)],
    };
    const calculadora = new CalculadoraDeCobranca([
      new TaxaCondominial(despesas),
      taxaExtra,
    ]);
    expect(calculadora.calcular(unidades[0]).total).toBe(60625 + 5000);
  });

  it("o síndico fica isento da taxa e paga o fundo de reserva", () => {
    const calculadora = new CalculadoraDeCobranca([
      new TaxaCondominial(despesas),
      new FundoDeReserva(10),
      new IsencaoDoSindico(),
    ]);
    const sindico = unidades.find((u) => u.sindico)!;
    expect(calculadora.calcular(sindico).total).toBe(6790);
  });

  it("quem tem débito não ganha o desconto por pontualidade", () => {
    const calculadora = new CalculadoraDeCobranca([
      new TaxaCondominial(despesas),
      new DebitoAnterior(),
      new desconto.DescontoAntecipado(5, prazos.descontoAte),
    ]);
    const emDia = unidades.find((u) => u.id === "A-101")!;
    const emDebito = unidades.find((u) => u.id === "A-201")!;
    expect(calculadora.calcular(emDia).desconto).toBe(3031);
    const semDesconto = calculadora.calcular(emDebito).lancamentos;
    expect(semDesconto.some((l) => l.condicional)).toBe(false);
  });

  it("a emissão funciona com qualquer gateway, sem banco de verdade", () => {
    const gateway = new GatewayEmMemoria();
    const calculadora = new CalculadoraDeCobranca([new TaxaCondominial(despesas)]);
    const antes = ClienteBancoAlfa.emitidos;
    new ServicoDeEmissao(calculadora, gateway, prazos).emitir(unidades);
    expect(gateway.recebidas.map((c) => c.unidade)).toHaveLength(8);
    expect(ClienteBancoAlfa.emitidos).toBe(antes);
  });
});
