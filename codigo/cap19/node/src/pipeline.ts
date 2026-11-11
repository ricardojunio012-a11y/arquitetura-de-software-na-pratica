// A versão "elt": extrai do PostgreSQL, carrega no DuckDB, transforma no modelo
// dimensional, verifica a qualidade e gera o relatório de inadimplência.
import fs from "node:fs";
import path from "node:path";
import { DuckDBInstance } from "@duckdb/node-api";
import pg from "pg";
import { extrair } from "./extrair.ts";
import { verificar } from "./qualidade.ts";

const dados = process.argv[2];
const saida = path.join(dados, "saida", "elt");
const zonaBruta = "/tmp/zona-bruta";
fs.mkdirSync(saida, { recursive: true });
const ler = (arquivo: string) => fs.readFileSync(path.join(dados, arquivo), "utf8");

// A origem: o banco transacional do Morada
const banco = new pg.Client({ connectionString: process.env.BANCO_URL });
await banco.connect();
await banco.query(ler("sql/origem.sql"));
const extraidas = await extrair(banco, process.env.CHAVE_PSEUDONIMO!, zonaBruta);
await banco.end();

// O destino: um banco analítico, colunar, num arquivo só
const arquivo = "/tmp/analitico.duckdb";
fs.rmSync(arquivo, { force: true });
const con = await (await DuckDBInstance.create(arquivo)).connect();
const modelo = ler("sql/modelo.sql")
  .replaceAll("{bruta}", zonaBruta)
  .replaceAll("{entrada}", path.join(dados, "entrada"));
// Um comando por vez: cada um termina com ";" no fim da linha
for (const comando of modelo.split(/;\s*\n/).filter((c) => c.trim())) {
  await con.run(comando);
}

const qualidade = await verificar(con);

const relatorio = await con.runAndReadAll(ler("sql/relatorio.sql"));
const linhas = relatorio
  .getRowObjects()
  .map((r) =>
    [
      String(r.regiao).padEnd(13),
      String(r.porte).padEnd(8),
      String(r.cobrancas).padStart(6),
      String(r.em_aberto).padStart(9),
      `${Number(r.inadimplencia).toFixed(1).replace(".", ",")}%`.padStart(7),
    ].join("  "),
  );
const cabecalho = "região         porte    cobranças  em aberto  inadimpl.";

const amostra = await con.runAndReadAll(
  "SELECT morador_id, cpf_pseudonimo FROM dim_morador ORDER BY morador_id LIMIT 3",
);

fs.writeFileSync(
  path.join(saida, "relatorio.txt"),
  [
    "inadimplência por região e porte (cobranças de abril a setembro de 2026)",
    cabecalho,
    ...linhas,
    "",
  ].join("\n"),
);
fs.writeFileSync(path.join(saida, "qualidade.txt"), qualidade.join("\n") + "\n");
fs.writeFileSync(
  path.join(saida, "extracao.txt"),
  [
    ...Object.entries(extraidas).map(([t, n]) => `${t}: ${n} linhas extraídas`),
    "amostra de dim_morador:",
    ...amostra.getRowObjects().map((r) => `  ${r.morador_id} | ${r.cpf_pseudonimo}`),
    "",
  ].join("\n"),
);
console.log(`elt: ${linhas.length} grupos no relatório`);
