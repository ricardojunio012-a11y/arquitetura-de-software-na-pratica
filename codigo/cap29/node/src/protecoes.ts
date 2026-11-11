// As proteções do capítulo, cada uma independente das outras: tempo limite, novas
// tentativas com variação, disjuntor e anteparo. Todas usam o relógio simulado.
import type { Relogio } from "./relogio.ts";

export type Chamada<T> = () => Promise<T>;
export class DisjuntorAberto extends Error {}
export class AnteparoCheio extends Error {}

// Tempo limite: desiste depois de `ms`. A chamada continua lá fora, mas quem esperava
// fica livre
export function comTempoLimite<T>(relogio: Relogio, ms: number, chamada: Chamada<T>) {
  return Promise.race([
    chamada(),
    relogio.dormir(ms).then((): T => {
      throw new Error("tempo limite");
    }),
  ]);
}

// Orçamento de novas tentativas: cada pedido novo deposita uma fração de ficha, cada
// nova tentativa gasta uma. Com 0,1, as novas tentativas ficam perto de 10% dos pedidos
export class Orcamento {
  fichas: number;
  deposito: number;
  maximo: number;

  constructor(deposito: number, maximo: number) {
    this.deposito = deposito;
    this.maximo = maximo;
    this.fichas = maximo;
  }

  novoPedido() {
    this.fichas = Math.min(this.maximo, this.fichas + this.deposito);
  }

  podeRepetir(): boolean {
    if (this.fichas < 1) return false;
    this.fichas -= 1;
    return true;
  }
}

export interface OpcoesDeTentativas {
  tentativas: number;
  baseMs: number;
  sortear: () => number;
  orcamento?: Orcamento;
}

// Novas tentativas com espera exponencial e variação total (full jitter): antes da
// tentativa n + 1, espera um tempo sorteado entre 0 e base × 2^(n-1)
export async function comNovasTentativas<T>(
  relogio: Relogio,
  chamada: Chamada<T>,
  o: OpcoesDeTentativas,
): Promise<T> {
  o.orcamento?.novoPedido();
  for (let n = 1; ; n++) {
    try {
      return await chamada();
    } catch (erro) {
      const desistir =
        n >= o.tentativas ||
        erro instanceof DisjuntorAberto ||
        (o.orcamento !== undefined && !o.orcamento.podeRepetir());
      if (desistir) throw erro;
      await relogio.dormir(Math.floor(o.sortear() * o.baseMs * 2 ** (n - 1)));
    }
  }
}

export interface OpcoesDoDisjuntor {
  janela: number; // quantas chamadas recentes observar
  minimo: number; // quantas precisa ter visto para decidir
  limiar: number; // proporção de falhas que abre o disjuntor
  pausaMs: number; // quanto tempo fica aberto antes de testar
  testes: number; // quantas chamadas de teste deixa passar quando meio-aberto
}

// Disjuntor: se a proporção de falhas nas últimas chamadas passa do limiar, abre e
// recusa na hora durante a pausa. Depois fica meio-aberto: deixa passar algumas
// chamadas de teste e, pelo resultado delas, fecha ou abre de novo
export class Disjuntor {
  estado: "fechado" | "aberto" | "meio-aberto" = "fechado";
  aberturas = 0;
  relogio: Relogio;
  o: OpcoesDoDisjuntor;
  #resultados: boolean[] = [];
  #abertoEm = 0;
  #testesEmAndamento = 0;

  constructor(relogio: Relogio, o: OpcoesDoDisjuntor) {
    this.relogio = relogio;
    this.o = o;
  }

  async chamar<T>(chamada: Chamada<T>): Promise<T> {
    if (this.estado === "aberto") {
      if (this.relogio.agora - this.#abertoEm < this.o.pausaMs) {
        throw new DisjuntorAberto("disjuntor aberto");
      }
      this.estado = "meio-aberto";
    }
    const teste = this.estado === "meio-aberto";
    if (teste) {
      if (this.#testesEmAndamento + this.#resultados.length >= this.o.testes) {
        throw new DisjuntorAberto("disjuntor em teste");
      }
      this.#testesEmAndamento++;
    }
    try {
      const resposta = await chamada();
      this.#registrar(true, teste);
      return resposta;
    } catch (erro) {
      this.#registrar(false, teste);
      throw erro;
    }
  }

  #registrar(sucesso: boolean, teste: boolean) {
    if (teste) this.#testesEmAndamento--;
    // Respostas atrasadas de antes da abertura não contam
    if (this.estado === "aberto" || (this.estado === "meio-aberto" && !teste)) return;
    this.#resultados.push(sucesso);
    if (this.#resultados.length > this.o.janela) this.#resultados.shift();
    const vistos = this.#resultados.length;
    const proporcao = this.#resultados.filter((r) => !r).length / vistos;
    if (this.estado === "meio-aberto") {
      if (vistos < this.o.testes) return;
      if (proporcao >= this.o.limiar) this.#abrir();
      else {
        this.estado = "fechado";
        this.#resultados = [];
      }
    } else if (vistos >= this.o.minimo && proporcao >= this.o.limiar) this.#abrir();
  }

  #abrir() {
    this.estado = "aberto";
    this.#abertoEm = this.relogio.agora;
    this.#resultados = [];
    this.aberturas++;
  }
}

// Anteparo (bulkhead): no máximo `vagas` chamadas ao mesmo tempo; a seguinte é
// recusada na hora, em vez de prender mais um trabalhador do servidor
export class Anteparo {
  vagas: number;
  recusas = 0;
  #ocupadas = 0;

  constructor(vagas: number) {
    this.vagas = vagas;
  }

  async chamar<T>(chamada: Chamada<T>): Promise<T> {
    if (this.#ocupadas >= this.vagas) {
      this.recusas++;
      throw new AnteparoCheio("anteparo cheio");
    }
    this.#ocupadas++;
    try {
      return await chamada();
    } finally {
      this.#ocupadas--;
    }
  }
}

// Os trabalhadores do servidor: no máximo `n` pedidos atendidos ao mesmo tempo; os
// outros esperam na fila, em ordem de chegada
export class Trabalhadores {
  #livres: number;
  #fila: (() => void)[] = [];

  constructor(n: number) {
    this.#livres = n;
  }

  async executar<T>(tarefa: Chamada<T>): Promise<T> {
    if (this.#livres > 0) this.#livres--;
    else await new Promise<void>((vez) => this.#fila.push(vez));
    try {
      return await tarefa();
    } finally {
      const proximo = this.#fila.shift();
      if (proximo) proximo();
      else this.#livres++;
    }
  }
}
