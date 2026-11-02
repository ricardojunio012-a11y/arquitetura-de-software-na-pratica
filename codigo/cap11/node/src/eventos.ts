// Evento de integração publicado pelo Financeiro. Carrega os dados de que os
// assinantes precisam (transferência de estado), para que não tenham de consultá-lo.
export interface PagamentoConfirmado {
  evento: string;
  tipo: "PagamentoConfirmado";
  pagamento: string;
  unidade: string;
  reserva: string;
  valorCentavos: number;
}

export interface Pagamento {
  pagamento: string;
  unidade: string;
  reserva: string;
  valorCentavos: number;
  falha?: "depois-de-gravar" | "relay-antes-de-marcar";
}

// O identificador do evento é estável: o mesmo pagamento gera sempre o mesmo evento
export function eventoDe(p: Pagamento): PagamentoConfirmado {
  return {
    evento: `E-${p.pagamento}`,
    tipo: "PagamentoConfirmado",
    pagamento: p.pagamento,
    unidade: p.unidade,
    reserva: p.reserva,
    valorCentavos: p.valorCentavos,
  };
}

export function reais(centavos: number): string {
  const inteiro = String(Math.floor(centavos / 100)).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ".",
  );
  return `R$ ${inteiro},${String(centavos % 100).padStart(2, "0")}`;
}
