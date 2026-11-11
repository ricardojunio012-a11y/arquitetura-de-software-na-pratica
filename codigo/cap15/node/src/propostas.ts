// A versão "compatibilidade": compara cada proposta de entrada/propostas com o
// contrato publicado e diz se ela pode ser publicada sem quebrar os clientes.
import fs from "node:fs";
import path from "node:path";
import { compararContratos } from "./contrato/compatibilidade.ts";
import { lerContrato } from "./contrato/openapi.ts";

const dados = process.argv[2];
const publicado = lerContrato(path.join(dados, "openapi", "publicado", "v1.yaml"));
const pasta = path.join(dados, "entrada", "propostas");

const relatorio: string[] = [];
let incompativeis = 0;
const propostas = fs.readdirSync(pasta).sort();
for (const arquivo of propostas) {
  const mudancas = compararContratos(publicado, lerContrato(path.join(pasta, arquivo)));
  const quebra = mudancas.some((m) => !m.compativel);
  if (quebra) incompativeis++;
  relatorio.push(`${arquivo}: ${quebra ? "INCOMPATÍVEL" : "compatível"}`);
  for (const m of mudancas) relatorio.push(`  ${m.compativel ? "+" : "-"} ${m.texto}`);
}
relatorio.push("", `propostas incompatíveis: ${incompativeis} de ${propostas.length}`);

const saida = path.join(dados, "saida", "compatibilidade");
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "relatorio.txt"), relatorio.join("\n") + "\n");
console.log(`compatibilidade: ${incompativeis} de ${propostas.length} incompatíveis`);
