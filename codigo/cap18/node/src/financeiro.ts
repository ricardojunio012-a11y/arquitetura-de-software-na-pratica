// O modelo do Financeiro do Morada: um pagamento recebido, na linguagem do domínio.
// Nada aqui sabe de CNAB, de posições ou de códigos de ocorrência do banco.

export interface PagamentoRecebido {
  cobranca: string;
  pagoEm: string; // AAAA-MM-DD
  valorPagoCentavos: number;
  tarifaCentavos: number;
}

const reais = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

export function descrever(p: PagamentoRecebido): string {
  return (
    `${p.cobranca} paga em ${p.pagoEm}: R$ ${reais(p.valorPagoCentavos)}, ` +
    `tarifa R$ ${reais(p.tarifaCentavos)}`
  );
}
