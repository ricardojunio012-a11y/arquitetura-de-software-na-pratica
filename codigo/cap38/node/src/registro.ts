// As versões "registro" e "defeitos": valida uma pasta de ADRs e gera o índice.
// Uso: registro.ts <pasta de dados> <versão> <pasta do registro>
import fs from "node:fs";
import path from "node:path";
import { indice, lerRegistro, nomeDoAdr, validar } from "./adr.ts";
import { FUNCOES } from "./aptidao/funcoes.ts";

const [dados, versao, pasta] = process.argv.slice(2);
const adrs = lerRegistro(pasta);
const ligacoes = FUNCOES.map((f) => ({ funcao: f.nome, adr: f.adr }));
const problemas = validar(adrs, ligacoes);

const linhas = [`registro ${pasta}/: ${adrs.length} arquivos`];
for (const a of adrs) {
  const titulo = a.titulo.length > 52 ? a.titulo.slice(0, 51) + "…" : a.titulo;
  linhas.push(`  ${nomeDoAdr(a.numero)}  ${a.situacao.padEnd(23)}  ${titulo}`);
}
linhas.push("funções de aptidão:");
for (const f of FUNCOES)
  linhas.push(`  ${f.nome.padEnd(16)} protege ${nomeDoAdr(f.adr)}`);
if (problemas.length === 0) linhas.push("resultado: registro válido");
else {
  linhas.push(`resultado: ${problemas.length} problemas`);
  for (const p of problemas) linhas.push(`  ${p}`);
}

const saida = path.join(dados, "saida", versao);
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "resultado.txt"), linhas.join("\n") + "\n");
if (problemas.length === 0)
  fs.writeFileSync(path.join(saida, "indice.md"), indice(adrs));
console.log(linhas.join("\n"));
// Na esteira, um registro com problemas reprova a mudança
process.exitCode = problemas.length === 0 ? 0 : 1;
