// Regras internas da cobrança, usadas só pelo próprio módulo.
import { diasEntre } from "../compartilhado/datas.ts";
import { percentual } from "../compartilhado/dinheiro.ts";

const FUNDO_DE_RESERVA = 10; // % sobre a taxa
const MULTA = 2; // % sobre o débito

export function fundoDeReserva(taxa: number): number {
  return percentual(taxa, FUNDO_DE_RESERVA);
}

export function encargos(debito: number, vencimento: string, hoje: Date) {
  const dias = diasEntre(vencimento, hoje);
  const juros = Math.floor((debito * dias + 1500) / 3000); // 1% ao mês, proporcional
  return { dias, multa: percentual(debito, MULTA), juros };
}
