// O modelo de custo do Morada: dado o número de condomínios e a arquitetura,
// devolve as linhas do custo dos produtos vendidos (CPV) de um mês, em reais.
import { HORAS_MES, v } from "./entradas.ts";

export type Arquitetura = "pool" | "celulas" | "silos";

export const ARQUITETURAS: [Arquitetura, string][] = [
  ["pool", "monólito modular, um banco para todos"],
  ["celulas", "células de até 3.000 condomínios"],
  ["silos", "pool e um silo por administradora grande"],
];

export type Tipo = "infra" | "pessoas";
export type Comportamento = "fixo" | "linear" | "degraus";
export type Etiqueta = "compartilhado" | "assistente" | "atendimento";

export interface Linha {
  nome: string;
  tipo: Tipo;
  comportamento: Comportamento;
  etiqueta: Etiqueta;
  valor: number;
}

// Uma instalação completa: nós de aplicação e um banco próprio
interface Instalacao {
  condominios: number;
}

const porHora = (dolares: number) => dolares * HORAS_MES * v("dolar");

// O banco dobra de tamanho (e de preço) a cada degrau: large, xlarge, 2xlarge...
export function multiplicadorDoBanco(condominios: number): number {
  let m = 1;
  while (condominios > v("porBanco") * m) m *= 2;
  return m;
}

export const nosDaInstalacao = (condominios: number) =>
  Math.max(2, Math.ceil(condominios / v("porNo")));

export function instalacoes(arq: Arquitetura, total: number): Instalacao[] {
  if (arq === "pool") return [{ condominios: total }];
  if (arq === "celulas") {
    const n = Math.ceil(total / v("porCelula"));
    return Array.from({ length: n }, () => ({ condominios: total / n }));
  }
  // silos: as administradoras que exigem isolamento ganham uma instalação cada
  const isolados = Math.round(total * v("isolados"));
  const silos = Math.ceil(isolados / v("porSilo"));
  const lista = [{ condominios: total - isolados }];
  for (let i = 0; i < silos; i++) {
    const resto = isolados - i * v("porSilo");
    lista.push({ condominios: Math.min(v("porSilo"), resto) });
  }
  return lista;
}

// As linhas do CPV de um mês. Cada linha declara como cresce: fixa, em linha
// com os condomínios ou em degraus (um nó, um banco, uma pessoa de cada vez).
export function custoMensal(arq: Arquitetura, total: number): Linha[] {
  const inst = instalacoes(arq, total);
  const soma = (f: (i: Instalacao) => number) => inst.reduce((s, i) => s + f(i), 0);
  const gb = total * v("dados");
  const pessoas = (n: number) => n * v("pessoa");
  const linha = (
    nome: string,
    tipo: Tipo,
    comportamento: Comportamento,
    valor: number,
    etiqueta: Etiqueta = "compartilhado",
  ): Linha => ({ nome, tipo, comportamento, etiqueta, valor });

  const linhas = [
    linha("plano de controle", "infra", "fixo", porHora(v("cluster"))),
    linha(
      "nós de aplicação",
      "infra",
      "degraus",
      soma((i) => nosDaInstalacao(i.condominios) * porHora(v("no"))),
    ),
    linha(
      "bancos",
      "infra",
      "degraus",
      soma((i) => multiplicadorDoBanco(i.condominios) * porHora(v("banco"))),
    ),
    linha("disco", "infra", "linear", gb * v("disco") * v("dolar")),
    linha("backup", "infra", "linear", gb * v("backup")),
    linha(
      "logs e rastros",
      "infra",
      "linear",
      ((total * v("pedidos")) / 1e6) * v("sinais"),
    ),
    linha("assistente", "infra", "linear", total * v("ia"), "assistente"),
    linha("cofre de segredos", "infra", "fixo", v("segredos")),
    linha(
      "operação de bancos",
      "pessoas",
      "degraus",
      inst.length * (v("horasBanco") * v("hora") + v("ensaio")),
    ),
    linha(
      "operação de instalações",
      "pessoas",
      "degraus",
      inst.length * v("horasInstalacao") * v("hora"),
    ),
    linha(
      "plataforma",
      "pessoas",
      "degraus",
      pessoas(Math.ceil(inst.length / v("porPlataforma"))),
    ),
    linha("Keycloak", "pessoas", "fixo", pessoas(v("keycloak"))),
    linha(
      "atendimento",
      "pessoas",
      "degraus",
      pessoas(Math.ceil(total / v("porAtendente"))),
      "atendimento",
    ),
  ];
  // As células precisam de um roteador na entrada (capítulo 17)
  if (arq === "celulas") {
    linhas.splice(3, 0, linha("roteador", "infra", "fixo", 2 * porHora(v("no"))));
  }
  return linhas;
}

export const somar = (linhas: Linha[], tipo?: Tipo) =>
  linhas.filter((l) => !tipo || l.tipo === tipo).reduce((s, l) => s + l.valor, 0);
