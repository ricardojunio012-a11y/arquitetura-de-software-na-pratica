// Relatórios do financeiro: inadimplência e prestação de contas.
import { config } from "../config/config.ts";
import { cobrancas, jurosDeMora } from "../servicos/servicos.ts";
import { competencia, diasDeAtraso, reais } from "../util/util.ts";

export function gerarRelatorio(tipo: string): string {
  const nome = config.dados.condominio.nome;
  if (tipo === "inadimplencia") {
    // Ordena a lista do outro módulo no lugar (acoplamento de conteúdo)
    cobrancas.sort((a, b) => b.debito - a.debito);
    const linhas = [`# Inadimplência ${competencia()} - ${nome}`];
    linhas.push("unidade;morador;dias;debito;multa;juros;atualizado");
    let soma = [0, 0, 0, 0];
    for (const c of cobrancas.filter((x) => x.debito > 0)) {
      const venc = c.unidade.debitoAnterior.vencimento;
      const juros = jurosDeMora(c.debito, venc); // recalcula o que já existe
      const atualizado = c.debito + c.multa + juros;
      const valores = [c.debito, c.multa, juros, atualizado];
      soma = soma.map((s, i) => s + valores[i]);
      const dias = diasDeAtraso(venc);
      linhas.push(
        [c.unidade.id, c.unidade.morador.nome, dias, ...valores.map(reais)].join(";"),
      );
    }
    linhas.push(["total", "", "", ...soma.map(reais)].join(";"));
    return linhas.join("\n") + "\n";
  }
  // qualquer outro tipo vira prestação de contas
  const taxas = cobrancas.reduce((s, c) => s + c.taxa, 0);
  const fundo = cobrancas.reduce((s, c) => s + c.fundo, 0);
  const linhas = [`# Prestação de contas ${competencia()} - ${nome}`];
  linhas.push(`receitas;taxas condominiais;${reais(taxas)}`);
  linhas.push(`receitas;fundo de reserva;${reais(fundo)}`);
  let totalDespesas = 0;
  for (const d of config.dados.despesas) {
    totalDespesas += d.valorCentavos;
    linhas.push(`despesas;${d.categoria};${reais(d.valorCentavos)}`);
  }
  linhas.push(`despesas;total;${reais(totalDespesas)}`);
  const saldo = config.dados.fundoDeReservaSaldoAnteriorCentavos;
  linhas.push(`fundo;saldo anterior;${reais(saldo)}`);
  linhas.push(`fundo;saldo previsto;${reais(saldo + fundo)}`);
  return linhas.join("\n") + "\n";
}
