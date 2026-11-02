// Depois: Reservas pergunta ao Financeiro pela API pública. A regra de
// inadimplência continua num lugar só, o módulo que é dono dela.
import type { Financeiro } from "../../financeiro/api.ts";
import type { SituacaoFinanceira } from "../api.ts";

export class SituacaoPeloFinanceiro implements SituacaoFinanceira {
  readonly #financeiro: Financeiro;

  constructor(financeiro: Financeiro) {
    this.#financeiro = financeiro;
  }

  unidadeEmDia(unidade: string, hoje: string): boolean {
    return this.#financeiro.unidadeEmDia(unidade, hoje);
  }
}
