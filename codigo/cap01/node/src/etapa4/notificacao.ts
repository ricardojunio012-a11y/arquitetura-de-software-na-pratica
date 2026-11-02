// Como o morador fica sabendo da cobrança.
import fs from "node:fs";
import type { Cobranca } from "./calculo.ts";
import type { Competencia } from "./competencia.ts";
import { reais } from "./dinheiro.ts";

export interface Aviso {
  condominio: string;
  competencia: Competencia;
  cobranca: Cobranca;
  pagamento: { nome: string; codigo: string };
}

export interface Notificador {
  notificar(aviso: Aviso): void;
}

export function formatarEmail({
  condominio,
  competencia,
  cobranca,
  pagamento,
}: Aviso): string {
  const { unidade } = cobranca;
  const linhas = [
    `Para: ${unidade.morador.email}`,
    `Assunto: Taxa condominial ${competencia.rotulo} - ${condominio} - ` +
      `Unidade ${unidade.id}`,
    "",
    `Olá, ${unidade.morador.nome}.`,
    "",
    `A taxa condominial de ${competencia.rotulo} da unidade ${unidade.id} ` +
      "está disponível.",
    `Valor: R$ ${reais(cobranca.total)}`,
    `Vencimento: ${competencia.vencimento}`,
  ];
  if (cobranca.totalAte05 !== null) {
    linhas.push(
      `Pagando até ${competencia.limiteDesconto}, o valor cai para ` +
        `R$ ${reais(cobranca.totalAte05)}.`,
    );
  }
  if (cobranca.debito > 0) {
    linhas.push(
      `Inclui débito anterior de R$ ${reais(cobranca.debito)}, com multa de R$ ` +
        `${reais(cobranca.multa)} e juros de R$ ${reais(cobranca.juros)}.`,
    );
  }
  linhas.push(
    `${pagamento.nome}: ${pagamento.codigo}`,
    "",
    `Administração do ${condominio}`,
    "----",
  );
  return linhas.join("\n") + "\n";
}

// Simula o envio gravando as mensagens num arquivo
export class EmailEmArquivo implements Notificador {
  private readonly arquivo: string;

  constructor(arquivo: string) {
    this.arquivo = arquivo;
    fs.writeFileSync(arquivo, "");
  }

  notificar(aviso: Aviso): void {
    fs.appendFileSync(this.arquivo, formatarEmail(aviso));
  }
}
