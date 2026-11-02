// Adaptador: traduz a cobrança do Morada para a API do PagaFácil (Pix).
import type { PagaFacilApi } from "../../externos/paga-facil.ts";
import type { Cobranca } from "../cobranca/cobranca.ts";
import type { GatewayDePagamento, Prazos, Registro } from "../emissao/gateway.ts";

export class GatewayPagaFacil implements GatewayDePagamento {
  readonly nome = "PagaFácil";
  readonly #api: PagaFacilApi;

  constructor(api: PagaFacilApi) {
    this.#api = api;
  }

  registrar(cobranca: Cobranca, prazos: Prazos): Registro {
    // txid único por mês e unidade: MORADA202603A101
    const mes = prazos.vencimento.slice(0, 7).replace("-", "");
    const { txid } = this.#api.criarCobranca({
      txid: "MORADA" + mes + cobranca.unidade.replace("-", ""),
      valorCentavos: cobranca.total,
      expiraEm: prazos.vencimento,
      ...(cobranca.desconto > 0 && {
        descontoCentavos: cobranca.desconto,
        descontoAte: prazos.descontoAte,
      }),
    });
    return { unidade: cobranca.unidade, identificador: `pix ${txid}` };
  }
}
