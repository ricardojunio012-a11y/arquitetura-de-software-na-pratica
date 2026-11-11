// Commit c3: vencimento em fim de semana ou feriado passa para o próximo dia útil.
// O atalho: o domínio importa o adaptador do banco para saber os feriados.
import { ehFeriado } from "../adaptadores/feriados-pg.ts";

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

function somarDia(data: string): string {
  return new Date(Date.parse(data) + DIA).toISOString().slice(0, 10);
}

async function vencimentoEfetivo(data: string): Promise<string> {
  let dia = data;
  for (;;) {
    const semana = new Date(Date.parse(dia)).getUTCDay();
    if (semana !== 0 && semana !== 6 && !(await ehFeriado(dia))) return dia;
    dia = somarDia(dia);
  }
}

export async function calcularEncargos(c: Cobranca, pagamento: string) {
  const atraso = diasEntre(await vencimentoEfetivo(c.vencimento), pagamento);
  if (atraso <= -5) {
    const desconto = Math.round(c.valor * 0.03);
    return { multa: 0, juros: 0, desconto, total: c.valor - desconto };
  }
  if (atraso <= 0) return { multa: 0, juros: 0, desconto: 0, total: c.valor };
  const multa = Math.round(c.valor * 0.02);
  const juros = Math.round((c.valor * 0.01 * atraso) / 30);
  return { multa, juros, desconto: 0, total: c.valor + multa + juros };
}
