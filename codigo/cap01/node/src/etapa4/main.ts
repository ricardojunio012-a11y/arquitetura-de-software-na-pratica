// Uso: node main.ts <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
// Único lugar que conhece arquivos, relógio e implementações concretas.
import fs from "node:fs";
import path from "node:path";
import { gerarCobrancaMensal } from "./aplicacao.ts";
import { EmailEmArquivo } from "./notificacao.ts";
import { Boleto } from "./pagamento.ts";
import { Pix } from "./pix.ts";
import { WhatsAppEmArquivo } from "./whatsapp.ts";

const [entrada, saida, opcao, data] = process.argv.slice(2);
const hoje = opcao === "--hoje" ? new Date(data + "T00:00:00Z") : new Date();
const dados = JSON.parse(fs.readFileSync(entrada, "utf8"));

fs.mkdirSync(saida, { recursive: true });
const meiosDePagamento = { boleto: new Boleto(), pix: new Pix() };
const notificadores = {
  email: new EmailEmArquivo(path.join(saida, "emails.txt")),
  whatsapp: new WhatsAppEmArquivo(path.join(saida, "whatsapp.txt")),
};
const relatorio = gerarCobrancaMensal(dados, hoje, meiosDePagamento, notificadores);
relatorio.salvar(path.join(saida, "cobrancas.txt"));
console.log("cobranças geradas em " + saida);
