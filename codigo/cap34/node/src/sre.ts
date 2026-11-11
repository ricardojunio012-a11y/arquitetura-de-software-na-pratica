// SLI, orçamento de erro e alertas por taxa de consumo, sobre contagens por minuto.

// Pedidos e erros de cada minuto, com somas acumuladas para ler qualquer janela
export class Serie {
  #pedidos: number[] = [0];
  #erros: number[] = [0];

  acrescentar(pedidos: number, erros: number): void {
    this.#pedidos.push(this.#pedidos.at(-1)! + pedidos);
    this.#erros.push(this.#erros.at(-1)! + erros);
  }

  get minutos(): number {
    return this.#pedidos.length - 1;
  }

  // Os minutos (fim - tamanho, fim]; no começo da série, a janela é o que existe
  janela(fim: number, tamanho: number): { pedidos: number; erros: number } {
    const de = Math.max(0, fim - tamanho);
    return {
      pedidos: this.#pedidos[fim] - this.#pedidos[de],
      erros: this.#erros[fim] - this.#erros[de],
    };
  }
}

// Taxa de consumo: a fração de erros dividida pela fração que o SLO permite.
// 1 gasta o orçamento exatamente no fim do período; 14,4 gasta 2% dele numa hora.
export function taxaDeConsumo(erros: number, pedidos: number, slo: number): number {
  return pedidos === 0 ? 0 : erros / pedidos / (1 - slo);
}

export interface Regra {
  nome: string;
  longa: number; // minutos
  curta: number;
  taxa: number;
}

// As três regras recomendadas pelo SRE Workbook para um período de 30 dias
export const REGRAS: Regra[] = [
  { nome: "página, 1 h e 5 min, 14,4x", longa: 60, curta: 5, taxa: 14.4 },
  { nome: "página, 6 h e 30 min, 6x", longa: 360, curta: 30, taxa: 6 },
  { nome: "tíquete, 3 d e 6 h, 1x", longa: 4320, curta: 360, taxa: 1 },
];

export interface Episodio {
  inicio: number; // minuto em que o alerta disparou
  fim: number; // minuto em que deixou de disparar
}

// A regra dispara quando as duas janelas passam do limiar: a longa garante que o
// gasto é relevante, a curta garante que ele continua acontecendo agora
export function disparando(s: Serie, r: Regra, slo: number, minuto: number): boolean {
  const longa = s.janela(minuto, r.longa);
  const curta = s.janela(minuto, r.curta);
  return (
    taxaDeConsumo(longa.erros, longa.pedidos, slo) >= r.taxa &&
    taxaDeConsumo(curta.erros, curta.pedidos, slo) >= r.taxa
  );
}

// Avalia uma condição a cada minuto e devolve as notificações: um alerta que volta a
// disparar menos de 30 minutos depois de parar continua sendo a mesma notificação
export function episodios(
  s: Serie,
  condicao: (minuto: number) => boolean,
  tolerancia = 30,
): Episodio[] {
  const r: Episodio[] = [];
  let aberto: Episodio | undefined;
  for (let m = 1; m <= s.minutos; m++) {
    const agora = condicao(m);
    const ultimo = r.at(-1);
    if (agora && !aberto) {
      if (ultimo && m - ultimo.fim < tolerancia) aberto = ultimo;
      else r.push((aberto = { inicio: m, fim: s.minutos }));
    }
    if (!agora && aberto) {
      aberto.fim = m;
      aberto = undefined;
    }
    if (agora && aberto) aberto.fim = s.minutos;
  }
  return r;
}
