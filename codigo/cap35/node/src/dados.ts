// Os dados do Morada usados nos cenários: cobranças do mês e avisos.
// Tudo é gerado por SQL determinístico, para a saída ser sempre a mesma.
import type pg from "pg";

export async function preparar(db: pg.Client): Promise<void> {
  await db.query(`
    DROP SCHEMA IF EXISTS financeiro CASCADE;
    DROP SCHEMA IF EXISTS comunicacao CASCADE;
    CREATE SCHEMA financeiro;
    CREATE SCHEMA comunicacao;
    CREATE TABLE financeiro.cobrancas (
      id integer PRIMARY KEY,
      condominio integer NOT NULL,
      unidade integer NOT NULL,
      vencimento date NOT NULL,
      valor_centavos integer NOT NULL,
      pago_em date
    );
    INSERT INTO financeiro.cobrancas
      SELECT i, (i - 1) / 100 + 1, (i - 1) % 100 + 1, date '2026-11-05',
             45000 + (i * 37) % 30000, NULL
      FROM generate_series(1, 3000) AS i;
    CREATE TABLE comunicacao.avisos (
      id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      condominio integer NOT NULL,
      texto text NOT NULL
    );`);
  await publicarAvisos(db, 100);
}

// Cada pagamento é uma transação própria, como no aplicativo
export async function pagar(db: pg.Client, quantos: number): Promise<void> {
  for (let i = 0; i < quantos; i++) {
    await db.query(`
      UPDATE financeiro.cobrancas SET pago_em = date '2026-11-05'
      WHERE id = (SELECT min(id) FROM financeiro.cobrancas WHERE pago_em IS NULL)`);
  }
}

export async function publicarAvisos(db: pg.Client, quantos: number): Promise<void> {
  for (let i = 0; i < quantos; i++) {
    await db.query(
      "INSERT INTO comunicacao.avisos (condominio, texto) VALUES ($1, $2)",
      [(i % 30) + 1, `Aviso ${i + 1}: manutenção da bomba d'água`],
    );
  }
}

// Um resumo que muda se qualquer cobrança mudar: quantas, quantas pagas, a soma
// dos valores e um hash de todas as linhas em ordem
export async function assinatura(db: pg.Client): Promise<string> {
  const { rows } = await db.query(`
    SELECT count(*)::int AS total, count(pago_em)::int AS pagas,
           md5(string_agg(id || ':' || valor_centavos || ':' ||
                          coalesce(pago_em::text, '-'), ',' ORDER BY id)) AS hash
    FROM financeiro.cobrancas`);
  const r = rows[0];
  return `${r.total} cobranças, ${r.pagas} pagas, hash ${r.hash.slice(0, 12)}`;
}

export async function contarAvisos(db: pg.Client): Promise<number> {
  const { rows } = await db.query("SELECT count(*)::int AS n FROM comunicacao.avisos");
  return rows[0].n;
}

export async function contarPagas(db: pg.Client): Promise<number> {
  const { rows } = await db.query(
    "SELECT count(pago_em)::int AS n FROM financeiro.cobrancas",
  );
  return rows[0].n;
}
