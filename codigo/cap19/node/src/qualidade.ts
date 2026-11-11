// Testes de qualidade de dados: cada verificação é uma consulta que conta as linhas que
// violam uma regra. Zero é aprovado; qualquer outro número é uma falha, com a contagem.
import type { DuckDBConnection } from "@duckdb/node-api";
import { pareceDadoPessoal } from "./pseudonimo.ts";

export interface Verificacao {
  nome: string;
  sql: string;
}

export const VERIFICACOES: Verificacao[] = [
  {
    nome: "cobrança única no fato",
    sql: "SELECT count(*) - count(DISTINCT cobranca_id) FROM fato_cobranca",
  },
  {
    nome: "todo condomínio do fato existe na dimensão",
    sql:
      "SELECT count(*) FROM fato_cobranca f " +
      "ANTI JOIN dim_condominio d USING (condominio_id)",
  },
  {
    nome: "todo condomínio tem região",
    sql: "SELECT count(*) FROM dim_condominio WHERE regiao IS NULL",
  },
  {
    nome: "valor positivo nas cobranças de origem",
    sql: "SELECT count(*) FROM bruto_cobrancas WHERE valor_centavos <= 0",
  },
  {
    nome: "origem = fato + quarentena",
    sql:
      "SELECT (SELECT count(*) FROM bruto_cobrancas) - " +
      "(SELECT count(*) FROM fato_cobranca) - " +
      "(SELECT count(*) FROM quarentena_cobrancas)",
  },
];

export async function verificar(con: DuckDBConnection): Promise<string[]> {
  const linhas: string[] = [];
  for (const v of VERIFICACOES) {
    const leitor = await con.runAndReadAll(`SELECT (${v.sql})::INTEGER AS n`);
    const n = leitor.getRowObjects()[0].n as number;
    linhas.push(n === 0 ? `ok      ${v.nome}` : `FALHOU  ${v.nome}: ${n} linhas`);
  }
  linhas.push(await semDadoPessoal(con));
  return linhas;
}

// Varre todas as colunas de texto de todas as tabelas atrás de CPFs e placas em claro
export async function semDadoPessoal(con: DuckDBConnection): Promise<string> {
  const colunas = await con.runAndReadAll(
    "SELECT table_name, column_name FROM information_schema.columns " +
      "WHERE data_type = 'VARCHAR' ORDER BY ALL",
  );
  let achados = 0;
  for (const { table_name, column_name } of colunas.getRowObjects()) {
    const valores = await con.runAndReadAll(
      `SELECT DISTINCT "${column_name}" AS v FROM "${table_name}"`,
    );
    achados += valores.getRowObjects().filter((r) => pareceDadoPessoal(r.v)).length;
  }
  const nome = "nenhum CPF ou placa em claro no banco analítico";
  return achados === 0 ? `ok      ${nome}` : `FALHOU  ${nome}: ${achados} valores`;
}
