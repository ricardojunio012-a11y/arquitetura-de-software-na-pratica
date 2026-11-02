// Uso: node main.ts <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
// Monta os objetos e processa os pedidos de reserva na ordem em que chegaram.
import fs from "node:fs";
import path from "node:path";
import {
  AntecedenciaMinima,
  EspacoLivre,
  LimitePorMes,
  UnidadeEmDia,
} from "./aprovacao.ts";
import { AvisarPortaria, LancarTaxaDeUso, NotificarMorador } from "./assinantes.ts";
import { corrida } from "./corrida.ts";
import { Barramento } from "./eventos.ts";
import { FabricaDeCanais, ProvedorSimulado } from "./notificacao.ts";
import { RepositorioEmMemoria } from "./repositorio.ts";
import { ServicoDeReservas } from "./servico.ts";
import type { Espaco, Unidade } from "./tipos.ts";

const [entrada, saida, opcao, data] = process.argv.slice(2);
const hoje = opcao === "--hoje" ? new Date(data + "T00:00:00Z") : new Date();
const dados = JSON.parse(fs.readFileSync(entrada, "utf8"));
const espacos = new Map<string, Espaco>(dados.espacos.map((e: Espaco) => [e.id, e]));
const unidades = new Map<string, Unidade>(
  dados.unidades.map((u: Unidade) => [u.id, u]),
);

function montarAprovacao(reservas: RepositorioEmMemoria) {
  const aprovacao = new UnidadeEmDia();
  aprovacao
    .depois(new AntecedenciaMinima(hoje))
    .depois(new EspacoLivre(reservas))
    .depois(new LimitePorMes(reservas));
  return aprovacao;
}
const reservas = new RepositorioEmMemoria();
const aprovacao = montarAprovacao(reservas);

const provedor = new ProvedorSimulado(dados.falhasSimuladas, dados.destinosInvalidos);
const saidas = {
  notificacoes: [] as string[],
  taxas: [] as string[],
  portaria: [] as string[],
  esperas: [] as string[],
};
// Relógio simulado: anota a espera em vez de esperar de verdade
const esperar = (ms: number, quem: string) =>
  saidas.esperas.push(`${quem}: espera de ${ms} ms`);
const fabrica = new FabricaDeCanais(provedor, saidas.notificacoes, esperar);
const eventos = new Barramento();
eventos.assinar("ReservaConfirmada", new LancarTaxaDeUso(saidas.taxas));
eventos.assinar("ReservaConfirmada", new AvisarPortaria(saidas.portaria));
eventos.assinar("ReservaConfirmada", new NotificarMorador(fabrica));
eventos.assinar("ReservaRecusada", new NotificarMorador(fabrica));

const servico = new ServicoDeReservas(aprovacao, reservas, eventos);
const decisoes: string[] = [];
for (const p of dados.pedidos) {
  const pedido = {
    ...p,
    unidade: unidades.get(p.unidade)!,
    espaco: espacos.get(p.espaco)!,
  };
  const d = servico.solicitar(pedido);
  const resultado = d.aprovada ? "aprovada" : `recusada;${d.motivo}`;
  decisoes.push(`${p.id};${p.unidade};${p.espaco};${p.data};${resultado}`);
}

// State: cancelar depende do estado em que a reserva está
const cancelamentos: string[] = [];
for (const id of dados.cancelamentos) {
  try {
    cancelamentos.push(`${id};${servico.cancelar(id)}`);
  } catch (erro) {
    cancelamentos.push(`${id};erro;${(erro as Error).message}`);
  }
}

// Agora a parte difícil: dois pedidos ao mesmo tempo para o mesmo espaço e data
const simultaneos = dados.pedidosSimultaneos.map((p: Record<string, string>) => ({
  ...p,
  unidade: unidades.get(p.unidade)!,
  espaco: espacos.get(p.espaco)!,
}));
const concorrencia = corrida(simultaneos, () => {
  const novas = new RepositorioEmMemoria();
  return { cadeia: montarAprovacao(novas), reservas: novas };
});

const arquivos: Record<string, string[]> = {
  reservas: decisoes,
  notificacoes: saidas.notificacoes,
  enviados: provedor.entregues,
  taxas: saidas.taxas,
  portaria: saidas.portaria,
  falhas: eventos.falhas,
  esperas: saidas.esperas,
  cancelamentos,
  concorrencia,
};
fs.mkdirSync(saida, { recursive: true });
for (const [nome, linhas] of Object.entries(arquivos)) {
  fs.writeFileSync(path.join(saida, `${nome}.txt`), linhas.join("\n") + "\n");
}
console.log(`${decisoes.length} pedidos processados; saída em ${saida}`);
