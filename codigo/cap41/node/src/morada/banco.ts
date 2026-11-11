// O banco do Morada: um PostgreSQL embutido (PGlite), em memória. O esquema é o do
// Morada, que não sabe nada da Beta. A única exceção é o esquema "acl", que pertence
// à camada anticorrupção e guarda a correspondência entre as chaves dos dois mundos.
import { PGlite } from "@electric-sql/pglite";

export const ESQUEMA = `
  CREATE TABLE condominios (id text PRIMARY KEY, nome text, cnpj text UNIQUE);
  CREATE TABLE unidades (id text PRIMARY KEY, condominio_id text, bloco text,
                         numero text, fracao numeric(9,6), isento boolean);
  CREATE TABLE vagas (id text PRIMARY KEY, unidade_id text, fracao numeric(9,6));
  CREATE TABLE orcamentos (condominio_id text, competencia text,
                           valor_centavos int,
                           PRIMARY KEY (condominio_id, competencia));
  CREATE TABLE cobrancas (id text PRIMARY KEY, unidade_id text, item text,
                          competencia text, vencimento date, valor_centavos int,
                          pago_em date);
  CREATE TABLE avisos (id serial PRIMARY KEY, condominio_id text, titulo text);
  CREATE SCHEMA acl;
  CREATE TABLE acl.correspondencia (chave_legado text PRIMARY KEY,
                                    unidade_id text, item text);
  CREATE TABLE acl.quarentena (chave_legado text PRIMARY KEY, motivo text);
`;

export async function criarMorada(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(ESQUEMA);
  return db;
}

// O cálculo do Morada: reparte o orçamento pelas frações, em centavos, e distribui
// os centavos que sobram pelos maiores restos, para que a soma arredondada não
// perca centavos. O legado trunca cada parte e perde até um centavo por apto.
export async function calcularCobrancas(
  db: PGlite,
  condominio: string,
  competencia: string,
): Promise<void> {
  const orc = await db.query<{ valor_centavos: number }>(
    "SELECT valor_centavos FROM orcamentos " +
      "WHERE condominio_id = $1 AND competencia = $2",
    [condominio, competencia],
  );
  const { rows: partes } = await db.query<{
    unidade_id: string;
    item: string;
    fracao: string;
    isento: boolean;
  }>(
    `SELECT u.id unidade_id, 'taxa' item, u.fracao, u.isento FROM unidades u
       WHERE u.condominio_id = $1
     UNION ALL
     SELECT u.id, v.id, v.fracao, false FROM vagas v
       JOIN unidades u ON u.id = v.unidade_id WHERE u.condominio_id = $1
     ORDER BY 1, 2`,
    [condominio],
  );
  const total = orc.rows[0].valor_centavos;
  const exatos = partes.map((p) => (p.isento ? 0 : total * Number(p.fracao)));
  const valores = exatos.map(Math.floor);
  let sobra = Math.round(exatos.reduce((s, v) => s + v, 0)) - sum(valores);
  const porResto = exatos
    .map((v, i) => ({ i, resto: v - Math.floor(v) }))
    .sort((a, b) => b.resto - a.resto || a.i - b.i);
  for (const { i } of porResto) if (sobra-- > 0) valores[i] += 1;

  const [ano, mes] = competencia.split("-");
  for (const [i, p] of partes.entries())
    await db.query(
      `INSERT INTO cobrancas VALUES ($1, $2, $3, $4, $5, $6, NULL)
       ON CONFLICT (id) DO UPDATE SET valor_centavos = EXCLUDED.valor_centavos`,
      [
        `${p.item === "taxa" ? p.unidade_id : p.item}.${competencia}`,
        p.unidade_id,
        p.item,
        competencia,
        `${ano}-${mes}-10`,
        valores[i],
      ],
    );
}

const sum = (v: number[]) => v.reduce((s, x) => s + x, 0);
