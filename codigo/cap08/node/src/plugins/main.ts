// Uso: node main.ts <cobrancas.json> <pasta-de-plugins> <pasta-de-saída>
import fs from "node:fs";
import path from "node:path";
import { Nucleo } from "./nucleo.ts";

const [entrada, pastaDePlugins, saida] = process.argv.slice(2);
const nucleo = new Nucleo();
await nucleo.carregar(pastaDePlugins);

const { cobrancas } = JSON.parse(fs.readFileSync(entrada, "utf8"));
const linhas = [`plugins carregados: ${nucleo.nomes().join(", ")}`];
for (const c of cobrancas) linhas.push(nucleo.emitir(c));

fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "remessa.txt"), linhas.join("\n") + "\n");
console.log(`${cobrancas.length} cobranças; saída em ${saida}`);
