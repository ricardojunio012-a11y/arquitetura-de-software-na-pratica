// Relatório de inadimplência: lê as cobranças, nunca as altera.
import type { Cobranca } from "../cobranca/index.ts";
import { rotuloDoMes } from "../compartilhado/datas.ts";
import { reais } from "../compartilhado/dinheiro.ts";

export function relatorioDeInadimplencia(
  condominio: string,
  hoje: Date,
  cobrancas: readonly Cobranca[],
): string {
  const devedores = cobrancas
    .filter((c) => c.debito > 0)
    .sort((a, b) => b.debito - a.debito);
  const linhas = [`# Inadimplência ${rotuloDoMes(hoje)} - ${condominio}`];
  linhas.push("unidade;morador;dias;debito;multa;juros;atualizado");
  let soma = [0, 0, 0, 0];
  for (const c of devedores) {
    const valores = [c.debito, c.multa, c.juros, c.debito + c.multa + c.juros];
    soma = soma.map((s, i) => s + valores[i]);
    linhas.push(
      [c.unidade, c.morador, c.diasDeAtraso, ...valores.map(reais)].join(";"),
    );
  }
  linhas.push(["total", "", "", ...soma.map(reais)].join(";"));
  return linhas.join("\n") + "\n";
}
