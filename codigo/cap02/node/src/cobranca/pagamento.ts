// Como o morador paga. O cálculo não sabe que meio é esse.
import type { Cobranca } from "./calculo.ts";
import type { Competencia } from "./competencia.ts";

export interface MeioDePagamento {
  readonly nome: string;
  gerarCodigo(
    condominioId: string,
    competencia: Competencia,
    cobranca: Cobranca,
  ): string;
}

// Código fictício: num sistema real, viria do banco emissor
export class Boleto implements MeioDePagamento {
  readonly nome = "Boleto";

  gerarCodigo(
    condominioId: string,
    competencia: Competencia,
    cobranca: Cobranca,
  ): string {
    const { unidade, total } = cobranca;
    return `BOL-${condominioId}-${competencia.codigo}-${unidade.id}-${total}`;
  }
}
