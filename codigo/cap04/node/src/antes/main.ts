// Uso: node main.ts <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
// O gateway está fixo no código: a variável GATEWAY não muda nada aqui.
import fs from "node:fs";
import path from "node:path";
import { emitirCobrancas } from "./emissao.ts";

const [entrada, saida, opcao, data] = process.argv.slice(2);
const hoje = opcao === "--hoje" ? new Date(data + "T00:00:00Z") : new Date();
const dados = JSON.parse(fs.readFileSync(entrada, "utf8"));
const { cobrancas, registros } = emitirCobrancas(dados, hoje);
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "cobrancas.txt"), cobrancas);
fs.writeFileSync(path.join(saida, "registros.txt"), registros);
console.log("cobranças emitidas em " + saida);
