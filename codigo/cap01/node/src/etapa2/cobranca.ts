// Etapa 2: o código original depois dos três pedidos de mudança
// (desconto por pontualidade, Pix e aviso por WhatsApp), feitos do jeito mais direto.
import fs from "node:fs";
import path from "node:path";

export function gerarCobrancaMensal(entrada: string, saida: string, hoje = new Date()) {
  const dados = JSON.parse(fs.readFileSync(entrada, "utf8")); // ① lê o arquivo
  const ano = hoje.getUTCFullYear(); // ② consulta o relógio
  const mes = String(hoje.getUTCMonth() + 1).padStart(2, "0");
  const competencia = `${mes}/${ano}`;
  const vencimento = `10/${mes}/${ano}`;
  const limiteDesconto = `05/${mes}/${ano}`;
  const nome = dados.condominio.nome;
  const reais = (c: number) => // ④ formata em reais
    Math.floor(c / 100).toLocaleString("pt-BR") +
    "," +
    String(c % 100).padStart(2, "0");

  const linhas = [`# Cobranças ${competencia} - ${nome} - vencimento ${vencimento}`];
  linhas.push(
    "unidade;morador;taxa;fundo;debito;multa;juros;total;total_ate_05;pagamento",
  );
  let emails = "";
  let whatsapp = "";

  for (const u of dados.unidades) {
    // ③ taxa pela fração ideal, arredondada para o centavo mais próximo
    const despesas = dados.condominio.despesasDoMesCentavos;
    const taxa = Math.floor((despesas * u.fracaoMilionesimos + 500000) / 1000000);
    const fundo = Math.floor((taxa * 10 + 50) / 100); // fundo de reserva: 10%
    let debito = 0;
    let multa = 0;
    let juros = 0;
    if (u.debitoAnterior) {
      debito = u.debitoAnterior.valorCentavos;
      multa = Math.floor((debito * 2 + 50) / 100); // multa de 2%
      const venc = Date.parse(u.debitoAnterior.vencimento + "T00:00:00Z");
      const dias = Math.round((hoje.getTime() - venc) / 86400000);
      juros = Math.floor((debito * dias + 1500) / 3000); // 1% ao mês, proporcional
    }
    const total = taxa + fundo + debito + multa + juros;
    // desconto de 5% sobre a taxa para quem paga até o dia 5 sem débito
    let totalAte05 = 0;
    if (debito === 0) {
      totalAte05 = total - Math.floor((taxa * 5 + 50) / 100);
    }
    let codigo = "";
    if (u.meioPagamento === "pix") {
      codigo = `PIX-${dados.condominio.id}-${ano}${mes}-${u.id}-${total}`;
    } else {
      codigo = `BOL-${dados.condominio.id}-${ano}${mes}-${u.id}-${total}`;
    }

    const valores = [taxa, fundo, debito, multa, juros, total].map(reais);
    const comDesconto = totalAte05 > 0 ? reais(totalAte05) : "-";
    linhas.push([u.id, u.morador.nome, ...valores, comDesconto, codigo].join(";"));

    if (u.morador.canal === "whatsapp") {
      whatsapp += `Para: ${u.morador.telefone}\n`;
      whatsapp += `${nome}: taxa ${competencia} da unidade ${u.id}: `;
      whatsapp += `R$ ${reais(total)}, vence ${vencimento}.`;
      if (totalAte05 > 0) {
        whatsapp += ` Até ${limiteDesconto}: R$ ${reais(totalAte05)}.`;
      }
      const meio = u.meioPagamento === "pix" ? "Pix copia e cola" : "Boleto";
      whatsapp += ` ${meio}: ${codigo}\n----\n`;
    } else {
      emails += `Para: ${u.morador.email}\n`;
      emails += `Assunto: Taxa condominial ${competencia} - ${nome}`;
      emails += ` - Unidade ${u.id}\n\n`;
      emails += `Olá, ${u.morador.nome}.\n\n`;
      emails += `A taxa condominial de ${competencia} da unidade ${u.id} `;
      emails += "está disponível.\n";
      emails += `Valor: R$ ${reais(total)}\n`;
      emails += `Vencimento: ${vencimento}\n`;
      if (totalAte05 > 0) {
        emails += `Pagando até ${limiteDesconto}, o valor cai para `;
        emails += `R$ ${reais(totalAte05)}.\n`;
      }
      if (debito > 0) {
        emails += `Inclui débito anterior de R$ ${reais(debito)}, com multa de `;
        emails += `R$ ${reais(multa)} e juros de R$ ${reais(juros)}.\n`;
      }
      if (u.meioPagamento === "pix") {
        emails += `Pix copia e cola: ${codigo}\n\n`;
      } else {
        emails += `Boleto: ${codigo}\n\n`;
      }
      emails += `Administração do ${nome}\n----\n`;
    }
  }

  fs.mkdirSync(saida, { recursive: true }); // ⑦ grava os arquivos
  fs.writeFileSync(path.join(saida, "cobrancas.txt"), linhas.join("\n") + "\n");
  fs.writeFileSync(path.join(saida, "emails.txt"), emails);
  fs.writeFileSync(path.join(saida, "whatsapp.txt"), whatsapp);
}
