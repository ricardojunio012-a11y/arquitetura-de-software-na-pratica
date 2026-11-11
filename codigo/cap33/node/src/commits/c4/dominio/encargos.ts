// Commit c4: a mesma regra do c3, agora com o calendário recebido por uma porta.
import type { Calendario } from "./calendario.ts";

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

function vencimentoEfetivo(data: string, calendario: Calendario): string {
  let dia = data;
  while (!calendario.ehDiaUtil(dia)) {
    dia = new Date(Date.parse(dia) + DIA).toISOString().slice(0, 10);
  }
  return dia;
}

export function calcularEncargos(
  c: Cobranca,
  pagamento: string,
  calendario: Calendario,
): Encargos {
  const atraso = diasEntre(vencimentoEfetivo(c.vencimento, calendario), pagamento);
  if (atraso <= -5) {
    const desconto = Math.round(c.valor * 0.03);
    return { multa: 0, juros: 0, desconto, total: c.valor - desconto };
  }
  if (atraso <= 0) return { multa: 0, juros: 0, desconto: 0, total: c.valor };
  const multa = Math.round(c.valor * 0.02);
  const juros = Math.round((c.valor * 0.01 * atraso) / 30);
  return { multa, juros, desconto: 0, total: c.valor + multa + juros };
}
