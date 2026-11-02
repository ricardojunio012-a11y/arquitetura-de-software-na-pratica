// O banco do Financeiro: os pagamentos e, na versão com outbox, a tabela de eventos
// a publicar, gravada na mesma transação do pagamento.
import pg from "pg";
import type { Pagamento, PagamentoConfirmado } from "../eventos.ts";

export async function conectarBanco() {
  const banco = new pg.Client({ connectionString: process.env.BANCO_URL });
  await banco.connect();
  await banco.query(`
    DROP TABLE IF EXISTS outbox, pagamentos;
    CREATE TABLE pagamentos (
      id text PRIMARY KEY, unidade text, reserva text, valor_centavos integer);
    CREATE TABLE outbox (
      id serial PRIMARY KEY, evento text UNIQUE, conteudo text,
      publicado boolean NOT NULL DEFAULT false)`);
  return banco;
}

export async function gravarPagamento(banco: pg.Client, p: Pagamento) {
  await banco.query("INSERT INTO pagamentos VALUES ($1, $2, $3, $4)", [
    p.pagamento,
    p.unidade,
    p.reserva,
    p.valorCentavos,
  ]);
}

// Pagamento e evento na mesma transação: ou os dois ficam gravados, ou nenhum
export async function gravarComOutbox(
  banco: pg.Client,
  p: Pagamento,
  e: PagamentoConfirmado,
) {
  await banco.query("BEGIN");
  try {
    await gravarPagamento(banco, p);
    await banco.query("INSERT INTO outbox (evento, conteudo) VALUES ($1, $2)", [
      e.evento,
      JSON.stringify(e),
    ]);
    await banco.query("COMMIT");
  } catch (erro) {
    // Sem o ROLLBACK, a conexão ficaria presa numa transação abortada
    await banco.query("ROLLBACK");
    throw erro;
  }
}
