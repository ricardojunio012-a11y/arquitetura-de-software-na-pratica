// Simula o SDK de um banco emissor de boletos. A API é do banco, não do Morada:
// valores em reais com ponto e datas no formato DD/MM/AAAA.
export interface PedidoDeBoleto {
  pagador: string;
  valor: string;
  vencimento: string;
  desconto?: { valor: string; ate: string };
}

export class ClienteBancoAlfa {
  // Boletos emitidos no "servidor" do banco (o teste da versão antes usa)
  static emitidos = 0;

  emitirBoleto(pedido: PedidoDeBoleto): { nossoNumero: string } {
    if (!pedido.pagador || !pedido.valor) throw new Error("pedido incompleto");
    ClienteBancoAlfa.emitidos++;
    return { nossoNumero: String(ClienteBancoAlfa.emitidos).padStart(7, "0") };
  }
}
