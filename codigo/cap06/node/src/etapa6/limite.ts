// Classe-broto (sprout class, Feathers): a regra nova nasce fora do código legado,
// numa classe nova, pequena e com testes próprios. O legado só ganha uma chamada.
export interface ReservaDoMes {
  unidade: string;
  espaco: string;
  data: string;
}

// Reservas por unidade, por espaço, no mesmo mês
export const LIMITES_PADRAO: Record<string, number> = { salao: 1, churrasqueira: 2 };

export class LimitePorMes {
  readonly #limites: Record<string, number>;

  constructor(limites: Record<string, number> = LIMITES_PADRAO) {
    this.#limites = limites;
  }

  atingido(pedido: ReservaDoMes, aprovadas: readonly ReservaDoMes[]): boolean {
    const limite = this.#limites[pedido.espaco];
    if (limite === undefined) return false;
    const mes = pedido.data.slice(0, 7);
    const feitas = aprovadas.filter(
      (r) =>
        r.unidade === pedido.unidade &&
        r.espaco === pedido.espaco &&
        r.data.slice(0, 7) === mes,
    ).length;
    return feitas >= limite;
  }
}
