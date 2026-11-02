import { percentual } from "../../../compartilhado/dinheiro.ts";
import { lancamento, valorDe } from "../tipos.ts";
import type { Lancamento, Regra, Unidade } from "../tipos.ts";

// Percentual sobre a taxa condominial, para o fundo de reserva.
export class FundoDeReserva implements Regra {
  readonly #porcento: number;

  constructor(porcento: number) {
    this.#porcento = porcento;
  }

  aplicar(_unidade: Unidade, lancados: readonly Lancamento[]): Lancamento[] {
    const fundo = percentual(valorDe(lancados, "taxa"), this.#porcento);
    return [lancamento("fundo", `Fundo de reserva (${this.#porcento}%)`, fundo)];
  }
}
