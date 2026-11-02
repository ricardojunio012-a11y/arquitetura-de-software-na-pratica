import { percentual } from "../../../compartilhado/dinheiro.ts";
import { lancamento } from "../tipos.ts";
import type { Lancamento, Regra, Unidade } from "../tipos.ts";

// Multa única sobre o débito em atraso.
export class MultaPorAtraso implements Regra {
  readonly #porcento: number;

  constructor(porcento: number) {
    this.#porcento = porcento;
  }

  aplicar(unidade: Unidade): Lancamento[] {
    const d = unidade.debitoAnterior;
    if (!d) return [];
    const multa = percentual(d.valorCentavos, this.#porcento);
    return [lancamento("multa", `Multa (${this.#porcento}%)`, multa)];
  }
}
