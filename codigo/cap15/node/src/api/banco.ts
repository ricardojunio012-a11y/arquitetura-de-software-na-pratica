// O banco da API: condomínios, cobranças, pagamentos e chaves de idempotência. A
// chave primária da tabela de chaves, (administradora, chave), garante um único
// processamento por chave de cada cliente, mesmo com pedidos simultâneos.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const lerJson = (arquivo: string) => JSON.parse(fs.readFileSync(arquivo, "utf8"));

export async function prepararBanco(url: string, arquivoCobrancas: string) {
  const banco = new pg.Pool({ connectionString: url });
  await banco.query(`
    DROP TABLE IF EXISTS chaves_idempotencia, pagamentos, cobrancas, condominios;
    DROP SEQUENCE IF EXISTS pagamentos_seq;
    CREATE TABLE condominios (id text PRIMARY KEY, administradora text NOT NULL);
    CREATE TABLE cobrancas (
      id text PRIMARY KEY,
      condominio text NOT NULL REFERENCES condominios,
      unidade text NOT NULL,
      vencimento date NOT NULL,
      valor_centavos integer NOT NULL,
      situacao text NOT NULL
    );
    CREATE TABLE pagamentos (
      id text PRIMARY KEY,
      cobranca text NOT NULL UNIQUE REFERENCES cobrancas,
      valor_centavos integer NOT NULL
    );
    CREATE SEQUENCE pagamentos_seq;
    CREATE TABLE chaves_idempotencia (
      administradora text,
      chave text,
      pedido text NOT NULL,
      status integer,
      resposta text,
      PRIMARY KEY (administradora, chave)
    )`);
  // Quem administra cada condomínio fica em condominios.json, ao lado das cobranças
  const pasta = path.dirname(arquivoCobrancas);
  for (const c of lerJson(path.join(pasta, "condominios.json"))) {
    await banco.query("INSERT INTO condominios VALUES ($1, $2)", [
      c.id,
      c.administradora,
    ]);
  }
  for (const c of lerJson(arquivoCobrancas)) {
    await banco.query("INSERT INTO cobrancas VALUES ($1, $2, $3, $4, $5, $6)", [
      c.id,
      c.condominio,
      c.unidade,
      c.vencimento,
      c.valorCentavos,
      c.situacao,
    ]);
  }
  return banco;
}
