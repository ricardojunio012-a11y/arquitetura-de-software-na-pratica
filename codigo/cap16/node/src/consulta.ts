// A versão "consulta": a consulta de inadimplência sobre 1 milhão de cobranças, sem
// índice, com um índice na coluna errada e com o índice certo, criado pela
// migração 003. Os planos vão para saida/consulta; os tempos, que variam, só para o
// terminal.
import fs from "node:fs";
import path from "node:path";
import { conectar, recriarEsquema } from "./banco.ts";
import { aplicarMigracoes } from "./migracoes.ts";

type No = Record<string, any>;

const dados = process.argv[2];
const ler = (arquivo: string) => fs.readFileSync(path.join(dados, arquivo), "utf8");
const pastaMigracoes = path.join(dados, "migracoes");
const banco = await conectar(process.env.BANCO_URL!);
await recriarEsquema(banco);
const aplicadas = await aplicarMigracoes(banco, pastaMigracoes, 2);
await banco.query(ler("entrada/cobrancas.sql"));
await banco.query("ANALYZE cobrancas");
// Sem paralelismo, o plano fica igual em qualquer máquina e mais fácil de ler
await banco.query("SET max_parallel_workers_per_gather = 0");
const consulta = ler("entrada/inadimplencia.sql");

// Os nós que leem dados (varreduras de tabela e de índice), do plano em JSON
function varreduras(no: No): string[] {
  const filhos = (no.Plans ?? []).flatMap(varreduras);
  if (!no["Relation Name"] && !no["Index Name"]) return filhos;
  const tabela = no["Relation Name"] ? ` em ${no["Relation Name"]}` : "";
  const indice = no["Index Name"] ? ` pelo índice ${no["Index Name"]}` : "";
  const descartadas = no["Rows Removed by Filter"] ?? 0;
  const linhas = `${no["Actual Rows"]} linhas aproveitadas, ${descartadas} descartadas`;
  return [`${no["Node Type"]}${tabela}${indice}: ${linhas}`, ...filhos];
}

const planos: string[] = [];
async function planejar(titulo: string) {
  const { rows } = await banco.query(`EXPLAIN (ANALYZE, FORMAT JSON) ${consulta}`);
  const [plano] = rows[0]["QUERY PLAN"];
  planos.push(`${planos.length / 3 + 1}. ${titulo}`);
  planos.push(...varreduras(plano.Plan).map((linha) => `   ${linha}`), "");
  console.log(`${titulo}: ${plano["Execution Time"].toFixed(1)} ms`);
}

await planejar("sem índice");
await banco.query("CREATE INDEX cobrancas_vencimento ON cobrancas (vencimento)");
await banco.query("ANALYZE cobrancas");
await planejar("índice só no vencimento");
await banco.query("DROP INDEX cobrancas_vencimento");
aplicadas.push(...(await aplicarMigracoes(banco, pastaMigracoes)));
await banco.query("ANALYZE cobrancas");
await planejar("índice da migração 003");

const { rows } = await banco.query(consulta);
const resultado = rows.map(
  (r) =>
    `unidade ${r.unidade}: cobranças em aberto ${r.cobrancas}, ` +
    `total ${r.total_centavos} centavos`,
);
await banco.end();

const saida = path.join(dados, "saida", "consulta");
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "planos.txt"), planos.join("\n"));
fs.writeFileSync(path.join(saida, "resultado.txt"), resultado.join("\n") + "\n");
fs.writeFileSync(path.join(saida, "migracoes.txt"), aplicadas.join("\n") + "\n");
