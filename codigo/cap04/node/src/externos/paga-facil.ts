// Simula a API de um provedor de Pix. Outra empresa, outro formato: valores em
// centavos, datas ISO e um identificador (txid) escolhido por quem cria a cobrança.
export interface CobrancaPix {
  txid: string;
  valorCentavos: number;
  expiraEm: string;
  descontoCentavos?: number;
  descontoAte?: string;
}

export class PagaFacilApi {
  criarCobranca(cobranca: CobrancaPix): { txid: string; status: string } {
    if (cobranca.valorCentavos <= 0) throw new Error("valor inválido");
    return { txid: cobranca.txid, status: "ATIVA" };
  }
}
