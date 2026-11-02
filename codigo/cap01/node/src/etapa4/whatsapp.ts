// Novo canal de aviso: entra sem mexer no e-mail.
import fs from "node:fs";
import { reais } from "./dinheiro.ts";
import type { Aviso, Notificador } from "./notificacao.ts";

export function formatarWhatsApp({
  condominio,
  competencia,
  cobranca,
  pagamento,
}: Aviso): string {
  const { unidade } = cobranca;
  let texto =
    `${condominio}: taxa ${competencia.rotulo} da unidade ${unidade.id}: ` +
    `R$ ${reais(cobranca.total)}, vence ${competencia.vencimento}.`;
  if (cobranca.totalAte05 !== null) {
    texto += ` Até ${competencia.limiteDesconto}: R$ ${reais(cobranca.totalAte05)}.`;
  }
  texto += ` ${pagamento.nome}: ${pagamento.codigo}`;
  return `Para: ${unidade.morador.telefone}\n${texto}\n----\n`;
}

// Simula o envio gravando as mensagens num arquivo
export class WhatsAppEmArquivo implements Notificador {
  private readonly arquivo: string;

  constructor(arquivo: string) {
    this.arquivo = arquivo;
    fs.writeFileSync(arquivo, "");
  }

  notificar(aviso: Aviso): void {
    fs.appendFileSync(this.arquivo, formatarWhatsApp(aviso));
  }
}
