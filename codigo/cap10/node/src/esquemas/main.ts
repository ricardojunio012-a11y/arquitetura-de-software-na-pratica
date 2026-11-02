// Uso: node main.ts <comandos.json> <pasta-de-saída>   (precisa de BANCO_URL)
// A parte difícil: o teste de arquitetura só vê imports, mas o incidente do capítulo
// foi uma consulta SQL. Aqui, cada módulo tem um esquema e um papel no PostgreSQL,
// e o próprio banco recusa a consulta de Reservas à tabela do Financeiro.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

// Roda como o dono do banco: cria os esquemas, os papéis e as permissões
const PREPARAR = `
DROP SCHEMA IF EXISTS financeiro CASCADE;
DROP SCHEMA IF EXISTS reservas CASCADE;
DROP ROLE IF EXISTS financeiro_app;
DROP ROLE IF EXISTS reservas_app;
CREATE ROLE financeiro_app LOGIN PASSWORD 'financeiro';
CREATE ROLE reservas_app LOGIN PASSWORD 'reservas';
CREATE SCHEMA financeiro AUTHORIZATION financeiro_app;
CREATE SCHEMA reservas AUTHORIZATION reservas_app;
`;

// Roda como financeiro_app: a tabela é privada; a API pública é uma função
const FINANCEIRO = `
CREATE TABLE financeiro.cobrancas (
  cobranca text PRIMARY KEY, unidade text NOT NULL, valor_centavos int NOT NULL,
  vencimento date NOT NULL, situacao text NOT NULL DEFAULT 'aberta');
CREATE FUNCTION financeiro.unidade_em_dia(p_unidade text, p_hoje date)
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = financeiro AS $$
    SELECT NOT EXISTS (SELECT 1 FROM cobrancas WHERE unidade = p_unidade
      AND situacao = 'aberta' AND vencimento < p_hoje) $$;
REVOKE EXECUTE ON FUNCTION financeiro.unidade_em_dia(text, date) FROM PUBLIC;
GRANT USAGE ON SCHEMA financeiro TO reservas_app;
GRANT EXECUTE ON FUNCTION financeiro.unidade_em_dia(text, date) TO reservas_app;
`;

// O atalho do início do capítulo, escrito em SQL
const ATALHO = `SELECT count(*) AS n FROM financeiro.cobrancas
  WHERE unidade = $1 AND situacao <> 'paga' AND vencimento < $2`;

const url = new URL(process.env.BANCO_URL!);
function comoPapel(usuario: string, senha: string) {
  const u = new URL(url);
  u.username = usuario;
  u.password = senha;
  return new pg.Client({ connectionString: u.toString() });
}

async function tentar(banco: pg.Client, sql: string, valores: unknown[]) {
  try {
    const { rows } = await banco.query(sql, valores);
    return `aceito (${JSON.stringify(rows[0])})`;
  } catch (erro) {
    const e = erro as { code: string; message: string };
    return `recusado pelo banco [${e.code}] ${e.message}`;
  }
}

const [entrada, saida] = process.argv.slice(2);
const dados = JSON.parse(fs.readFileSync(entrada, "utf8"));
const linhas: string[] = [];

const dono = new pg.Client({ connectionString: url.toString() });
await dono.connect();
await dono.query(PREPARAR);

const financeiro = comoPapel("financeiro_app", "financeiro");
await financeiro.connect();
await financeiro.query(FINANCEIRO);
for (const c of dados.comandos.filter(
  (c: { modulo: string }) => c.modulo === "financeiro",
)) {
  if (c.tipo === "emitir")
    await financeiro.query("INSERT INTO financeiro.cobrancas VALUES ($1, $2, $3, $4)", [
      c.cobranca,
      c.unidade,
      c.valorCentavos,
      c.vencimento,
    ]);
  else
    await financeiro.query(
      "UPDATE financeiro.cobrancas SET situacao = $2 WHERE cobranca = $1",
      [c.cobranca, c.tipo === "pagar" ? "paga" : "parcelada"],
    );
}
linhas.push("financeiro_app: tabela financeiro.cobrancas carregada");

const reservas = comoPapel("reservas_app", "reservas");
await reservas.connect();
const parametros = ["B-101", "2026-03-02"];
linhas.push(
  "reservas_app, atalho em financeiro.cobrancas: " +
    (await tentar(reservas, ATALHO, parametros)),
);
linhas.push(
  "reservas_app, API financeiro.unidade_em_dia(B-101): " +
    (await tentar(
      reservas,
      "SELECT financeiro.unidade_em_dia($1, $2) AS em_dia",
      parametros,
    )),
);
linhas.push(
  "reservas_app, criar tabela no esquema do Financeiro: " +
    (await tentar(reservas, "CREATE TABLE financeiro.atalho (x int)", [])),
);
// O furo comum: o monólito conecta com um único usuário, dono de tudo
linhas.push(
  "usuário único do monólito, mesmo atalho: " +
    (await tentar(dono, ATALHO, parametros)),
);

await Promise.all([dono.end(), financeiro.end(), reservas.end()]);
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "resultados.txt"), linhas.join("\n") + "\n");
console.log(linhas.join("\n"));
