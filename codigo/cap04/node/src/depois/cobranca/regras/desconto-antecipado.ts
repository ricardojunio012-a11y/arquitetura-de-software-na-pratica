import { diaMes } from "../../../compartilhado/datas.ts";
import { percentual } from "../../../compartilhado/dinheiro.ts";
import { lancamento, valorDe } from "../tipos.ts";
import type { Lancamento, Regra, Unidade } from "../tipos.ts";

// Desconto sobre a taxa devida para quem pagar até o dia combinado.
// Quem tem débito anterior não tem desconto (a regra do capítulo 1).
export class DescontoAntecipado implements Regra {
  readonly #porcento: number;
  readonly #ate: string;

  constructor(porcento: number, ate: string) {
    this.#porcento = porcento;
    this.#ate = ate;
  }

  aplicar(_unidade: Unidade, lancados: readonly Lancamento[]): Lancamento[] {
    const taxaDevida = valorDe(lancados, "taxa") + valorDe(lancados, "isencao");
    if (taxaDevida <= 0 || valorDe(lancados, "debito") > 0) return [];
    const descricao = `Desconto até ${diaMes(this.#ate)} (${this.#porcento}%)`;
    const desconto = percentual(taxaDevida, this.#porcento);
    return [lancamento("desconto", descricao, -desconto, true)];
  }
}
