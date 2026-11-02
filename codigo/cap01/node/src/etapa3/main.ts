// Uso: node main.ts <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
// Único lugar que conhece arquivos, relógio e implementações concretas.
import fs from "node:fs";
import path from "node:path";
import { gerarCobrancaMensal } from "./aplicacao.ts";
import { EmailEmArquivo } from "./notificacao.ts";
import { Boleto } from "./pagamento.ts";

const [entrada, saida, opcao, data] = process.argv.slice(2);
const hoje = opcao === "--hoje" ? new Date(data + "T00:00:00Z") : new Date();
const dados = JSON.parse(fs.readFileSync(entrada, "utf8"));

fs.mkdirSync(saida, { recursive: true });
const relatorio = gerarCobrancaMensal(
  dados,
  hoje,
  new Boleto(),
  new EmailEmArquivo(path.join(saida, "emails.txt")),
);
relatorio.salvar(path.join(saida, "cobrancas.txt"));
console.log("cobranças geradas em " + saida);
