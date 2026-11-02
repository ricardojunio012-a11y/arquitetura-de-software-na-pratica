// Aberta para extensão, fechada para modificação: uma regra nova é uma classe nova,
// entregue pelo construtor. Esta classe não muda.
import { Cobranca } from "./cobranca.ts";
import type { Lancamento, Regra, Unidade } from "./tipos.ts";

export class CalculadoraDeCobranca {
  readonly #regras: readonly Regra[];

  constructor(regras: readonly Regra[]) {
    this.#regras = regras;
  }

  calcular(unidade: Unidade): Cobranca {
    const lancados: Lancamento[] = [];
    for (const regra of this.#regras) {
      lancados.push(...regra.aplicar(unidade, lancados));
    }
    return new Cobranca(unidade.id, unidade.morador.nome, lancados);
  }
}
