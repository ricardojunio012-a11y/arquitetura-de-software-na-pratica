// Commit c1: desconto de 3% para quem paga pelo menos 5 dias antes do vencimento.
// Valores em centavos; datas no formato AAAA-MM-DD.
export type Cobranca = { valor: number; vencimento: string };
export type Encargos = {
  multa: number;
  juros: number;
  desconto: number;
  total: number;
};

const DIA = 86_400_000;

export function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(ate) - Date.parse(de)) / DIA);
}

export function calcularEncargos(c: Cobranca, pagamento: string): Encargos {
  const atraso = diasEntre(c.vencimento, pagamento);
  if (atraso <= -5) {
    const desconto = Math.round(c.valor * 0.03);
    return { multa: 0, juros: 0, desconto, total: c.valor - desconto };
  }
  if (atraso <= 0) return { multa: 0, juros: 0, desconto: 0, total: c.valor };
  const multa = Math.round(c.valor * 0.02);
  const juros = Math.round((c.valor * 0.01 * atraso) / 30);
  return { multa, juros, desconto: 0, total: c.valor + multa + juros };
}
