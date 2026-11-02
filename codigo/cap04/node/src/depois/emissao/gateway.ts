// A abstração pertence ao Morada, não aos provedores: é a emissão que diz do que
// precisa. Cada provedor ganha um adaptador que implementa esta interface.
import type { Cobranca } from "../cobranca/cobranca.ts";

export interface Prazos {
  readonly vencimento: string;
  readonly descontoAte: string;
}

export interface Registro {
  readonly unidade: string;
  readonly identificador: string;
}

export interface GatewayDePagamento {
  readonly nome: string;
  registrar(cobranca: Cobranca, prazos: Prazos): Registro;
}
