// Antes: o atalho. Reservas lê a tabela do Financeiro direto e reimplementa a regra
// de inadimplência por conta própria, sem saber que um acordo de parcelamento
// deixa a unidade em dia.
import type { TabelaDeCobrancas } from "../../financeiro/interno/tabela.ts";
import type { SituacaoFinanceira } from "../api.ts";

export class SituacaoPelaTabela implements SituacaoFinanceira {
  readonly #tabela: TabelaDeCobrancas;

  constructor(tabela: TabelaDeCobrancas) {
    this.#tabela = tabela;
  }

  unidadeEmDia(unidade: string, hoje: string): boolean {
    return !this.#tabela.linhas.some(
      (l) => l.unidade === unidade && l.situacao !== "paga" && l.vencimento < hoje,
    );
  }
}
