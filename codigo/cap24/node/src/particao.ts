// A versão "particao": a consulta de um mês lê só a partição daquele mês, e apagar
// um mês antigo é remover uma partição, e não apagar linha por linha.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const dados = process.argv[2];
const banco = new pg.Client({ connectionString: process.env.PRIMARIO_URL });
await banco.connect();
await banco.query(fs.readFileSync(path.join(dados, "sql", "acessos.sql"), "utf8"));

// As partições que aparecem no plano de execução
async function particoesLidas(consulta: string) {
  const { rows } = await banco.query(`EXPLAIN (COSTS OFF) ${consulta}`);
  const plano = rows.map((r) => r["QUERY PLAN"]).join("\n");
  return [...new Set(plano.match(/acessos_\d{4}_\d{2}/g))].sort();
}
const contar = async (sql: string) => Number((await banco.query(sql)).rows[0].n);

const linhas = [
  `acessos na tabela: ${await contar("SELECT count(*) AS n FROM acessos")}`,
];
const deOutubro =
  "SELECT count(*) FROM acessos WHERE condominio_id = 12 " +
  "AND entrada >= '2026-10-01' AND entrada < '2026-11-01'";
linhas.push(
  `acessos do condomínio 12 em outubro: partições lidas: ` +
    (await particoesLidas(deOutubro)).join(", "),
);
const semData = "SELECT count(*) FROM acessos WHERE condominio_id = 12";
const lidasSemData = (await particoesLidas(semData)).length;
linhas.push(
  `acessos do condomínio 12, sem filtro de data: ${lidasSemData} partições lidas`,
);

// Retenção: o mês mais antigo sai inteiro, num comando que não varre as linhas
const maio = await contar("SELECT count(*) AS n FROM acessos_2026_05");
await banco.query("ALTER TABLE acessos DETACH PARTITION acessos_2026_05");
await banco.query("DROP TABLE acessos_2026_05");
linhas.push(
  `retenção: maio removido com DROP da partição (${maio} linhas)`,
  `acessos na tabela: ${await contar("SELECT count(*) AS n FROM acessos")}`,
);

await banco.end();
const saida = path.join(dados, "saida", "particao");
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "resultado.txt"), linhas.join("\n") + "\n");
console.log(linhas.join("\n"));
