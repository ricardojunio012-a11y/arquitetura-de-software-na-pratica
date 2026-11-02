// Adaptador: traduz a cobrança do Morada para a API do Banco Alfa (boleto).
import { dataBr } from "../../compartilhado/datas.ts";
import { reaisComPonto } from "../../compartilhado/dinheiro.ts";
import type { ClienteBancoAlfa } from "../../externos/banco-alfa.ts";
import type { Cobranca } from "../cobranca/cobranca.ts";
import type { GatewayDePagamento, Prazos, Registro } from "../emissao/gateway.ts";

export class GatewayBancoAlfa implements GatewayDePagamento {
  readonly nome = "Banco Alfa";
  readonly #cliente: ClienteBancoAlfa;

  constructor(cliente: ClienteBancoAlfa) {
    this.#cliente = cliente;
  }

  registrar(cobranca: Cobranca, prazos: Prazos): Registro {
    const { nossoNumero } = this.#cliente.emitirBoleto({
      pagador: cobranca.morador,
      valor: reaisComPonto(cobranca.total),
      vencimento: dataBr(prazos.vencimento),
      ...(cobranca.desconto > 0 && {
        desconto: {
          valor: reaisComPonto(cobranca.desconto),
          ate: dataBr(prazos.descontoAte),
        },
      }),
    });
    return { unidade: cobranca.unidade, identificador: `boleto ${nossoNumero}` };
  }
}
