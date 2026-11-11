// A versão "aptidao": três commits passam pelas duas funções de aptidão da esteira.
// Antes, a esteira confere que cada função protege um ADR em vigor.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lerRegistro, nomeDoAdr, validar } from "./adr.ts";
import { FUNCOES } from "./aptidao/funcoes.ts";
import { bancoDeTeste } from "./aptidao/latencia.ts";

const dados = process.argv[2];
const raiz = path.dirname(fileURLToPath(import.meta.url));
const COMMITS: [string, string][] = [
  ["c1", "painel de inadimplência com uma consulta agregada"],
  ["c2", "reservas confere o débito direto na tabela de cobranças"],
  ["c3", "painel soma o débito unidade por unidade"],
];

const ligacoes = FUNCOES.map((f) => ({ funcao: f.nome, adr: f.adr }));
const problemas = validar(lerRegistro(path.join(raiz, "..", "decisoes")), ligacoes);
const linhas = [
  `registro: ${problemas.length === 0 ? "válido" : problemas.length + " problemas"}`,
];
for (const f of FUNCOES)
  linhas.push(`função ${f.nome} (${nomeDoAdr(f.adr)}): ${f.regra}`);

const pg = await bancoDeTeste();
for (const [commit, descricao] of COMMITS) {
  linhas.push("", `commit ${commit}: ${descricao}`);
  let aprovado = true;
  for (const f of FUNCOES) {
    const r = await f.verificar(path.join(raiz, "commits", commit), pg);
    aprovado &&= r.ok;
    linhas.push(`  ${f.nome.padEnd(16)} ${r.ok ? "ok" : "FALHOU"}`);
    for (const d of r.detalhes) linhas.push(`      ${d}`);
  }
  linhas.push(aprovado ? "  => aprovado" : "  => barrado; nada foi publicado");
}
await pg.close();

const saida = path.join(dados, "saida", "aptidao");
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "resultado.txt"), linhas.join("\n") + "\n");
console.log(linhas.join("\n"));
