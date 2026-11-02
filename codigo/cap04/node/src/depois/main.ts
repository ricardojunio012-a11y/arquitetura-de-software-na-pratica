// Uso: node main.ts <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
// Raiz de composição: o único lugar que conhece as classes concretas e as monta.
import fs from "node:fs";
import path from "node:path";
import { dataDoMes, rotuloDoMes } from "../compartilhado/datas.ts";
import { ClienteBancoAlfa } from "../externos/banco-alfa.ts";
import { PagaFacilApi } from "../externos/paga-facil.ts";
import { CalculadoraDeCobranca } from "./cobranca/calculadora.ts";
import { DebitoAnterior } from "./cobranca/regras/debito-anterior.ts";
import { DescontoAntecipado } from "./cobranca/regras/desconto-antecipado.ts";
import { FundoDeReserva } from "./cobranca/regras/fundo-de-reserva.ts";
import { IsencaoDoSindico } from "./cobranca/regras/isencao-do-sindico.ts";
import { JurosPorAtraso } from "./cobranca/regras/juros-por-atraso.ts";
import { MultaPorAtraso } from "./cobranca/regras/multa-por-atraso.ts";
import { TaxaCondominial } from "./cobranca/regras/taxa-condominial.ts";
import type { GatewayDePagamento } from "./emissao/gateway.ts";
import { ServicoDeEmissao } from "./emissao/servico-de-emissao.ts";
import { GatewayBancoAlfa } from "./provedores/gateway-banco-alfa.ts";
import { GatewayPagaFacil } from "./provedores/gateway-paga-facil.ts";
import { relatorioDeCobrancas, relatorioDeRegistros } from "./relatorios.ts";

const [entrada, saida, opcao, data] = process.argv.slice(2);
const hoje = opcao === "--hoje" ? new Date(data + "T00:00:00Z") : new Date();
const dados = JSON.parse(fs.readFileSync(entrada, "utf8"));
const p = dados.politica;
const prazos = {
  vencimento: dataDoMes(hoje, p.vencimentoDia),
  descontoAte: dataDoMes(hoje, p.descontoAteDia),
};

// A ordem importa: cada regra vê o que as anteriores lançaram
const regras = [
  new TaxaCondominial(dados.condominio.despesasDoMesCentavos),
  new FundoDeReserva(p.fundoDeReservaPorcento),
  new IsencaoDoSindico(),
  new DebitoAnterior(),
  new MultaPorAtraso(p.multaPorcento),
  new JurosPorAtraso(p.jurosAoMesPorcento, hoje),
  // Por último: o desconto depende da isenção e do débito já lançados
  new DescontoAntecipado(p.descontoAntecipadoPorcento, prazos.descontoAte),
];
const gateways: Record<string, () => GatewayDePagamento> = {
  alfa: () => new GatewayBancoAlfa(new ClienteBancoAlfa()),
  pagafacil: () => new GatewayPagaFacil(new PagaFacilApi()),
};
const gateway = gateways[process.env.GATEWAY ?? "alfa"]();
const servico = new ServicoDeEmissao(
  new CalculadoraDeCobranca(regras),
  gateway,
  prazos,
);

const { cobrancas, registros } = servico.emitir(dados.unidades);
const titulo = `${rotuloDoMes(hoje)} - ${dados.condominio.nome}`;
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(
  path.join(saida, "cobrancas.txt"),
  relatorioDeCobrancas(titulo, cobrancas, prazos),
);
fs.writeFileSync(
  path.join(saida, "registros.txt"),
  relatorioDeRegistros(titulo, gateway.nome, cobrancas, registros),
);
console.log(`cobranças emitidas em ${saida} (${gateway.nome})`);
