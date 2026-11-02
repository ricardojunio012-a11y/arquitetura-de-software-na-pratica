// Novo meio de pagamento: entra sem mexer no cálculo nem no boleto.
import type { Cobranca } from "./calculo.ts";
import type { Competencia } from "./competencia.ts";
import type { MeioDePagamento } from "./pagamento.ts";

// Código fictício: num sistema real, viria do provedor de Pix
export class Pix implements MeioDePagamento {
  readonly nome = "Pix copia e cola";

  gerarCodigo(
    condominioId: string,
    competencia: Competencia,
    cobranca: Cobranca,
  ): string {
    const { unidade, total } = cobranca;
    return `PIX-${condominioId}-${competencia.codigo}-${unidade.id}-${total}`;
  }
}
