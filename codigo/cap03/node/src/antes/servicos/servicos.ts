// Serviços do financeiro: calcula as cobranças e monta as saídas.
import { config } from "../config/config.ts";
import { gerarRelatorio } from "../relatorios/relatorios.ts";
import { competencia, diasDeAtraso, reais } from "../util/util.ts";

// Lista interna, mas exportada: qualquer um pode ler e alterar
export const cobrancas: any[] = [];

export function jurosDeMora(valor: number, vencimento: string): number {
  return Math.floor((valor * diasDeAtraso(vencimento) + 1500) / 3000);
}

export function calcularTodas(): void {
  const despesas = config.dados.condominio.despesasDoMesCentavos;
  for (const u of config.dados.unidades) {
    const taxa = Math.floor((despesas * u.fracaoMilionesimos + 500000) / 1000000);
    const fundo = Math.floor((taxa * config.fundoPorcento + 50) / 100);
    const d = u.debitoAnterior;
    const debito = d ? d.valorCentavos : 0;
    const multa = d ? Math.floor((debito * config.multaPorcento + 50) / 100) : 0;
    const juros = d ? jurosDeMora(debito, d.vencimento) : 0;
    const total = taxa + fundo + debito + multa + juros;
    cobrancas.push({ unidade: u, taxa, fundo, debito, multa, juros, total });
  }
}

// Um parâmetro decide o que a função faz (acoplamento de controle)
export function gerarSaida(tipo: string): string {
  if (tipo !== "cobrancas") return gerarRelatorio(tipo);
  const linhas = [`# Cobranças ${competencia()} - ${config.dados.condominio.nome}`];
  linhas.push("unidade;morador;taxa;fundo;debito;multa;juros;total");
  for (const c of cobrancas) {
    const valores = [c.taxa, c.fundo, c.debito, c.multa, c.juros, c.total].map(reais);
    linhas.push([c.unidade.id, c.unidade.morador.nome, ...valores].join(";"));
  }
  return linhas.join("\n") + "\n";
}
