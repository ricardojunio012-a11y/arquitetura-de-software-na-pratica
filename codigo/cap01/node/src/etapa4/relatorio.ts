// O relatório de cobranças do mês, para a administradora.
import fs from "node:fs";
import type { Cobranca } from "./calculo.ts";
import type { Competencia } from "./competencia.ts";
import { reais } from "./dinheiro.ts";

export class RelatorioDeCobrancas {
  private readonly linhas: string[];

  constructor(condominio: string, competencia: Competencia) {
    this.linhas = [
      `# Cobranças ${competencia.rotulo} - ${condominio} - ` +
        `vencimento ${competencia.vencimento}`,
      "unidade;morador;taxa;fundo;debito;multa;juros;total;" + "total_ate_05;pagamento",
    ];
  }

  adicionar(c: Cobranca, codigoDePagamento: string): void {
    const valores = [c.taxa, c.fundo, c.debito, c.multa, c.juros, c.total].map(reais);
    const comDesconto = c.totalAte05 === null ? "-" : reais(c.totalAte05);
    this.linhas.push(
      [
        c.unidade.id,
        c.unidade.morador.nome,
        ...valores,
        comDesconto,
        codigoDePagamento,
      ].join(";"),
    );
  }

  salvar(arquivo: string): void {
    fs.writeFileSync(arquivo, this.linhas.join("\n") + "\n");
  }
}
