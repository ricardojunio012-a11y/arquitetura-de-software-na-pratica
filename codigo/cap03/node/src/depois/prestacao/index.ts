// Prestação de contas: recebe só o que precisa, por parâmetro.
import type { Cobranca } from "../cobranca/index.ts";
import { rotuloDoMes } from "../compartilhado/datas.ts";
import { reais } from "../compartilhado/dinheiro.ts";

export interface Despesa {
  categoria: string;
  valorCentavos: number;
}

export function prestacaoDeContas(
  condominio: string,
  hoje: Date,
  cobrancas: readonly Cobranca[],
  despesas: readonly Despesa[],
  saldoAnteriorDoFundo: number,
): string {
  const taxas = cobrancas.reduce((s, c) => s + c.taxa, 0);
  const fundo = cobrancas.reduce((s, c) => s + c.fundo, 0);
  const linhas = [`# Prestação de contas ${rotuloDoMes(hoje)} - ${condominio}`];
  linhas.push(`receitas;taxas condominiais;${reais(taxas)}`);
  linhas.push(`receitas;fundo de reserva;${reais(fundo)}`);
  for (const d of despesas)
    linhas.push(`despesas;${d.categoria};${reais(d.valorCentavos)}`);
  const totalDespesas = despesas.reduce((s, d) => s + d.valorCentavos, 0);
  linhas.push(`despesas;total;${reais(totalDespesas)}`);
  linhas.push(`fundo;saldo anterior;${reais(saldoAnteriorDoFundo)}`);
  linhas.push(`fundo;saldo previsto;${reais(saldoAnteriorDoFundo + fundo)}`);
  return linhas.join("\n") + "\n";
}
