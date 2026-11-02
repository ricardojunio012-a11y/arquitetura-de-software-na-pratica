// Etapa 1: o primeiro código do Morada. Tudo numa função só, como costuma nascer.
import fs from "node:fs";
import path from "node:path";

export function gerarCobrancaMensal(entrada: string, saida: string, hoje = new Date()) {
  const dados = JSON.parse(fs.readFileSync(entrada, "utf8")); // ① lê o arquivo
  const ano = hoje.getUTCFullYear(); // ② consulta o relógio
  const mes = String(hoje.getUTCMonth() + 1).padStart(2, "0");
  const competencia = `${mes}/${ano}`;
  const vencimento = `10/${mes}/${ano}`;
  const nome = dados.condominio.nome;
  const reais = (c: number) => // ④ formata em reais
    Math.floor(c / 100).toLocaleString("pt-BR") +
    "," +
    String(c % 100).padStart(2, "0");

  const linhas = [`# Cobranças ${competencia} - ${nome} - vencimento ${vencimento}`];
  linhas.push("unidade;morador;taxa;fundo;debito;multa;juros;total;pagamento");
  let emails = "";

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
    const codigo = `BOL-${dados.condominio.id}-${ano}${mes}-${u.id}-${total}`; // ⑤

    const valores = [taxa, fundo, debito, multa, juros, total].map(reais);
    linhas.push([u.id, u.morador.nome, ...valores, codigo].join(";"));

    emails += `Para: ${u.morador.email}\n`; // ⑥ monta o e-mail
    emails += `Assunto: Taxa condominial ${competencia} - ${nome}`;
    emails += ` - Unidade ${u.id}\n\n`;
    emails += `Olá, ${u.morador.nome}.\n\n`;
    emails += `A taxa condominial de ${competencia} da unidade ${u.id} `;
    emails += "está disponível.\n";
    emails += `Valor: R$ ${reais(total)}\n`;
    emails += `Vencimento: ${vencimento}\n`;
    if (debito > 0) {
      emails += `Inclui débito anterior de R$ ${reais(debito)}, com multa de `;
      emails += `R$ ${reais(multa)} e juros de R$ ${reais(juros)}.\n`;
    }
    emails += `Boleto: ${codigo}\n\n`;
    emails += `Administração do ${nome}\n----\n`;
  }

  fs.mkdirSync(saida, { recursive: true }); // ⑦ grava os arquivos
  fs.writeFileSync(path.join(saida, "cobrancas.txt"), linhas.join("\n") + "\n");
  fs.writeFileSync(path.join(saida, "emails.txt"), emails);
}
