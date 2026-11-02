// Regras de cálculo da taxa condominial: não lê arquivo nem envia nada.
import { diasDesde } from "./competencia.ts";
import { parteDe, percentual } from "./dinheiro.ts";

export interface Morador {
  nome: string;
  email: string;
  telefone?: string;
  canal: string;
}

export interface Unidade {
  id: string;
  fracaoMilionesimos: number;
  morador: Morador;
  meioPagamento: string;
  debitoAnterior: { valorCentavos: number; vencimento: string } | null;
}

export interface Cobranca {
  unidade: Unidade;
  taxa: number;
  fundo: number;
  debito: number;
  multa: number;
  juros: number;
  total: number;
  // valor com desconto de pontualidade, se a unidade tiver direito
  totalAte05: number | null;
}

const FUNDO_DE_RESERVA = 10; // % sobre a taxa
const MULTA = 2; // % sobre o débito (limite do Código Civil, art. 1.336)
const DESCONTO_PONTUALIDADE = 5; // % sobre a taxa, se não houver débito

// 1% ao mês, proporcional aos dias de atraso
export function jurosDeMora(centavos: number, dias: number): number {
  return Math.floor((centavos * dias + 1500) / 3000);
}

export function calcularCobranca(
  despesasCentavos: number,
  unidade: Unidade,
  hoje: Date,
): Cobranca {
  const taxa = parteDe(despesasCentavos, unidade.fracaoMilionesimos);
  const fundo = percentual(taxa, FUNDO_DE_RESERVA);
  let debito = 0;
  let multa = 0;
  let juros = 0;
  if (unidade.debitoAnterior) {
    debito = unidade.debitoAnterior.valorCentavos;
    multa = percentual(debito, MULTA);
    juros = jurosDeMora(debito, diasDesde(unidade.debitoAnterior.vencimento, hoje));
  }
  const total = taxa + fundo + debito + multa + juros;
  const totalAte05 =
    debito === 0 ? total - percentual(taxa, DESCONTO_PONTUALIDADE) : null;
  return { unidade, taxa, fundo, debito, multa, juros, total, totalAte05 };
}
