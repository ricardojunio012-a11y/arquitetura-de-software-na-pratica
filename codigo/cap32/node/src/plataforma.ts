// Uma plataforma de funções simulada, em relógio lógico: cada chamada usa um ambiente
// de execução livre e "quente" ou cria um novo (partida a frio). A cobrança segue o
// modelo da AWS Lambda: por requisição e por GB-segundo, em milissegundos, com a
// fase de inicialização cobrada desde agosto de 2025.
import { PRECOS } from "./precos.ts";

// Premissas do laboratório, não números da AWS
export const FUNCAO = {
  memoriaMb: 1024,
  inicializacao: 500, // ms da partida a frio: ambiente, runtime e o seu código
  ociosidade: 5 * 60_000, // ms que um ambiente parado continua disponível
};

export type Chamada = { chegada: number; duracao: number }; // ms

export type Execucao = { inicio: number; fim: number; fria: boolean; cobrado: number };

type Ambiente = { livre: number; usado: number };

// Roda as chamadas em ordem de chegada. Com limite de concorrência, uma chamada que
// não encontra vaga espera na fila até um ambiente terminar.
export function executar(chamadas: Chamada[], concorrencia = Infinity): Execucao[] {
  const ambientes: Ambiente[] = [];
  const saida: Execucao[] = [];
  for (const c of [...chamadas].sort((a, b) => a.chegada - b.chegada)) {
    // descarta os ambientes parados há mais tempo que a ociosidade
    for (let i = ambientes.length - 1; i >= 0; i--) {
      const a = ambientes[i];
      if (a.livre <= c.chegada && c.chegada - a.livre > FUNCAO.ociosidade)
        ambientes.splice(i, 1);
    }
    let inicio = c.chegada;
    let amb = ambientes
      .filter((a) => a.livre <= c.chegada)
      .sort((a, b) => b.livre - a.livre)[0]; // o mais recente: os outros esfriam
    if (!amb && ambientes.length >= concorrencia) {
      amb = [...ambientes].sort((a, b) => a.livre - b.livre)[0]; // espera o primeiro
      inicio = amb.livre;
    }
    const fria = !amb;
    if (!amb) {
      amb = { livre: 0, usado: 0 };
      ambientes.push(amb);
    }
    const ms = c.duracao + (fria ? FUNCAO.inicializacao : 0);
    amb.livre = inicio + ms;
    amb.usado++;
    saida.push({ inicio: c.chegada, fim: inicio + ms, fria, cobrado: Math.ceil(ms) });
  }
  return saida;
}

export function custo(execucoes: Execucao[]) {
  const gbSegundos = execucoes.reduce(
    (s, e) => s + (e.cobrado / 1000) * (FUNCAO.memoriaMb / 1024),
    0,
  );
  const dolares =
    execucoes.length * PRECOS.lambdaPorRequisicao +
    gbSegundos * PRECOS.lambdaPorGbSegundo;
  return { gbSegundos, dolares };
}
