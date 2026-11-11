// A versão "cnab": o retorno do Banco Alfa passa pela camada anticorrupção e chega ao
// Financeiro como pagamentos do domínio.
import fs from "node:fs";
import path from "node:path";
import { descrever } from "../financeiro.ts";
import { traduzirRetorno } from "./retorno-banco-alfa.ts";

const dados = process.argv[2];
const texto = fs.readFileSync(
  path.join(dados, "entrada", "retorno-banco-alfa.txt"),
  "utf8",
);
const { pagamentos, ignoradas } = traduzirRetorno(texto);

const resultado = [
  "pagamentos recebidos:",
  ...pagamentos.map((p) => `  ${descrever(p)}`),
  "ocorrências que não são pagamento:",
  ...ignoradas.map((i) => `  ${i}`),
];

const saida = path.join(dados, "saida", "cnab");
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "pagamentos.txt"), resultado.join("\n") + "\n");
console.log(`cnab: ${pagamentos.length} pagamentos, ${ignoradas.length} ignoradas`);
