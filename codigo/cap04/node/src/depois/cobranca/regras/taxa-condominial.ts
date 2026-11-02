import { parteDe } from "../../../compartilhado/dinheiro.ts";
import { lancamento } from "../tipos.ts";
import type { Lancamento, Regra, Unidade } from "../tipos.ts";

// A parte da unidade nas despesas do mês, pela fração ideal.
export class TaxaCondominial implements Regra {
  readonly #despesas: number;

  constructor(despesasDoMes: number) {
    this.#despesas = despesasDoMes;
  }

  aplicar(unidade: Unidade): Lancamento[] {
    const taxa = parteDe(this.#despesas, unidade.fracaoMilionesimos);
    return [lancamento("taxa", "Taxa condominial", taxa)];
  }
}
